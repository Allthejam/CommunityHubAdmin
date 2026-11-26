import 'dotenv/config';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as fs from 'fs';
import * as path from 'path';

function getApiKey(): string | undefined {
  if (process.env.GOOGLE_GENAI_API_KEY) return process.env.GOOGLE_GENAI_API_KEY;
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (process.env.GOOGLE_API_KEY) return process.env.GOOGLE_API_KEY;
  if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) return process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (process.env.NEXT_PUBLIC_GOOGLE_GENAI_API_KEY) return process.env.NEXT_PUBLIC_GOOGLE_GENAI_API_KEY;

  // Fallback: read .env.local directly from disk
  const candidates = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), 'Admin APP', '.env.local'),
    path.resolve(process.cwd(), '..', '.env.local'),
    path.resolve(process.cwd(), '..', 'Admin APP', '.env.local'),
    'C:\\Users\\Allan\\OneDrive\\000 - New Business (AJ)\\APPS Backups\\Community Hub (ALL)\\Admin APP\\.env.local',
    'C:\\Users\\Allan\\OneDrive\\000 - New Business (AJ)\\APPS Backups\\Community Hub (ALL)\\Main Community Hub APP\\.env.local',
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const match = content.match(/(?:GOOGLE_GENAI_API_KEY|GEMINI_API_KEY|GOOGLE_API_KEY)=([^\r\n]+)/);
        if (match && match[1]) {
          return match[1].trim().replace(/^['"]|['"]$/g, '');
        }
      } catch (err) {}
    }
  }
  return undefined;
}

const apiKey = getApiKey();

export const ai = genkit({
  plugins: [
    googleAI(apiKey ? { apiKey } : {}),
  ],
});

