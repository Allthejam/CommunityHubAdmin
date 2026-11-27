import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

function resolveGeminiApiKey(): string | undefined {
  // Candidate env file paths
  const candidateFiles = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'Admin APP', '.env.local'),
    path.join(process.cwd(), 'Admin APP', '.env'),
    path.resolve(process.cwd(), '..', '.env.local'),
    path.resolve(process.cwd(), '..', 'Admin APP', '.env.local'),
    path.resolve(process.cwd(), '..', 'Main Community Hub APP', '.env.local'),
    'C:\\Users\\Allan\\OneDrive\\000 - New Business (AJ)\\APPS Backups\\Community Hub (ALL)\\Admin APP\\.env.local',
    'C:\\Users\\Allan\\OneDrive\\000 - New Business (AJ)\\APPS Backups\\Community Hub (ALL)\\Admin APP\\.env',
    'C:\\Users\\Allan\\OneDrive\\000 - New Business (AJ)\\APPS Backups\\Community Hub (ALL)\\Main Community Hub APP\\.env.local',
  ];

  for (const file of candidateFiles) {
    if (fs.existsSync(file)) {
      try {
        dotenv.config({ path: file, override: true });
        const content = fs.readFileSync(file, 'utf8');
        const match = content.match(/(?:GEMINI_API_KEY|GOOGLE_GENAI_API_KEY)=([^\r\n]+)/);
        if (match && match[1]) {
          const val = match[1].trim().replace(/^['"]|['"]$/g, '');
          if (val && !val.includes('AIzaSyDzbik9uEALmhNwtiY9JKzrP9lcdN1KD1s')) {
            process.env.GEMINI_API_KEY = val;
            process.env.GOOGLE_GENAI_API_KEY = val;
            return val;
          }
        }
      } catch (err) {}
    }
  }

  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY
  );
}

const apiKey = resolveGeminiApiKey();

// Ensure process.env is synced for Genkit internals
if (apiKey) {
  process.env.GEMINI_API_KEY = apiKey;
  process.env.GOOGLE_GENAI_API_KEY = apiKey;
  process.env.GOOGLE_API_KEY = apiKey;
}

export const ai = genkit({
  plugins: [
    googleAI(apiKey ? { apiKey } : {}),
  ],
});


