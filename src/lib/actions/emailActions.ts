'use server';

import { initializeAdminApp } from '@/firebase/admin-app';

type ActionResponse = {
  success: boolean;
  error?: string;
};

interface EmailRecipient {
  email: string;
  name?: string;
}

interface EmailParams {
  to: EmailRecipient[];
  bcc?: EmailRecipient[]; // Added support for BCC
  subject: string;
  htmlContent: string;
}

let cachedBrevoConfig: { apiKey: string; senderEmail: string } | null = null;

async function getBrevoConfig(): Promise<{ apiKey: string; senderEmail: string } | null> {
  const envKey = process.env.BREVO_API_KEY;
  const envSender = process.env.BREVO_SENDER_EMAIL || 'info@my-community-hub.co.uk';
  if (envKey) {
    return { apiKey: envKey, senderEmail: envSender };
  }

  if (cachedBrevoConfig) {
    return cachedBrevoConfig;
  }

  try {
    const { firestore } = initializeAdminApp();
    const doc = await firestore.collection('platform_settings').doc('brevo').get();
    if (doc.exists) {
      const data = doc.data();
      if (data?.apiKey) {
        cachedBrevoConfig = {
          apiKey: data.apiKey,
          senderEmail: data.senderEmail || envSender,
        };
        return cachedBrevoConfig;
      }
    }
  } catch (err) {
    console.error('Failed to load Brevo config from platform_settings/brevo:', err);
  }

  return null;
}

export async function sendEmail(params: EmailParams): Promise<ActionResponse> {
  const { to, bcc, subject, htmlContent } = params;

  const config = await getBrevoConfig();
  if (!config?.apiKey) {
    console.error('Brevo API key is not configured.');
    return { success: false, error: 'Email service is not configured on the server.' };
  }

  const sender = {
    email: config.senderEmail,
    name: 'Community Hub',
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': config.apiKey,
      },
      body: JSON.stringify({
        sender,
        to: to && to.length > 0 ? to : [{ email: sender.email, name: sender.name }],
        ...(bcc && bcc.length > 0 ? { bcc } : {}),
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Brevo API Error:', errorData);
      throw new Error(`Brevo API Error: ${errorData.message || response.statusText}`);
    }
    
    const responseData = await response.json();
    console.log("Email sent successfully via Brevo. Message ID:", responseData.messageId);
    return { success: true };

  } catch (error: any) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message };
  }
}
