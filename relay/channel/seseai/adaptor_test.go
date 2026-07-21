package seseai

import (
	"encoding/json"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	relayconstant "github.com/QuantumNous/new-api/relay/constant"
)

func TestConvertImageRequestUsesSeseAIModel(t *testing.T) {
	n := uint(2)
	request := dto.ImageRequest{
		Model:  "sese-image",
		Prompt: "test image",
		N:      &n,
		Extra: map[string]json.RawMessage{
			"sese_model": json.RawMessage(`"wai"`),
		},
	}
	info := &relaycommon.RelayInfo{RelayMode: relayconstant.RelayModeImagesGenerations}

	converted, err := (&Adaptor{}).ConvertImageRequest(nil, info, request)
	if err != nil {
		t.Fatalf("ConvertImageRequest returned error: %v", err)
	}

	data, err := common.Marshal(converted)
	if err != nil {
		t.Fatalf("Marshal returned error: %v", err)
	}

	got := string(data)
	want := `{"model":"wai","items":["test image","test image"]}`
	if got != want {
		t.Fatalf("converted request = %s, want %s", got, want)
	}
}
