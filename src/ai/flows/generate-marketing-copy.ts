'use server';
/**
 * @fileOverview Generates marketing copy for different audiences and features.
 * 
 * - generateMarketingCopy - Server action wrapper for the AI flow.
 * - GenerateMarketingCopyInput - Input schema for targeting.
 * - GenerateMarketingCopyOutput - Output schema for the marketing materials.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateMarketingCopyInputSchema = z.object({
  audience: z.string().min(1, "Audience is required").describe('The target audience for the marketing copy.'),
  feature: z.string().min(1, "Feature is required").describe('The specific feature or aspect of the platform to promote.'),
});

export type GenerateMarketingCopyInput = z.infer<typeof GenerateMarketingCopyInputSchema>;

const GenerateMarketingCopyOutputSchema = z.object({
  headline: z.string().describe('A catchy headline for the campaign.'),
  body: z.string().describe('The main body text, formatted as simple HTML (using <p> and <strong> tags).'),
  socialMediaPost: z.string().describe('A short, engaging post suitable for social media platforms.'),
});

export type GenerateMarketingCopyOutput = z.infer<typeof GenerateMarketingCopyOutputSchema>;

const marketingPrompt = ai.definePrompt({
  name: 'generateMarketingCopyPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: { schema: GenerateMarketingCopyInputSchema },
  output: { schema: GenerateMarketingCopyOutputSchema },
  prompt: `You are a high-level creative brand and marketing strategist for "Community Hub" (also referred to as Local Pulse), a comprehensive next-generation civic, emergency, and local commerce ecosystem.
      
  Generate compelling, authoritative, and conversion-focused marketing copy tailored specifically to the target audience and platform feature focus.

  Context & Platform Architecture:
  - Target Audience: {{{audience}}}
  - Feature Focus: {{{feature}}}

  Platform Capability Reference for Copy Inspiration:
  - Regional Governance & Multi-Hub Operations: Tier-1 regional command, cross-community alerting, emergency multi-hub coordination, and county/park authority oversight.
  - Threat Matrix & Incident Severity: Proactive threat monitoring, matrix scoring, environmental/civil alert tiers, and rapid-response situational awareness.
  - Emergency Preparedness Plans & Muster Protocols: Local emergency readiness, emergency muster points, vulnerable resident assistance, and decentralized crisis response.
  - Emergency Broadcast System: Localized and multi-hub real-time dispatches with cryptographic audit trails and verified sender validation.
  - Virtual Highstreet & Local Commerce: Hyper-local shopping, business showcases, footfall regeneration, and local merchant growth.
  - Community Leadership & Civic Stewardship: Empowering local champions to run hubs, manage moderation, and foster strong neighborhood bonds.
  - Forum, Events & News: Authentic local discussions, community calendars, grassroots reporting, and verified local journalism.

  Requirements for Generated Content:
  1. Headline: High-impact, catchy, and professional (no generic fluff).
  2. Body Text: Persuasive, clear, and structured in clean HTML (use <p>, <strong>, and <ul>/<li> where beneficial). Highlight real-world benefits for the specific audience.
  3. Social Media Post: Punchy, shareable copy with 2-4 strategic hashtags.`,
});

const generateMarketingCopyFlow = ai.defineFlow(
  {
    name: 'generateMarketingCopyFlow',
    inputSchema: GenerateMarketingCopyInputSchema,
    outputSchema: GenerateMarketingCopyOutputSchema,
  },
  async (input) => {
    const { output } = await marketingPrompt(input);
    if (!output) throw new Error("The AI model failed to generate a response.");
    return output;
  }
);

/**
 * Next.js Server Action to generate marketing copy.
 */
export async function generateMarketingCopy(
  prevState: any,
  formData: FormData
): Promise<GenerateMarketingCopyOutput & { success: boolean; error?: string }> {
  const audience = formData.get('audience') as string;
  const feature = formData.get('feature') as string;

  if (!audience || !feature) {
    return {
      ...prevState,
      success: false,
      error: "Input Error: Both audience and feature selection are required."
    };
  }

  try {
    const output = await generateMarketingCopyFlow({ audience, feature });
    return { ...output, success: true };
  } catch (err: any) {
    console.error("Marketing Gen Error:", err);
    
    const msg = err.message || "";
    const isFetchError = msg.includes('fetch') || msg.includes('Network') || msg.includes('ENOTFOUND');
    
    return { 
      ...prevState, 
      success: false, 
      error: isFetchError 
        ? `AI Connectivity Error: The server could not reach the Gemini API. This typically happens during platform migrations or when the API key is not fully propagated. (Ref: ${msg.substring(0, 50)}...)`
        : `AI Service Error: ${msg || "An unexpected error occurred during generation."}`
    };
  }
}
