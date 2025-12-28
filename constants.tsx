
import { AIModel, EmbeddingModel, RagInputs } from './types';

export const TRANSLATION_MODELS: AIModel[] = [
  { id: 'gemini-3-pro', name: 'Gemini 3 Pro', provider: 'Google', costPerMillionChars: 15 },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', costPerMillionChars: 12 },
  { id: 'claude-3-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', costPerMillionChars: 10 },
  { id: 'google-translate', name: 'Google Translation API', provider: 'Google Cloud', costPerMillionChars: 20 },
  { id: 'deepl', name: 'DeepL Pro', provider: 'DeepL', costPerMillionChars: 25 },
];

export const INFERENCE_MODELS: AIModel[] = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'Google', costPerMillionInputTokens: 0.10, costPerMillionOutputTokens: 0.40 },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', provider: 'Google', costPerMillionInputTokens: 1.25, costPerMillionOutputTokens: 3.75 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', costPerMillionInputTokens: 0.15, costPerMillionOutputTokens: 0.60 },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', costPerMillionInputTokens: 0.25, costPerMillionOutputTokens: 1.25 },
];

export const EMBEDDING_MODELS: EmbeddingModel[] = [
  { id: 'text-embedding-004', name: 'text-embedding-004', costPerMillionTokens: 0.10, dimension: 768 },
  { id: 'text-embedding-3-small', name: 'text-embedding-3-small', costPerMillionTokens: 0.02, dimension: 1536 },
  { id: 'text-embedding-3-large', name: 'text-embedding-3-large', costPerMillionTokens: 0.13, dimension: 3072 },
];

export const DEFAULT_TRANSLATION_INPUTS = {
  modelId: 'gemini-3-pro',
  charsPerDoc: 2000,
  numDocs: 500,
  monthlyGrowth: 5,
};

export const DEFAULT_RAG_INPUTS: RagInputs = {
  ingestionModelId: 'text-embedding-004',
  numDocs: 1000,
  tokensPerDoc: 800,
  parsingCostPerDoc: 0.05,
  chunkSize: 400,
  overlapPct: 15,
  metadataOverheadPct: 10,
  inferenceModelId: 'gemini-3-flash-preview',
  queriesPerMonth: 5000,
  avgQueryTokens: 150,
  retrievedChunks: 3,
  rerankerEnabled: false,
  rerankerCostPer1k: 1.0,
  avgAnswerTokens: 250,
  cacheHitRatePct: 20,
  managedDbCostPer1kVectors: 0.10,
  monitoringCostPer1k: 0.50,
  evalRunsPerMonth: 2,
  evalTokensPerRun: 50000,
  humanReviewHours: 5,
  humanHourlyRate: 80,
  reindexFrequencyPerYear: 4,
};

export const DEFAULT_ROI_INPUTS = {
  timeSavedPerQuery: 5,
  employeeHourlyRate: 45,
  numUsers: 50,
};
