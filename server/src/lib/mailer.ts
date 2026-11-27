import { config } from '../config';

export type MailResult = 'sent' | 'not_configured' | 'failed';

/**
 * Sends the contact notification through Resend when RESEND_API_KEY and
 * CONTACT_NOTIFICATION_EMAIL are configured. Without credentials the message
 * is still persisted and flagged as `not_configured` — the API never pretends
 * an email was delivered.
 */
export async function sendContactNotification(payload: {
  name: string;
  email: string;
  subject?: string | null;
  message: string;
}): Promise<MailResult> {
  if (!config.resendApiKey || !config.contactEmail) return 'not_configured';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.mailFrom,
        to: [config.contactEmail],
        reply_to: payload.email,
        subject: `New portfolio message — ${payload.subject ?? payload.name}`,
        text: `${payload.name} <${payload.email}>\n\n${payload.message}`,
      }),
    });
    return response.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
}
