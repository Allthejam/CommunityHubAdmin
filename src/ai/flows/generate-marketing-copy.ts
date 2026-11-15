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
import { initializeAdminApp } from '@/firebase/admin-app';

const GenerateMarketingCopyInputSchema = z.object({
  audience: z.string().min(1, "Audience is required").describe('The target audience for the marketing copy.'),
  feature: z.string().min(1, "Feature is required").describe('The specific feature or aspect of the platform to promote.'),
  customNotes: z.string().optional().describe('Optional custom context, specific scenarios, or promotional angle.'),
});

export type GenerateMarketingCopyInput = z.infer<typeof GenerateMarketingCopyInputSchema>;

const GenerateMarketingCopyOutputSchema = z.object({
  headline: z.string().describe('A catchy headline for the campaign.'),
  body: z.string().describe('The main body text, formatted as simple HTML (using <p>, <strong>, <ul>, and <li> tags).'),
  socialMediaPost: z.string().describe('A short, engaging post suitable for social media platforms.'),
});

export type GenerateMarketingCopyOutput = z.infer<typeof GenerateMarketingCopyOutputSchema>;

const marketingPrompt = ai.definePrompt({
  name: 'generateMarketingCopyPrompt',
  model: 'googleai/gemini-3.6-flash',
  input: { schema: GenerateMarketingCopyInputSchema },
  output: { schema: GenerateMarketingCopyOutputSchema },
  prompt: `You are a high-level creative brand and marketing strategist for "Community Hub" (also referred to as Local Pulse), a comprehensive next-generation civic, emergency, and local commerce ecosystem.
      
  Generate compelling, authoritative, and conversion-focused marketing copy tailored specifically to the target audience and platform feature focus.

  Context & Platform Architecture:
  - Target Audience: {{{audience}}}
  - Feature Focus: {{{feature}}}
{{#if customNotes}}
  - Additional Focus / Specific Angles: {{{customNotes}}}
{{/if}}

  Platform Capability Reference for Copy Inspiration:
  - Community Leader POS, Event Till & QR Code Payments: Mobile & tablet event till for galas, festivals, farmers markets, sports days, and community stalls. Features instant dynamic QR code scanning for phone payments (Apple Pay, Google Pay, card) and offline cash tracking. 100% of donations and event proceeds go directly to the Community Leader's connected Stripe Express account via instant destination charge; the platform takes £0.00 markup (0% platform cut; only covers standard 1.5% + 20p Stripe processing fee; cash sales have 0p fee with 100% kept in the community cash tin).
  - Payment Auditing, Live Till Tracking & Cash Reconciliation: Transparent audit ledger, real-time till tracking, shift reconciliation, operator auditing, and exportable financial logs designed for Parish Clerks, Town Council Treasurers, and independent civic auditors.
  - Transparent Revenue Sharing & 70% Local Council Treasury Funding: A revolutionary commercial model where 70% of business and enterprise listing subscriptions goes directly to the Community Leader / Town Council fund to pay for local flowers, street fairs, youth clubs, and civic projects (unlike corporate tech platforms that take 100% of local ad spend away from the town).
  - Zero-Markup Community Donations & Dedicated Fundraising Pots: Leaders can create dedicated civic fundraising pots (e.g. Village Hall Roof Appeal, Christmas Lights, Park Restoration) with live progress bars, instant QR donations, and 0% platform deductions.
  - Virtual Highstreet, Storefront Subscriptions & Ethical Courier Splits: Storefront subscriptions provide a 10% Community Leader share, 40% Community Courier share, and 50% Platform share, creating sustainable local delivery employment for youth and cyclists while keeping high street trade thriving.
  - Zero-Markup Shopping Cart & Local Merchant Checkout: Local residents order from high street shops with 0% platform markup (2.9% + 30p est. Stripe fee only), supporting independent merchants and local zero-emission delivery couriers.
  - Real-Time Severe Weather Warning System: Live meteorological alerts, severe weather warnings (storm, flooding, high winds, snow/ice, heatwaves), hyper-local community impact badges, school closure alerts, and safety advisories protecting lives and property.
  - Live Traffic, Roadworks & Travel Notifications: Real-time road status, traffic delay tracking, highway incident alerts, planned roadworks & detours, public transport & ferry disruptions, keeping daily commuters and drivers informed before they set off.
  - Emergency Preparedness Plans & Muster Protocols: Local emergency readiness, emergency muster points, vulnerable resident assistance, offline-resilient crisis response, and civil protection coordination.
  - Emergency Broadcast System: Localized and multi-hub real-time dispatches with cryptographic audit trails and verified sender validation.
  - Threat Matrix & Incident Severity: Proactive threat monitoring, matrix scoring, environmental/civil alert tiers, and rapid-response situational awareness.
  - Regional Governance & Multi-Hub Operations: Tier-1 regional command, cross-community alerting, emergency multi-hub coordination, and county/park authority oversight.
  - Neighborhood Safety & Police Liaison Network: Direct communication with dedicated Police Liaison Officers, crime prevention bulletins, neighborhood watch alerts, and community safety updates.
  - Local Courier & Rapid Community Delivery Network: Hyper-local courier delivery matching residents with local couriers for same-day local store deliveries, click & collect, and community drop-offs.
  - Civic Petitions, Citizen Polls & Grassroots Democracy: Active petitions, community polls, participatory budgeting, and transparent consultation channels giving every resident a direct voice in local governance.
  - Lost & Found Pet & Property Network: Real-time broadcast network with photo identification to quickly reunite families with lost pets, keys, and valuable belongings.
  - Community Leadership & Civic Stewardship: Empowering local champions to run hubs, manage moderation, and foster strong neighborhood bonds.
  - Forum, Events, Festivals & Tourism: Authentic local discussions, community calendars, grassroots reporting, verified local journalism, and stay-local tourism.
  - Time Waisters Community Arcade & Brain Games: A rich suite of 21+ built-in instant browser games (Sudoku, Solitaire, Word Guess/Wordle, Snake, Minesweeper, Trivia, 2048, Checkers, Battleship, Town Hopper, UK Driver Rank, FreeCell, Connect Four, etc.) providing ad-free, family-friendly brain training, casual entertainment for commuters and transit riders, and community leisure without requiring downloads, sign-ups, or invasive tracking.

  Commercial Model & Positioning Guidelines:
  - When targeting Casual Gamers, Commuters & Families: Emphasize instant, frictionless fun, 21+ games with zero downloads or pop-up ads, brain-sharpening daily puzzles, and a friendly community entertainment escape.
  - When targeting Community Leaders, Gala Committees & Treasurers: Emphasize zero-equipment cost (works on any phone/tablet), 0% platform fee on donations/events, immediate Stripe destination payouts, transparent audit ledgers, and the 70% recurring revenue share from business listings that directly funds parish and council projects.
  - When targeting Local Businesses & Merchants: Emphasize local wealth retention — unlike corporate social networks where 100% of ad spend vanishes, £14 of every £20 monthly listing goes directly into their own town's civic fund, improving footfall and funding community improvements.
  - When targeting Couriers & Delivery Partners: Emphasize the 40% share of storefront subscriptions and delivery earnings with 0% platform markup on checkout delivery fees.

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
 * Resolves the Gemini API Key from environment variables, Firestore system configuration, or platform fallback.
 */
async function resolveGeminiApiKey(): Promise<string> {
  const envKeys = [
    process.env.GOOGLE_GENAI_API_KEY,
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    process.env.NEXT_PUBLIC_GOOGLE_GENAI_API_KEY
  ];

  for (const key of envKeys) {
    if (key && key.trim().length > 10) {
      return key.trim();
    }
  }

  // Fallback 1: Check Firestore platform_settings via Admin SDK
  try {
    const { firestore } = initializeAdminApp();
    const settingsDoc = await firestore.collection('platform_settings').doc('system').get();
    if (settingsDoc.exists) {
      const data = settingsDoc.data();
      const dbKey = data?.geminiApiKey || data?.googleGenAiApiKey || data?.GEMINI_API_KEY || data?.apiKey;
      if (dbKey && typeof dbKey === 'string' && dbKey.trim().length > 10) {
        return dbKey.trim();
      }
    }
  } catch (e) {
    // Continue to REST fallback
  }

  // Fallback 2: Direct Firestore REST API (Works unconditionally in serverless / App Hosting)
  try {
    const webKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCf2j994HoQsQ8SnhnhAR5Vzs-ymJJxJe8';
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-293583498-5253a';
    const restUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/platform_settings/system?key=${webKey}`;
    const res = await fetch(restUrl);
    if (res.ok) {
      const data = await res.json();
      const dbKey = data?.fields?.geminiApiKey?.stringValue || 
                    data?.fields?.googleGenAiApiKey?.stringValue || 
                    data?.fields?.GEMINI_API_KEY?.stringValue || 
                    data?.fields?.apiKey?.stringValue;
      if (dbKey && typeof dbKey === 'string' && dbKey.trim().length > 10) {
        return dbKey.trim();
      }
    }
  } catch (restErr) {
    // Ignore error
  }

  return '';
}

