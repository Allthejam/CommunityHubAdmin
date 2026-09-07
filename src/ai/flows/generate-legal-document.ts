'use server';
/**
 * @fileOverview Generates legal document drafts (e.g., Terms of Service, Privacy Policy)
 * based on the application's features.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateLegalDocumentInputSchema = z.object({
  documentType: z.string().describe("The type of legal document to generate (e.g., 'Terms of Service', 'Privacy Policy')."),
});

export type GenerateLegalDocumentInput = z.infer<typeof GenerateLegalDocumentInputSchema>;

const GenerateLegalDocumentOutputSchema = z.object({
  title: z.string().describe("The generated title for the document."),
  content: z.string().describe("The full, generated HTML content of the legal document."),
});

export type GenerateLegalDocumentOutput = z.infer<typeof GenerateLegalDocumentOutputSchema>;

export async function generateLegalDocumentAction(
  prevState: any,
  formData: FormData
): Promise<GenerateLegalDocumentOutput & { success: boolean; error?: string }> {
  const input = {
    documentType: formData.get('documentType') as string,
  };

  try {
    const output = await generateLegalDocumentFlow(input);
    return { ...output, success: true, error: undefined };
  } catch (err: any) {
    console.error("AI Generation Action Error:", err);
    return { ...prevState, success: false, error: err.message };
  }
}

const appFeatures = `
- Community Feed: Aggregates local news, events, and announcements. Allows user-generated content (posts, comments).
- Business Directory: Local businesses can create profiles, advertise, post jobs, and publish events. Includes e-commerce storefronts for direct sales.
- Emergency Alerts: Critical system for receiving urgent alerts from local authorities.
- AI Community Assistant: An AI tool for assistance and content moderation (filtering keywords, images).
- Lost & Found: A section for users to post about lost and found items.
- Volunteer Reporter System: Empowers residents to report on local news.
- Account Types: Personal, Business, Community Leader, Enterprise, and National Advertiser accounts with varying permissions.
- Data Collection: User profiles (name, email, location), settings (ad preferences), user-generated content, and shopping cart data.
- E-commerce: Businesses can sell products, and users can purchase them, involving transactions and order data.
`;

const prompt = ai.definePrompt({
  name: 'generateLegalDocumentPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: GenerateLegalDocumentInputSchema},
  output: {schema: GenerateLegalDocumentOutputSchema},
  prompt: `You are an expert legal-tech assistant. Generate a draft for a "{{documentType}}" for a community application named "Local Pulse".

The application has features like: ${appFeatures}.

Your output MUST be a valid JSON object with two keys:
1. "title": A suitable title for the document.
2. "content": The full document content in well-structured, clean HTML. Use tags like <h2>, <h3>, <p>, and <ul>. Ensure the content is comprehensive, covering user responsibilities, data privacy, and disclaimers relevant to the app's features. Use "Local Pulse" as the company name and do not use placeholders.`,
});


const generateLegalDocumentFlow = ai.defineFlow(
  {
    name: 'generateLegalDocumentFlow',
    inputSchema: GenerateLegalDocumentInputSchema,
    outputSchema: GenerateLegalDocumentOutputSchema,
  },
  async input => {
    const { output, error } = await prompt(input);
    if (error) {
        throw new Error(`AI model failed to generate content: ${error.message}`);
    }
    if (!output) {
        throw new Error("The AI model did not return any output. Please try again.");
    }
    return output;
  }
);
