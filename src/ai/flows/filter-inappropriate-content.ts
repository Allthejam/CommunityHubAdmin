'use server';

/**
 * @fileOverview AI-powered content filter for community feed.
 *
 * - filterInappropriateContent - A function that filters text and images for inappropriate content.
 * - FilterInappropriateContentInput - The input type for the filterInappropriateContent function.
 * - FilterInappropriateContentOutput - The return type for the filterInappropriateContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FilterInappropriateContentInputSchema = z.object({
  text: z.string().optional().describe('The text content to filter.'),
  imageDataUri: z
    .string()
    .optional() // Making it optional
    .describe(
      "A photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type FilterInappropriateContentInput = z.infer<
  typeof FilterInappropriateContentInputSchema
>;

const FilterInappropriateContentOutputSchema = z.object({
  isAppropriate: z
    .boolean() // Changed from string to boolean
    .describe('Whether the content is appropriate or not.'),
  reason: z
    .string() // Added reason for the filtering decision
    .optional()
    .describe('The reason why the content was deemed inappropriate.'),
});

export type FilterInappropriateContentOutput = z.infer<
  typeof FilterInappropriateContentOutputSchema
>;

export async function filterInappropriateContent(
  input: FilterInappropriateContentInput
): Promise<FilterInappropriateContentOutput> {
  return filterInappropriateContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'filterInappropriateContentPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: FilterInappropriateContentInputSchema},
  output: {schema: FilterInappropriateContentOutputSchema},
  prompt: `You are an AI content moderation tool designed to identify inappropriate content in community posts.
  You will receive the content of the post as text, as well as optionally a photo associated with the post.
  Your job is to classify if the content is appropriate and safe for the community.

  If the text or the image contains hate speech, violence, sexually explicit content, or any other inappropriate content, you should mark it as inappropriate.
  Otherwise, mark it as appropriate.

  Here is the text content: {{{text}}}
  Here is the associated image: {{#if imageDataUri}}{{media url=imageDataUri}}{{else}}No image provided.{{/if}}
  
  Return a boolean value to indicate whether the content is appropriate, along with a brief reason for your decision. Focus on safety and respect within the community.
  Follow output schema Zod descriptions to create the output.
  `,
});

const filterInappropriateContentFlow = ai.defineFlow(
  {
    name: 'filterInappropriateContentFlow',
    inputSchema: FilterInappropriateContentInputSchema,
    outputSchema: FilterInappropriateContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
