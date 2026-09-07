
'use server';
/**
 * @fileOverview A text-to-speech AI flow.
 *
 * - ttsFlow - A function that converts text to speech audio.
 * - AudioRequest - The input type for the ttsFlow function.
 * - AudioResponse - The return type for the ttsFlow function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import wav from 'wav';

const AudioRequestSchema = z.object({
  text: z.string(),
  voice: z.string(),
});
export type AudioRequest = z.infer<typeof AudioRequestSchema>;

const AudioResponseSchema = z.object({
  media: z.string(),
});
export type AudioResponse = z.infer<typeof AudioResponseSchema>;


async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: any[] = [];
    writer.on('error', reject);
    writer.on('data', (d) => bufs.push(d));
    writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));

    writer.write(pcmData);
    writer.end();
  });
}

const ttsFlowInternal = ai.defineFlow(
  {
    name: 'ttsFlow',
    inputSchema: AudioRequestSchema,
    outputSchema: AudioResponseSchema,
  },
  async ({ text, voice }) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || 'Kore' },
          },
        },
      },
      prompt: `Say clearly in a friendly, professional voice: ${text}`,
    });

    if (!media) {
      throw new Error('No audio media returned from the model.');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    
    const wavBase64 = await toWav(audioBuffer);

    return {
      media: `data:audio/wav;base64,${wavBase64}`,
    };
  }
);

export async function ttsFlow(input: AudioRequest): Promise<AudioResponse> {
    return ttsFlowInternal(input);
}
