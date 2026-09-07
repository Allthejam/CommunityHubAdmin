'use server';

// NOTE: .env is now loaded via the --dotenv flag in the genkit:dev script
// in package.json. No need for the dotenv package here.

import { initializeAdminApp } from '@/firebase/admin-app';
initializeAdminApp();

import '@/ai/flows/filter-inappropriate-content.ts';
import '@/ai/flows/analyze-sentiment-of-local-news.ts';
import '@/ai/flows/generate-initial-business-profile.ts';
import '@/ai/flows/summarize-community-posts.ts';
import '@/ai/flows/generate-company-profile-from-url.ts';
import '@/ai/flows/verify-location-flow.ts';
import '@/ai/flows/generate-marketing-copy.ts';
import '@/ai/flows/tts-flow.ts';
import '@/ai/flows/generate-legal-document.ts';
import '@/ai/flows/generate-onboarding-manual.ts';
