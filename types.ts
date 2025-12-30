
export enum CalculatorTab {
  HOME = 'HOME',
  TRANSLATION = 'TRANSLATION',
  RAG = 'RAG',
  ROI = 'ROI'
}

export type TranslationQualityTier = 'none' | 'basic' | 'full';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  costPerMillionTokens?: number; // General text models
  costPerMillionChars?: number;  // Specifically for translation APIs
  costPerMillionInputTokens?: number;
  costPerMillionOutputTokens?: number;
}

export interface EmbeddingModel {
  id: string;
  name: string;
  costPerMillionTokens: number;
  dimension: number;
}

export interface TranslationInputs {
  modelId: string;
  charsPerDoc: number;
  numDocs: number;
  monthlyGrowth: number;
  numLanguages: number;
  qualityTier: TranslationQualityTier;
  baseCostPer1kChars: number;
  humanReviewCostPer1kChars: number;
}

export interface RagInputs {
  // Step 1: Build & Ingest
  ingestionModelId: string;
  numDocs: number;
  tokensPerDoc: number;
  parsingCostPerDoc: number;
  chunkSize: number;
  overlapPct: number;
  metadataOverheadPct: number;

  // Step 2: Run
  inferenceModelId: string;
  queriesPerMonth: number;
  avgQueryTokens: number;
  retrievedChunks: number;
  rerankerEnabled: boolean;
  rerankerCostPer1k: number;
  avgAnswerTokens: number;
  cacheHitRatePct: number;
  managedDbCostPer1kVectors: number;

  // Step 3: Govern
  monitoringCostPer1k: number;
  evalRunsPerMonth: number;
  evalTokensPerRun: number;
  humanReviewHours: number;
  humanHourlyRate: number;
  reindexFrequencyPerYear: number;
}

export interface RoiInputs {
  // Productivity Value Drivers
  timeSavedPerQuery: number; 
  requestsPerUser: number;   
  employeeHourlyRate: number;
  numUsers: number;

  // 1. Inference Drivers
  avgTokensPerRequest: number;
  costPerMillionTokens: number;

  // 2. Orchestration & Data Drivers
  numIndexedDocs: number;
  reindexingFrequency: number; // per year
  embeddingCostPerMillion: number;
  vectorDbBaseMonthly: number;

  // 3. Governance Drivers
  percentOutputsReviewed: number;
  reviewTimePerOutput: number; // minutes
  reviewerHourlyRate: number;
}
