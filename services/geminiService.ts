import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Utility to perform an async operation with exponential backoff.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 2,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = String(error?.message || error);
    const isRateLimit = errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED") || error?.status === 429;
    
    if (retries > 0 && isRateLimit) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Normalizes any error into a safe, non-technical UI string.
 */
const formatError = (error: any): string => {
  const errorStr = String(error?.message || error);
  const isRateLimit = errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED") || error?.status === 429;
  
  if (isRateLimit) {
    return "Insight temporarily unavailable due to API limits. Please try again shortly.";
  }
  return "Analysis could not be generated right now. Please retry.";
};

export const getAiAnalysis = async (scenario: string, data: any): Promise<string> => {
  try {
    const isTranslation = scenario.includes("Translation");
    const isRag = scenario.includes("RAG");
    
    let prompt = "";
    if (isTranslation) {
      prompt = `You are a strategic business advisor. Interpret these AI translation economics: ${JSON.stringify(data)}.
      Write exactly ONE short paragraph (4-5 lines max).
      Tone: calm, neutral, and trust-worthy.
      Constraint: Use plain, simple business language. 
      Constraint: Do NOT use jargon (avoid: scalable utility, decoupling, infrastructure asset, proportional, leverage).
      Constraint: Do NOT include any numbers or prices.
      Message: Explain that AI translation base costs are low and grow efficiently as volume increases. 
      Message: Note that human review is an optional extra layer for accuracy that can be used where needed.
      Message: Emphasize that this setup allows teams to choose their own balance of speed and quality.`;
    } else if (isRag) {
      prompt = `You are an AI Product Leader. Generate a "Simple Decision Brief" for this RAG scenario: ${JSON.stringify(data)}.
      Write exactly THREE short paragraphs.
      Tone: executive, direct, neutral. Use plain business language.
      Constraint: Do NOT use strategy jargon or academic phrasing.
      Constraint: Do NOT use long sentences.
      
      Paragraph 1: Explain what the model is showing in simple terms (setup vs ongoing).
      Paragraph 2: Explain why governance (review, tuning, monitoring) dominates cost over time instead of model tokens.
      Paragraph 3: Explain when a RAG system makes sense (large doc base, frequent questions, accuracy needs).`;
    } else {
      prompt = `Provide a quick decision summary for: ${scenario}. Data: ${JSON.stringify(data)}. Format as: **ROI Signal**: ... **Optimization**: ... **Scaling Risk**: ...`;
    }

    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    }));
    return response.text || "Analysis complete but no text returned.";
  } catch (error) {
    console.warn("Gemini Analysis handled error");
    return formatError(error);
  }
};

export const getRoiExecutiveInsight = async (projectionData: any[]): Promise<string> => {
  try {
    const prompt = `You are an AI Economics Advisor. Interpret the strategic business value of this 12-month ROI data: ${JSON.stringify(projectionData)}. Write one concise paragraph. Emphasize productivity gains over revenue hype. Tone: executive.`;
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    }));
    return response.text || "Insight generated.";
  } catch (error) {
    console.warn("Gemini ROI insight handled error");
    return formatError(error);
  }
};

export const getRoiGraphInsight = async (projectionData: any[]): Promise<string> => {
  try {
    const prompt = `Describe visual trends in this ROI data for a line chart: ${JSON.stringify(projectionData)}. One short paragraph focusing on slopes and the break-even gap. Neutral tone.`;
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    }));
    return response.text || "";
  } catch (error) {
    return ""; // Silent fail for secondary graph insights
  }
};

export const getRoiNarrative = async (projectionData: any[]): Promise<string> => {
  try {
    const prompt = `Generate month-by-month ROI insights for: ${JSON.stringify(projectionData)}. Format: Month X: <insight>.`;
    const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    }));
    return response.text || "";
  } catch (error) {
    return "";
  }
};