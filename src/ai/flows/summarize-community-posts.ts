'use server';

/**
 * @fileOverview Summarizes community feed posts using AI.
 *
 * - summarizeCommunityPost - A function that summarizes a given community post.
 * - SummarizeCommunityPostInput - The input type for the summarizeCommunityPost function.
 * - SummarizeCommunityPostOutput - The return type for the summarizeCommunityPost function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeCommunityPostInputSchema = z.object({
  postContent: z
    .string()
    .describe('The content of the community post to be summarized.'),
});
export type SummarizeCommunityPostInput = z.infer<typeof SummarizeCommunityPostInputSchema>;

const SummarizeCommunityPostOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the community post content.'),
});
export type SummarizeCommunityPostOutput = z.infer<typeof SummarizeCommunityPostOutputSchema>;

export async function summarizeCommunityPost(
  input: SummarizeCommunityPostInput
): Promise<SummarizeCommunityPostOutput> {
  return summarizeCommunityPostFlow(input);
}

const summarizeCommunityPostPrompt = ai.definePrompt({
  name: 'summarizeCommunityPostPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: SummarizeCommunityPostInputSchema},
  output: {schema: SummarizeCommunityPostOutputSchema},
  prompt: `Summarize the following community post in a concise manner:\n\n{{{postContent}}}`,
});

const summarizeCommunityPostFlow = ai.defineFlow(
  {
    name: 'summarizeCommunityPostFlow',
    inputSchema: SummarizeCommunityPostInputSchema,
    outputSchema: SummarizeCommunityPostOutputSchema,
  },
  async input => {
    const {output} = await summarizeCommunityPostPrompt(input);
    return output!;
  }
);
