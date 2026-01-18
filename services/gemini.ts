
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, TermExplanation } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Robustly extracts JSON from a string that might contain markdown blocks.
 * Fixes original logic error where .replace('json', '') was used.
 */
const extractJSON = (text: string) => {
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No valid JSON found in response");
  return JSON.parse(jsonMatch[0]);
};

export const analyzeContent = async (
  text?: string,
  image?: { data: string; mimeType: string }
): Promise<AnalysisResult> => {
  const ai = getAI();
  const model = ai.models.get('gemini-3-pro-preview');

  const promptParts: any[] = [];
  
  let instructions = `
    Act as an expert mechanical engineer. 
    Analyze the provided content and identify specific technical terms and components.
  `;

  if (text) {
    promptParts.push({ text: `Analyze this technical text:\n${text}` });
    instructions += `\nIdentify key mechanical components, materials, and hardware terms from the text.`;
  }

  if (image) {
    promptParts.push({
      inlineData: {
        data: image.data,
        mimeType: image.mimeType,
      },
    });
    instructions += `
      \nFrom the image, identify distinct mechanical components.
      For each component, provide:
      1. Unique technical label (no duplicates).
      2. Functional description.
      3. Precise bounding box [ymin, xmin, ymax, xmax] normalized 0-1000.
    `;
  }

  instructions += `
    Output ONLY a JSON object with this schema:
    {
      "key_terms": string[],
      "diagram_labels": [{"label": string, "description": string, "box_2d": [number, number, number, number]}]
    }
  `;

  const response = await model.generateContent({
    contents: [{ role: 'user', parts: [...promptParts, { text: instructions }] }],
    config: { responseMimeType: "application/json" }
  });

  const result = extractJSON(response.text || "");
  return {
    ...result,
    original_text: text,
    image_data: image ? `data:${image.mimeType};base64,${image.data}` : undefined
  };
};

export const explainTerm = async (term: string): Promise<TermExplanation> => {
  const ai = getAI();
  const model = ai.models.get('gemini-3-flash-preview');

  const prompt = `
    Act as an AI Mechanical Mentor for a robotics beginner.
    Explain the term: "${term}".
    Focus on deep conceptual understanding: why it's used and how it's designed.
    
    Output strictly valid JSON:
    {
      "term": "${term}",
      "explanation": "Detailed markdown explanation",
      "pros": ["advantage 1", "advantage 2"],
      "cons": ["tradeoff 1", "tradeoff 2"],
      "alternatives": [{"term": "name", "description": "why"}],
      "links": [{"title": "Shop/Read", "url": "URL", "category": "Supplier|Community|Image"}]
    }
  `;

  const response = await model.generateContent(prompt);
  return {
    ...extractJSON(response.text || ""),
    timestamp: Date.now()
  };
};
