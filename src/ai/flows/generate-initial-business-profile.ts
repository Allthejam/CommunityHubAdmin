'use server';

/**
 * @fileOverview Generates an initial business profile based on a brief description.
 *
 * - generateInitialBusinessProfile - A function that generates the business profile.
 * - GenerateInitialBusinessProfileInput - The input type for the generateInitialBusinessProfile function.
 * - GenerateInitialBusinessProfileOutput - The return type for the generateInitialBusinessProfile function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateInitialBusinessProfileInputSchema = z.object({
  businessDescription: z
    .string()
    .describe('A brief description of the business.'),
});
export type GenerateInitialBusinessProfileInput = z.infer<typeof GenerateInitialBusinessProfileInputSchema>;

const GenerateInitialBusinessProfileOutputSchema = z.object({
  businessProfile: z.object({
    name: z.string().describe('The name of the business.'),
    description: z.string().describe('A detailed description of the business.'),
    address: z.string().describe('The address of the business.'),
    contact: z.string().describe('The contact information of the business.'),
    website: z.string().describe('The website of the business.'),
  }).describe('The generated business profile.'),
});
export type GenerateInitialBusinessProfileOutput = z.infer<typeof GenerateInitialBusinessProfileOutputSchema>;

export async function generateInitialBusinessProfile(input: GenerateInitialBusinessProfileInput): Promise<GenerateInitialBusinessProfileOutput> {
  return generateInitialBusinessProfileFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInitialBusinessProfilePrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: GenerateInitialBusinessProfileInputSchema},
  output: {schema: GenerateInitialBusinessProfileOutputSchema},
  prompt: `You are an expert business profile generator. Please generate a detailed business profile based on the following description: {{{businessDescription}}}. The profile should include the business name, a detailed description, address, contact information, and website.
`,
});

const generateInitialBusinessProfileFlow = ai.defineFlow(
  {
    name: 'generateInitialBusinessProfileFlow',
    inputSchema: GenerateInitialBusinessProfileInputSchema,
    outputSchema: GenerateInitialBusinessProfileOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