/**
 * Direct REST fallback to Google Generative Language API (bypasses Genkit/SDK runtime limitations in serverless environments).
 */
async function generateMarketingCopyDirectRest(
  input: { audience: string; feature: string; customNotes?: string },
  apiKey: string
): Promise<GenerateMarketingCopyOutput> {
  const prompt = `You are a high-level creative brand and marketing strategist for "Community Hub" (also referred to as Local Pulse), a comprehensive next-generation civic, emergency, and local commerce ecosystem.
      
Generate compelling, authoritative, and conversion-focused marketing copy tailored specifically to the target audience and platform feature focus.

Context & Platform Architecture:
- Target Audience: ${input.audience}
- Feature Focus: ${input.feature}
${input.customNotes && input.customNotes.trim() ? `- Additional Campaign Focus / Custom Notes: ${input.customNotes.trim()}\nPlease actively weave these specific scenarios, hazards, or promotional details into the copy.\n` : ''}

Platform Capability Reference for Copy Inspiration:
- Community Leader POS, Event Till & QR Code Payments: Mobile & tablet event till for galas, festivals, farmers markets, sports days, and community stalls. Features instant dynamic QR code scanning for phone payments (Apple Pay, Google Pay, card) and offline cash tracking. 100% of donations and event proceeds go directly to the Community Leader's connected Stripe Express account via instant destination charge; the platform takes £0.00 markup (0% platform cut; only covers standard 1.5% + 20p Stripe processing fee; cash sales have 0p fee with 100% kept in the community cash tin).
- Payment Auditing, Live Till Tracking & Cash Reconciliation: Transparent audit ledger, real-time till tracking, shift reconciliation, operator auditing, and exportable financial logs designed for Parish Clerks, Town Council Treasurers, and independent civic auditors.
- Transparent Revenue Sharing & 70% Local Council Treasury Funding: A revolutionary commercial model where 70% of business and enterprise listing subscriptions goes directly to the Community Leader / Town Council fund to pay for local flowers, street fairs, youth clubs, and civic projects (unlike corporate tech platforms that take 100% of local ad spend away from the town).
- Zero-Markup Community Donations & Dedicated Fundraising Pots: Leaders can create dedicated civic fundraising pots (e.g. Village Hall Roof Appeal, Christmas Lights, Park Restoration) with live progress bars, instant QR donations, and 0% platform deductions.
- Virtual Highstreet, Storefront Subscriptions & Ethical Courier Splits: Storefront subscriptions provide a 10% Community Leader share, 40% Community Courier share, and 50% Platform share, creating sustainable local delivery employment for youth and cyclists while keeping high street trade thriving.
- Zero-Markup Shopping Cart & Local Merchant Checkout: Local residents order from high street shops with 0% platform markup (2.9% + 30p est. Stripe fee only), supporting independent merchants and local zero-emission delivery couriers.
- Real-Time Severe Weather Warning System: Live meteorological alerts, severe weather warnings (storm, flooding, high winds, snow/ice, heatwaves), hyper-local community impact badges, school closure alerts, and safety advisories protecting lives and property.
- Live Traffic, Roadworks & Travel Notifications: Real-time road status, traffic delay tracking, highway incident alerts, planned roadworks & detours, public transport & ferry disruptions, keeping daily commuters and drivers informed before they set off.
- Emergency Preparedness Plans & Muster Protocols: Local emergency readiness, emergency muster points, vulnerable resident assistance, offline-resilient crisis response, and civil protection coordination.
- Emergency Broadcast System: Localized and multi-hub real-time dispatches with cryptographic audit trails and verified sender validation.
- Threat Matrix & Incident Severity: Proactive threat monitoring, matrix scoring, environmental/civil alert tiers, and rapid-response situational awareness.
- Regional Governance & Multi-Hub Operations: Tier-1 regional command, cross-community alerting, emergency multi-hub coordination, and county/park authority oversight.
- Neighborhood Safety & Police Liaison Network: Direct communication with dedicated Police Liaison Officers, crime prevention bulletins, neighborhood watch alerts, and community safety updates.
- Local Courier & Rapid Community Delivery Network: Hyper-local courier delivery matching residents with local couriers for same-day local store deliveries, click & collect, and community drop-offs.
- Civic Petitions, Citizen Polls & Grassroots Democracy: Active petitions, community polls, participatory budgeting, and transparent consultation channels giving every resident a direct voice in local governance.
- Lost & Found Pet & Property Network: Real-time broadcast network with photo identification to quickly reunite families with lost pets, keys, and valuable belongings.
- Community Leadership & Civic Stewardship: Empowering local champions to run hubs, manage moderation, and foster strong neighborhood bonds.
- Forum, Events, Festivals & Tourism: Authentic local discussions, community calendars, grassroots reporting, verified local journalism, and stay-local tourism.
- Time Waisters Community Arcade & Brain Games: A rich suite of 21+ built-in instant browser games (Sudoku, Solitaire, Word Guess/Wordle, Snake, Minesweeper, Trivia, 2048, Checkers, Battleship, Town Hopper, UK Driver Rank, FreeCell, Connect Four, etc.) providing ad-free, family-friendly brain training, casual entertainment for commuters and transit riders, and community leisure without requiring downloads, sign-ups, or invasive tracking.

Commercial Model & Positioning Guidelines:
- When targeting Casual Gamers, Commuters & Families: Emphasize instant, frictionless fun, 21+ games with zero downloads or pop-up ads, brain-sharpening daily puzzles, and a friendly community entertainment escape.
- When targeting Community Leaders, Gala Committees & Treasurers: Emphasize zero-equipment cost (works on any phone/tablet), 0% platform fee on donations/events, immediate Stripe destination payouts, transparent audit ledgers, and the 70% recurring revenue share from business listings that directly funds parish and council projects.
- When targeting Local Businesses & Merchants: Emphasize local wealth retention — unlike corporate social networks where 100% of ad spend vanishes, £14 of every £20 monthly listing goes directly into their own town's civic fund, improving footfall and funding community improvements.
- When targeting Couriers & Delivery Partners: Emphasize the 40% share of storefront subscriptions and delivery earnings with 0% platform markup on checkout delivery fees.

Respond ONLY with valid JSON in this exact structure without markdown formatting or code fences:
{
  "headline": "A catchy, high-impact headline",
  "body": "Professional, persuasive body text in clean HTML using <p>, <strong>, <ul>, <li> tags.",
  "socialMediaPost": "Short punchy social media snippet with 2-4 strategic hashtags"
}

Requirements for Generated Content:
1. Headline: High-impact, catchy, and professional (no generic fluff).
2. Body Text: Persuasive, clear, and structured in clean HTML (use <p>, <strong>, and <ul>/<li> where beneficial). Highlight real-world benefits for the specific audience.
3. Social Media Post: Punchy, shareable copy with 2-4 strategic hashtags.`;

  const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-flash-latest'];
  let lastError = '';

  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        lastError = errData?.error?.message || `Google API returned status ${response.status}`;
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        headline: parsed.headline || `Empowering Communities: ${input.feature}`,
        body: parsed.body || `<p>Discover the power of <strong>${input.feature}</strong> for <strong>${input.audience}</strong> on Community Hub.</p>`,
        socialMediaPost: parsed.socialMediaPost || `#CommunityHub #${input.feature.replace(/\s+/g, '')}`
      };
    } catch (e: any) {
      lastError = e?.message || String(e);
    }
  }

  throw new Error(lastError || "Could not generate marketing copy with available Gemini models.");
}

