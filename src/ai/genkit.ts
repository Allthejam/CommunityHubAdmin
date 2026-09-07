import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Bulletproof Genkit initialization.
 * Prioritizes the specific environment variables found in cloud workstations
 * to ensure fetch errors are minimized.
 */
const apiKey = process.env.GOOGLE_GENAI_API_KEY || 
               process.env.GOOGLE_API_KEY || 
               process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("Genkit Warning: No AI API Key detected in environment. AI features will fail until a key is set in Platform Settings.");
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey
    }),
  ],
});
