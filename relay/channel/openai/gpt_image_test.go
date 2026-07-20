package openai

import (
	"testing"

	"github.com/QuantumNous/new-api/dto"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
)

func TestConvertImageRequestStripsNForGPTImage2(t *testing.T) {
	n := uint(2)
	info := &relaycommon.RelayInfo{}
	request := dto.ImageRequest{
		Model:  "gpt-image-2",
		Prompt: "test image",
		N:      &n,
		Size:   "2048x2048",
	}

	converted, err := (&Adaptor{}).ConvertImageRequest(nil, info, request)
	if err != nil {
		t.Fatalf("ConvertImageRequest returned error: %v", err)
	}

	convertedRequest, ok := converted.(dto.ImageRequest)
	if !ok {
		t.Fatalf("converted request type = %T, want dto.ImageRequest", converted)
	}
	if convertedRequest.N != nil {
		t.Fatal("N should be stripped for gpt-image-2")
	}
}