/**
 * Next.js Server Action to generate marketing copy with automatic fallback.
 */
export async function generateMarketingCopy(
  prevState: any,
  formData: FormData
): Promise<GenerateMarketingCopyOutput & { success: boolean; error?: string }> {
  const audience = (formData.get('audience') as string) || '';
  const feature = (formData.get('feature') as string) || '';
  const customNotes = (formData.get('customNotes') as string) || '';

  if (!audience.trim() || !feature.trim()) {
    return {
      ...prevState,
      success: false,
      error: "Input Error: Both audience and feature selection are required."
    };
  }

  // 1. First Attempt: Genkit Flow
  try {
    const output = await generateMarketingCopyFlow({ audience, feature, customNotes });
    if (output && output.headline) {
      return { ...output, success: true };
    }
  } catch (genkitErr: any) {
    console.warn("Genkit flow failed, engaging Direct REST API fallback:", genkitErr.message || genkitErr);
  }

  // 2. Second Attempt: Direct Gemini REST API Fallback
  try {
    const apiKey = await resolveGeminiApiKey();
    if (!apiKey) {
      return {
        ...prevState,
        success: false,
        error: "AI Configuration Required: No Gemini API Key found in the live server environment. Please ensure GOOGLE_GENAI_API_KEY or GEMINI_API_KEY is configured in your hosting environment variables."
      };
    }

    const output = await generateMarketingCopyDirectRest({ audience, feature, customNotes }, apiKey);
    return { ...output, success: true };
  } catch (restErr: any) {
    console.error("Direct Gemini REST Error:", restErr);
    const msg = restErr.message || "An unexpected error occurred during generation.";
    
    return {
      ...prevState,
      success: false,
      error: `Gemini API Error: ${msg}`
    };
  }
}
