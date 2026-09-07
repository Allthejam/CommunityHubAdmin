'use server';

/**
 * @fileOverview Generates a company profile from a website URL.
 *
 * - generateCompanyProfileFromUrl - A function that scrapes a URL and generates profile data.
 * - GenerateCompanyProfileInput - The input type for the function.
 * - GenerateCompanyProfileOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateCompanyProfileInputSchema = z.object({
  url: z.string().url().describe('The URL of the company website.'),
});
export type GenerateCompanyProfileInput = z.infer<typeof GenerateCompanyProfileInputSchema>;

const GenerateCompanyProfileOutputSchema = z.object({
  shortDescription: z.string().describe('A concise, one-sentence summary of the company.'),
  longDescription: z.string().describe('A detailed, multi-paragraph description of the company, its mission, and its services. Should be formatted as HTML.'),
  logoDataUri: z.string().url().describe("A data URI of a generated concept logo for the company. Should be a simple, modern design. Expected format: 'data:image/png;base64,<encoded_data>'."),
});
export type GenerateCompanyProfileOutput = z.infer<typeof GenerateCompanyProfileOutputSchema>;

export async function generateCompanyProfileFromUrl(input: GenerateCompanyProfileInput): Promise<GenerateCompanyProfileOutput> {
  // Pre-process the URL to ensure it has a protocol.
  let url = input.url;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return generateCompanyProfileFlow({ ...input, url });
}

const profilePrompt = ai.definePrompt({
  name: 'generateCompanyProfilePrompt',
  model: 'googleai/gemini-2.5-flash',
  input: { schema: GenerateCompanyProfileInputSchema },
  output: { schema: GenerateCompanyProfileOutputSchema },
  prompt: `You are an expert at creating company profiles by analyzing their website.
  Based on the content you would find at the following URL, generate a plausible profile: {{{url}}}

  Generate:
  1. A short, one-sentence description of the company.
  2. A detailed, multi-paragraph description formatted in HTML.
  3. A simple, modern concept logo as a data URI string. The logo should be a minimalist icon or stylised text, suitable for a corporate profile.

  Return the output in the specified JSON format.
  `,
});


const generateCompanyProfileFlow = ai.defineFlow(
  {
    name: 'generateCompanyProfileFlow',
    inputSchema: GenerateCompanyProfileInputSchema,
    outputSchema: GenerateCompanyProfileOutputSchema,
  },
  async (input) => {
    // This simulates the response from a web scraping tool.
    const { output } = await profilePrompt(input);
    return output!;
  }
);
