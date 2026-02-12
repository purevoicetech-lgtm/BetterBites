import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { HealthAnalysis } from "../types";

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export async function analyzeProduct(base64Images: string[]): Promise<HealthAnalysis | null> {
  const apiKey = import.meta.env.VITE_API_KEY || "";
  const genAI = new GoogleGenerativeAI(apiKey);

  const imageParts = base64Images.map(img => {
    const cleanBase64 = img.includes(',') ? img.split(',')[1] : img;
    return { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } };
  });

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_INSTRUCTION
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [...imageParts, { text: "Analyze the nutrition and ingredients of this product." }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
      safetySettings: SAFETY_SETTINGS,
    });

    const text = result.response.text();
    return JSON.parse(text) as HealthAnalysis;
  } catch (error: any) {
    console.error("Analysis failed:", error);
    throw new Error(error.message || "Product analysis failed.");
  }
}
