import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getAiAnalysis = async (scenario: string, data: any) => {
  try {
    const isRag = scenario.includes("RAG");
    
    const prompt = isRag 
      ? `You are a Senior AI Product Leader and AI Economics Advisor. Using only the following RAG System Cost Builder data, generate a single concise paragraph titled "AI Strategic Brief" for business and product leaders.
      Data: ${JSON.stringify(data)}
      
      Requirements for the paragraph:
      - Write exactly one paragraph (5–6 sentences max).
      - Do not use headings, bullet points, or lists.
      - Interpret where most of the cost is coming from (technical vs governance/labor).
      - Explain viability at current scale and ROI conditions.
      - Identify one major scaling risk (e.g., human bottlenecks or retrieval drift).
      - Mention 2–3 key high-level optimization levers.
      - End with an insight on what determines long-term scalability.
      - Tone: executive, neutral, non-technical.
      - Do not repeat raw numbers; interpret the economics instead.`
      : `You are a Senior AI Product Advisor. Provide a 15-second decision summary for this AI scenario:
      Scenario: ${scenario}
      Data: ${JSON.stringify(data)}
      
      Format strictly as:
      **ROI Signal**: [One simple sentence on if this makes financial sense]
      **Optimization**: [One clear, plain-English tip to save money]
      **Scaling Risk**: [One common-sense warning for when things get big]
      
      Example tone: "Costs are low compared to value, making this safe to scale."`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Analysis currently unavailable. Please check your inputs.";
  }
};

export const getRoiExecutiveInsight = async (projectionData: any[]) => {
  try {
    const prompt = `You are an AI Economics Advisor for a C-suite audience.

Based on the 12-month projected ROI data provided below, generate ONE concise executive paragraph (4–5 lines) that interprets the strategic business value.

Strategic Guidelines:
- Focus on decision relevance: what does this data mean for the business strategy?
- Emphasize that this value represents realized productivity and operational efficiency gains, NOT direct cash revenue.
- Frame the interpretation in terms of risk profile, capital efficiency, and long-term scalability.
- AVOID chart mechanics: do not mention "lines," "slopes," "gaps," "X-axis," or "plots."
- AVOID month-by-month narration or repeating raw table data.
- Use professional, high-level executive language suitable for board-level decision-making.

Purpose: Explain "what this means for the organization" rather than "what the chart shows."

Data: ${JSON.stringify(projectionData)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Executive Insight Error:", error);
    return "";
  }
};

export const getRoiGraphInsight = async (projectionData: any[]) => {
  try {
    const prompt = `You are an AI Business Analyst focused on purely observational data interpretation.
    
    Task: Write one short paragraph (3–4 lines max) explaining what the ROI chart visually shows.
    
    Instructions:
    - Describe the relationship and visual behavior of the three plotted lines: Accumulated AI Cost, Business Value (Productivity), and Net Economic Gain.
    - Focus on visual trends: the steepness of the slopes, the intersection point (break-even), and the widening gap between value and cost over the 12-month period.
    - Keep the tone neutral, analytical, and strictly observational.
    - DO NOT include business strategy, executive conclusions, or words like "high-leverage", "low-risk", "strategic", "sustainability", or "investment profile".
    - DO NOT repeat content from an executive summary; only explain the visual story of the graph lines.
    
    Data: ${JSON.stringify(projectionData)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Graph Insight Error:", error);
    return "";
  }
};

export const getRoiNarrative = async (projectionData: any[]) => {
  try {
    const prompt = `Role: You are an AI economics and product analytics assistant.

Task: Generate concise, real-time insights for a 12-month ROI line chart that compares Accumulated AI Cost, Business Value (Productivity) and Net Gain.

Instructions (VERY IMPORTANT):
- For each month’s datapoint, write 1 short, plain-English sentence explaining what the graph is conveying at that point.
- Keep the tone professional, executive-friendly, and decision-oriented.
- Do not repeat formulas or raw calculations.
- Clearly state that Business Value represents productivity gains, not direct revenue.
- Avoid jargon. Avoid long paragraphs.
- Each insight should help a stakeholder quickly understand “what changed and why it matters.”

Output Format (STRICT):
Month X: <one-line insight>

Context to assume:
- AI costs grow slowly and remain low
- Business value grows linearly based on time saved
- Net gain = Business value - AI operating cost
- Values shown are cumulative over time

Data: ${JSON.stringify(projectionData)}

Goal: Make the chart self-explanatory so a business leader can understand the ROI story without reading any additional documentation.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Narrative Error:", error);
    return "";
  }
};