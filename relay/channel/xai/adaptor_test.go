package xai

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
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

func TestConvertOpenAIRequestPreservesOtherGrokFields(t *testing.T) {
	frequencyPenalty := 0.0
	presencePenalty := 0.0

	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			UpstreamModelName: "grok-3",
		},
	}
	request := &dto.GeneralOpenAIRequest{
		Model:            "grok-3",
		FrequencyPenalty: &frequencyPenalty,
		PresencePenalty:  &presencePenalty,
		Stop:             []string{"stop"},
	}

	converted, err := (&Adaptor{}).ConvertOpenAIRequest(nil, info, request)
	if err != nil {
		t.Fatalf("ConvertOpenAIRequest returned error: %v", err)
	}

	convertedRequest, ok := converted.(*dto.GeneralOpenAIRequest)
	if !ok {
		t.Fatalf("converted request type = %T, want *dto.GeneralOpenAIRequest", converted)
	}
	if convertedRequest.FrequencyPenalty == nil {
		t.Fatal("FrequencyPenalty should be preserved for non grok-4.5 models")
	}
	if convertedRequest.PresencePenalty == nil {
		t.Fatal("PresencePenalty should be preserved for non grok-4.5 models")
	}
	if convertedRequest.Stop == nil {
		t.Fatal("Stop should be preserved for non grok-4.5 models")
	}
}

func TestConvertOpenAIRequestStripsUnsupportedGrok45SearchFields(t *testing.T) {
	frequencyPenalty := 0.0
	presencePenalty := 0.0

	info := &relaycommon.RelayInfo{
		ChannelMeta: &relaycommon.ChannelMeta{
			UpstreamModelName: "grok-4.5-search",
		},
	}
	request := &dto.GeneralOpenAIRequest{
		Model:            "grok-4.5-search",
		FrequencyPenalty: &frequencyPenalty,
		PresencePenalty:  &presencePenalty,
		Stop:             []string{"stop"},
	}

	converted, err := (&Adaptor{}).ConvertOpenAIRequest(nil, info, request)
	if err != nil {
		t.Fatalf("ConvertOpenAIRequest returned error: %v", err)
	}

	convertedMap, ok := converted.(map[string]any)
	if !ok {
		t.Fatalf("converted request type = %T, want map[string]any", converted)
	}
	if _, ok := convertedMap["frequency_penalty"]; ok {
		t.Fatal("frequency_penalty should be stripped for grok-4.5-search")
	}
	if _, ok := convertedMap["presence_penalty"]; ok {
		t.Fatal("presence_penalty should be stripped for grok-4.5-search")
	}
	if _, ok := convertedMap["stop"]; ok {
		t.Fatal("stop should be stripped for grok-4.5-search")
	}
	if convertedMap["model"] != "grok-4.5" {
		t.Fatalf("model = %v, want grok-4.5", convertedMap["model"])
	}
	searchParameters, ok := convertedMap["search_parameters"].(map[string]any)
	if !ok {
		t.Fatalf("search_parameters type = %T, want map[string]any", convertedMap["search_parameters"])
	}
	if searchParameters["mode"] != "on" {
		t.Fatalf("search_parameters.mode = %v, want on", searchParameters["mode"])
	}
}

func TestGrok45ModelListIncludesCurrentModel(t *testing.T) {
	if !common.StringsContains(ModelList, "grok-4.5") {
		t.Fatal("ModelList should include grok-4.5")
	}
}
