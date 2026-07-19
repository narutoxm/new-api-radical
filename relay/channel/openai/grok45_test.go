package openai

import (
	"testing"

	"github.com/QuantumNous/new-api/dto"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
)

func TestConvertOpenAIRequestStripsUnsupportedGrok45Fields(t *testing.T) {
	frequencyPenalty := 0.0
	presencePenalty := 0.0
	logprobs := false
	topLogprobs := 1

	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			UpstreamModelName: "grok-4.5",
		},
	}
	request := &dto.GeneralOpenAIRequest{
		Model:            "grok-4.5",
		FrequencyPenalty: &frequencyPenalty,
		PresencePenalty:  &presencePenalty,
		Stop:             []string{"stop"},
		LogProbs:         &logprobs,
		TopLogProbs:      &topLogprobs,
	}

	converted, err := (&Adaptor{}).ConvertOpenAIRequest(nil, info, request)
	if err != nil {
		t.Fatalf("ConvertOpenAIRequest returned error: %v", err)
	}

	convertedRequest, ok := converted.(*dto.GeneralOpenAIRequest)
	if !ok {
		t.Fatalf("converted request type = %T, want *dto.GeneralOpenAIRequest", converted)
	}
	if convertedRequest.FrequencyPenalty != nil {
		t.Fatal("FrequencyPenalty should be stripped for grok-4.5")
	}
	if convertedRequest.PresencePenalty != nil {
		t.Fatal("PresencePenalty should be stripped for grok-4.5")
	}
	if convertedRequest.Stop != nil {
		t.Fatal("Stop should be stripped for grok-4.5")
	}
	if convertedRequest.LogProbs != nil {
		t.Fatal("LogProbs should be stripped for grok-4.5")
	}
	if convertedRequest.TopLogProbs != nil {
		t.Fatal("TopLogProbs should be stripped for grok-4.5")
	}
}
