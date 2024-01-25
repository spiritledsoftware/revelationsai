import type { BaseCache } from '@langchain/core/caches';
import envConfig from '@revelationsai/core/configs/env';
import {
  RAIBedrockEmbeddings,
  type RAIBedrockEmbeddingsParams
} from '@revelationsai/core/langchain/embeddings/bedrock';
import { RAIBedrock } from '@revelationsai/core/langchain/llms/bedrock';
import type {
  AnthropicModelId,
  CohereModelId
} from '@revelationsai/core/langchain/types/bedrock-types';

export type StandardModelInput = {
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  promptPrefix?: string;
  promptSuffix?: string;
  cache?: BaseCache;
};

export const getEmbeddingsModel = (options?: RAIBedrockEmbeddingsParams) => {
  return new RAIBedrockEmbeddings(options);
};

export const getSmallContextModel = ({
  modelId = 'cohere.command-text-v14',
  temperature = 0.5,
  maxTokens = 2048,
  stopSequences = [],
  stream = false,
  topK = 20,
  topP = 0.5,
  promptPrefix,
  promptSuffix,
  cache
}: StandardModelInput & { modelId?: CohereModelId } = {}) =>
  new RAIBedrock({
    modelId: modelId,
    stream: stream,
    body: {
      max_tokens: maxTokens,
      temperature: temperature,
      p: topP,
      k: topK,
      stop_sequences: stopSequences,
      return_likelihoods: 'NONE'
    },
    promptPrefix,
    promptSuffix,
    cache,
    verbose: envConfig.isLocal
  });

export const getLargeContextModel = ({
  modelId = 'anthropic.claude-instant-v1',
  temperature = 0.5,
  maxTokens = 2048,
  stopSequences = [],
  stream = false,
  topK = 20,
  topP = 0.5,
  promptPrefix,
  promptSuffix,
  cache
}: StandardModelInput & { modelId?: AnthropicModelId } = {}) =>
  new RAIBedrock({
    modelId: modelId,
    stream: stream,
    body: {
      max_tokens_to_sample: maxTokens,
      temperature: temperature,
      top_p: topP,
      top_k: topK,
      stop_sequences: stopSequences
    },
    promptPrefix,
    promptSuffix,
    cache,
    verbose: envConfig.isLocal
  });
