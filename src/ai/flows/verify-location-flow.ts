'use server';
/**
 * @fileOverview Verifies if a given location is plausible and not nonsensical.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VerifyLocationInputSchema = z.object({
  country: z.string().describe('The country.'),
  state: z.string().describe('The state, province, or equivalent top-level division.'),
  region: z.string().describe('The region, county, or equivalent second-level division.'),
  community: z.string().describe('The local community, town, or city name.'),
});

const VerifyLocationOutputSchema = z.object({
    isPlausible: z.boolean().describe("Whether the described location is a real, plausible place on Earth."),
    reason: z.string().describe("A brief explanation for the decision. If not plausible, explain why (e.g., 'The moon is not a valid location.')."),
});

export async function verifyLocation(input: z.infer<typeof VerifyLocationInputSchema>): Promise<z.infer<typeof VerifyLocationOutputSchema>> {
    return verifyLocationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'verifyLocationPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: VerifyLocationInputSchema},
  output: {schema: VerifyLocationOutputSchema},
  prompt: `You are a geographical data verification expert. Analyze the following location details to determine if it is a plausible, real-world place. Do not be too strict; the user may have minor spelling errors. However, reject any locations that are clearly fake, nonsensical (e.g., on the moon), or just gibberish.

- Country: {{{country}}}
- State/Province: {{{state}}}
- Region/County: {{{region}}}
- Community/City: {{{community}}}

Is this a plausible location?`,
});

const verifyLocationFlow = ai.defineFlow(
  {
    name: 'verifyLocationFlow',
    inputSchema: VerifyLocationInputSchema,
    outputSchema: VerifyLocationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
