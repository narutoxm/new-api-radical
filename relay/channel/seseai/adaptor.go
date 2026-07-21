package seseai

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/relay/channel"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/types"

	"github.com/gin-gonic/gin"
)

type Adaptor struct{}

type generateRequest struct {
	Model  string   `json:"model"`
	Prompt string   `json:"prompt,omitempty"`
	Items  []string `json:"items,omitempty"`
}

type generateResponse struct {
	Count  int           `json:"count"`
	OK     int           `json:"ok"`
	Failed int           `json:"failed"`
	Images []imageResult `json:"images"`
	Error  string        `json:"error,omitempty"`
}

type imageResult struct {
	OK    bool   `json:"ok"`
	B64   string `json:"b64"`
	Error string `json:"error,omitempty"`
}

func (a *Adaptor) Init(info *relaycommon.RelayInfo) {}

func (a *Adaptor) GetRequestURL(info *relaycommon.RelayInfo) (string, error) {
	if info == nil {
		return "", errors.New("seseai channel: relay info is nil")
	}
	baseURL := strings.TrimRight(info.ChannelBaseUrl, "/")
	if baseURL == "" {
		baseURL = constant.ChannelBaseURLs[constant.ChannelTypeSeseAI]
	}
	return baseURL + "/api/generate", nil
}

func (a *Adaptor) SetupRequestHeader(c *gin.Context, req *http.Header, info *relaycommon.RelayInfo) error {
	channel.SetupApiRequestHeader(info, c, req)
	req.Set("Authorization", "Bearer "+info.ApiKey)
	req.Set("Content-Type", "application/json")
	req.Set("Accept", "application/json")
	return nil
}

func (a *Adaptor) ConvertImageRequest(c *gin.Context, info *relaycommon.RelayInfo, request dto.ImageRequest) (any, error) {
	if info.RelayMode != relayconstant.RelayModeImagesGenerations {
		return nil, fmt.Errorf("seseai channel: unsupported image relay mode %d", info.RelayMode)
	}
	prompt := strings.TrimSpace(request.Prompt)
	if prompt == "" {
		return nil, errors.New("seseai channel: prompt is required")
	}

	modelName, err := resolveSeseAIModel(request)
	if err != nil {
		return nil, err
	}
	n := 1
	if request.N != nil && *request.N > 0 {
		n = int(*request.N)
	}
	info.PriceData.AddOtherRatio("n", float64(n))

	if n <= 1 {
		return generateRequest{
			Model:  modelName,
			Prompt: prompt,
		}, nil
	}

	items := make([]string, 0, n)
	for i := 0; i < n; i++ {
		items = append(items, prompt)
	}
	return generateRequest{Model: modelName, Items: items}, nil
}

func resolveSeseAIModel(request dto.ImageRequest) (string, error) {
	modelName := strings.TrimSpace(stringFromExtra(request.Extra, "sese_model"))
	if modelName == "" {
		modelName = strings.TrimSpace(stringFromExtra(request.Extra, "seseai_model"))
	}
	if modelName == "" {
		modelName = "z-image"
	}
	switch modelName {
	case "z-image", "wai", "Pony-3", "R-1.5", "Turbo-3.5":
		return modelName, nil
	default:
		return "", fmt.Errorf("seseai channel: unsupported model %q", modelName)
	}
}

func stringFromExtra(extra map[string]json.RawMessage, key string) string {
	raw, ok := extra[key]
	if !ok || raw == nil {
		return ""
	}
	var val string
	if err := common.Unmarshal(raw, &val); err != nil {
		return ""
	}
	return val
}

func (a *Adaptor) DoRequest(c *gin.Context, info *relaycommon.RelayInfo, requestBody io.Reader) (any, error) {
	return channel.DoApiRequest(a, c, info, requestBody)
}

func (a *Adaptor) DoResponse(c *gin.Context, resp *http.Response, info *relaycommon.RelayInfo) (any, *types.NewAPIError) {
	if resp == nil {
		return nil, types.NewError(errors.New("seseai channel: empty response"), types.ErrorCodeBadResponse)
	}
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, types.NewError(err, types.ErrorCodeReadResponseBodyFailed)
	}
	_ = resp.Body.Close()

	imageResponse := dto.ImageResponse{
		Created: common.GetTimestamp(),
		Data:    make([]dto.ImageData, 0),
	}

	contentType := strings.ToLower(resp.Header.Get("Content-Type"))
	if strings.HasPrefix(contentType, "image/") {
		imageResponse.Data = append(imageResponse.Data, dto.ImageData{
			B64Json: base64.StdEncoding.EncodeToString(responseBody),
		})
	} else {
		var upstream generateResponse
		if err := common.Unmarshal(responseBody, &upstream); err != nil {
			return nil, types.NewError(fmt.Errorf("seseai channel: failed to decode response: %w", err), types.ErrorCodeBadResponseBody)
		}
		if upstream.Error != "" {
			return nil, types.NewError(errors.New(upstream.Error), types.ErrorCodeBadResponse)
		}
		for _, image := range upstream.Images {
			if !image.OK {
				if image.Error != "" {
					return nil, types.NewError(errors.New(image.Error), types.ErrorCodeBadResponse)
				}
				continue
			}
			if strings.TrimSpace(image.B64) != "" {
				imageResponse.Data = append(imageResponse.Data, dto.ImageData{B64Json: image.B64})
			}
		}
	}
	if len(imageResponse.Data) == 0 {
		return nil, types.NewError(errors.New("seseai channel: no usable image data"), types.ErrorCodeBadResponse)
	}

	responseBytes, err := common.Marshal(imageResponse)
	if err != nil {
		return nil, types.NewError(err, types.ErrorCodeBadResponseBody)
	}
	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(http.StatusOK)
	_, _ = c.Writer.Write(responseBytes)
	return &dto.Usage{}, nil
}

func (a *Adaptor) ConvertOpenAIRequest(c *gin.Context, info *relaycommon.RelayInfo, request *dto.GeneralOpenAIRequest) (any, error) {
	return nil, errors.New("seseai channel: endpoint not supported")
}

func (a *Adaptor) ConvertRerankRequest(c *gin.Context, relayMode int, request dto.RerankRequest) (any, error) {
	return nil, errors.New("seseai channel: endpoint not supported")
}

func (a *Adaptor) ConvertEmbeddingRequest(c *gin.Context, info *relaycommon.RelayInfo, request dto.EmbeddingRequest) (any, error) {
	return nil, errors.New("seseai channel: endpoint not supported")
}

func (a *Adaptor) ConvertAudioRequest(c *gin.Context, info *relaycommon.RelayInfo, request dto.AudioRequest) (io.Reader, error) {
	return nil, errors.New("seseai channel: endpoint not supported")
}

func (a *Adaptor) ConvertOpenAIResponsesRequest(c *gin.Context, info *relaycommon.RelayInfo, request dto.OpenAIResponsesRequest) (any, error) {
	return nil, errors.New("seseai channel: endpoint not supported")
}

func (a *Adaptor) ConvertClaudeRequest(c *gin.Context, info *relaycommon.RelayInfo, request *dto.ClaudeRequest) (any, error) {
	return nil, errors.New("seseai channel: endpoint not supported")
}

func (a *Adaptor) ConvertGeminiRequest(c *gin.Context, info *relaycommon.RelayInfo, request *dto.GeminiChatRequest) (any, error) {
	return nil, errors.New("seseai channel: endpoint not supported")
}

func (a *Adaptor) GetModelList() []string {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return ChannelName
}
