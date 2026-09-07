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
  prompt: `You are a creative marketing expert for the community platform "Local Pulse".
      
  Generate highly engaging marketing copy based on the following:
  - Target Audience: {{{audience}}}
  - Feature to Promote: {{{feature}}}

  Please provide:
  1. A catchy, high-impact headline.
  2. Professional body text in clean HTML (use <p> and <strong> tags).
  3. A short, punchy social media post.`,
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
