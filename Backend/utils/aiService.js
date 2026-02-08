import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are a legal assistant bot for LegalConnect.
Provide helpful, clear, and accurate information about legal matters.
Remember to:
- Always state that you are not a lawyer and this is not legal advice
- Suggest consulting with a qualified lawyer for specific situations
- Include references to relevant laws when possible
- Keep responses concise but informative
- Use simple language and avoid excessive legal jargon`;

/**
 * Get response from Gemini for legal queries
 * @param {string} query - User's legal question
 * @returns {Promise<string>} - AI response
 */
export const getLegalAssistance = async (query) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("AI Service Error: GEMINI_API_KEY is not defined in .env");
    return `I apologize, but I'm having trouble processing your question right now. Please add your Gemini API key to Backend/.env and try again, or contact a lawyer through our directory for assistance with your legal matter.`;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `${SYSTEM_PROMPT}

User question:
${query}`;

    const result = await model.generateContent(prompt);

    const responseText = result.response?.text();
    if (!responseText) throw new Error("No response text from Gemini");
    return responseText;
  } catch (error) {
    console.error("AI Service Error (Gemini):", error.message || error);

    const msg = (error && error.message) || "";
    if (msg.includes("API key not valid") || msg.includes("PERMISSION_DENIED")) {
      return `I'm unable to process requests because the Gemini API key is invalid or missing permissions. Please check your GEMINI_API_KEY.`;
    }
    if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("rate limit")) {
      return `I'm temporarily unable to process requests due to usage limits. Please try again in a few moments.`;
    }

    return `I apologize, but I'm having trouble processing your question right now. Please try again later or contact a lawyer through our directory for assistance with your legal matter.`;
  }
};


