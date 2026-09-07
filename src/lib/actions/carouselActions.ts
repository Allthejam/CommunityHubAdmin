
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateCarouselThemeInputSchema = z.object({
  theme: z.string().describe('The theme for the carousel content.'),
  nodeCount: z
    .string()
    .transform(Number)
    .describe('The number of nodes to generate.'),
});

const GenerateCarouselThemeOutputSchema = z.object({
  nodes: z
    .array(
      z.object({
        title: z.string(),
        desc: z.string(),
      })
    )
    .describe('An array of content nodes for the carousel.'),
  colors: z.object({
    neon: z.string().describe('A vibrant neon color as a hex code.'),
    bg: z.string().describe('A dark, contrasting background color as a hex code.'),
  }),
});

const generateCarouselThemePrompt = ai.definePrompt({
    name: 'generateCarouselTheme',
    input: { schema: GenerateCarouselThemeInputSchema },
    output: { schema: GenerateCarouselThemeOutputSchema },
    prompt: `Generate a set of titles and brief, one-sentence descriptions for a 3D carousel based on the theme: {{{theme}}}.
  
  Generate exactly {{{nodeCount}}} nodes.
  
  Also generate a vibrant neon color and a dark, contrasting background color suitable for this theme. Return them as hex codes.`,
});

export async function generateCarouselTheme(
  prevState: any,
  formData: FormData
) {
  'use server';
  const { output, error } = await generateCarouselThemePrompt({
    theme: formData.get('theme') as string,
    nodeCount: formData.get('nodeCount') as string,
  });

  if (error) {
    return { error: error.message, success: false };
  }
  
  return { ...output, success: true };
}

    