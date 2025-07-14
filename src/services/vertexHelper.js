import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Vertex AI with environment variables
const vertexAi = new VertexAI({
  project: process.env.GCP_PROJECT_ID,
  location: 'us-central1',
});

// Load the Gemini 1.5 Pro model with generation config
const model = vertexAi.preview.getGenerativeModel({
  model: 'gemini-1.5-pro',
  generationConfig: {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 512,
  },
});

/**
 * Enhances the tone of an email message using Vertex AI Gemini.
 * If the API fails, it returns the original input.
 *
 * @param {string} originalText - The plain email message.
 * @returns {Promise<string>} - The professionally rewritten email.
 */
export async function enhanceEmailTone(originalText) {
  const prompt = `
Please rewrite the following email to sound more professional while keeping the original intent and avoiding unnecessary embellishment:

"${originalText}"
`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const response = result.response;
    return response.candidates?.[0]?.content?.parts?.[0]?.text || originalText;
  } catch (error) {
    console.error('Vertex AI Error:', error);
    return originalText;
  }
}
