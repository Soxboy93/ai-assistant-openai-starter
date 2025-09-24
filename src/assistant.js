// Helper that calls the OpenAI API to produce assistant replies.
// Uses the official OpenAI Node client.
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * messages: Array of { role: "user" | "assistant" | "system", content: string }
 * assistantConfig: optional { model, max_tokens, temperature }
 */
async function createAssistantReply(messages, assistantConfig = {}) {
  const model = assistantConfig.model || 'gpt-4';
  const temperature = assistantConfig.temperature ?? 0.7;
  const max_tokens = assistantConfig.max_tokens || 800;

  // Example using chat completion API shape
  const response = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens
  });

  // response.choices[0].message.content is the typical shape; adapt if API differs
  const content = response.choices && response.choices[0] && response.choices[0].message
    ? response.choices[0].message.content
    : (response.output?.[0]?.content || '');

  return content;
}

module.exports = { createAssistantReply };