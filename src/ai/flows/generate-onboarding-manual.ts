'use server';
/**
 * @fileOverview Generates comprehensive onboarding manuals for different account types.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateOnboardingManualInputSchema = z.object({
  accountType: z.string().min(1, "Account type is required").describe("The type of account to generate a manual for."),
});

export type GenerateOnboardingManualInput = z.infer<typeof GenerateOnboardingManualInputSchema>;

const GenerateOnboardingManualOutputSchema = z.object({
  title: z.string().describe("Title for the manual."),
  content: z.string().describe("Generated HTML content."),
});

export type GenerateOnboardingManualOutput = z.infer<typeof GenerateOnboardingManualOutputSchema>;

/**
 * Server action to generate manual content via Genkit.
 */
export async function generateOnboardingManualAction(
  prevState: any,
  formData: FormData
): Promise<GenerateOnboardingManualOutput & { success: boolean; error?: string }> {
  const accountType = formData.get('accountType') as string;

  if (!accountType) {
      return { ...prevState, success: false, error: "Input Error: Account Type is required." };
  }

  try {
    const { output } = await ai.generate({
        model: 'googleai/gemini-2.5-flash',
        prompt: `Generate a professional onboarding manual for a "${accountType}" user on the "Local Pulse" platform.
        Include sections for: Welcome, Getting Started, and Tool Overviews.
        Format: Clean HTML (<h2>, <p>, <ul>).`,
        output: { schema: GenerateOnboardingManualOutputSchema },
    });

    if (!output) throw new Error("AI failed to produce a draft.");
    return { ...output, success: true };
  } catch (err: any) {
    console.error("Manual Gen Error:", err);
    return { 
        ...prevState, 
        success: false, 
        error: `AI Error: ${err.message || "Connection failed"}. Check System Diagnostics in Settings.`
    };
  }
}
