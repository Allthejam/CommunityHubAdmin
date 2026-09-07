'use server';

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

export async function sendEmail(params: EmailParams): Promise<ActionResponse> {
  const { to, bcc, subject, htmlContent } = params;

  if (!process.env.BREVO_API_KEY) {
    console.error('Brevo API key is not configured.');
    return { success: false, error: 'Email service is not configured on the server.' };
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!senderEmail) {
    console.error('Brevo sender email is not configured.');
    return { success: false, error: 'Email service sender is not configured.' };
  }

  const sender = {
    email: senderEmail,
    name: 'Community Hub',
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender,
        to,
        bcc, // Pass BCC recipients to the API
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
