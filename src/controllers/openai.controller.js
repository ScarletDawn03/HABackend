import { getResponseFromO4Mini } from "../services/openai.service.js";

export async function getO4MiniResponseController(req, res) {
  const { system_prompt, user_prompt } = req.body;

  if (!user_prompt) {
    return res.status(400).json({ error: "User prompt is required." });
  }

  try {
    const answer = await getResponseFromO4Mini({
      userPrompt: user_prompt,
      systemPrompt: system_prompt,
    });

    res.json({ response: answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get response from API" });
  }
}
