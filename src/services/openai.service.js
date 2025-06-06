import { OpenAI } from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY in environment variables.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getResponseFromO4Mini({ userPrompt, systemPrompt }) {
  try {
    const messages = [];

    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt,
      });
    }

    messages.push({
      role: "user",
      content: userPrompt,
    });

    const response = await openai.responses.create({
      model: "o4-mini",
      input: messages,
      reasoning: {
        effort: "medium",
      },
      text: {
        format: {
          type: "text",
        },
      },
    });
    console.log(response);
    return response.output_text;
  } catch (err) {
    console.error("o4-mini Responses API Error:", err);
    throw err;
  }
}
