import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { config } from '../config/environment';

const sesRegion = config.email.region;
const defaultFromAddress = config.email.fromAddress;

const sesClient = new SESv2Client({ region: sesRegion });

export interface SendEmailParams {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  from?: string;
}

export async function sendEmail({ to, subject, bodyText, bodyHtml, from }: SendEmailParams): Promise<void> {
  if (!to) {
    throw new Error('Recipient email is required');
  }

  const source = from || defaultFromAddress;

  if (!source) {
    throw new Error('SES_FROM_EMAIL is not configured');
  }

  const destination = {
    ToAddresses: [to]
  };

  const content = {
    Simple: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: bodyHtml
        ? {
            Html: { Data: bodyHtml, Charset: 'UTF-8' },
            Text: { Data: bodyText, Charset: 'UTF-8' }
          }
        : {
            Text: { Data: bodyText, Charset: 'UTF-8' }
          }
    }
  };

  const command = new SendEmailCommand({
    FromEmailAddress: source,
    Destination: destination,
    Content: content,
  });

  await sesClient.send(command);
}

export async function sendInvitationEmail(opts: {
  recipient: string;
  temporaryPassword: string;
  firstName: string;
  lastName: string;
}) {
  const { recipient, temporaryPassword, firstName, lastName } = opts;
  const subject = 'Your ClassReflect account is ready';
  const bodyText = `Hello ${firstName} ${lastName},\n\n` +
    'Your ClassReflect account has been created. You can sign in using:\n' +
    `Email: ${recipient}\n` +
    `Temporary password: ${temporaryPassword}\n\n` +
    'Please log in and update your password as soon as possible.\n\n' +
    'ClassReflect Team';

  const bodyHtml = `
    <p>Hello ${firstName} ${lastName},</p>
    <p>Your ClassReflect account has been created. You can sign in using:</p>
    <ul>
      <li><strong>Email:</strong> ${recipient}</li>
      <li><strong>Temporary password:</strong> ${temporaryPassword}</li>
    </ul>
    <p>Please log in and update your password as soon as possible.</p>
    <p>ClassReflect Team</p>
  `;

  await sendEmail({
    to: recipient,
    subject,
    bodyText,
    bodyHtml,
  });
}

export async function sendPasswordResetEmail(opts: {
  recipient: string;
  resetLink: string;
  firstName?: string;
  lastName?: string;
}) {
  const { recipient, resetLink, firstName, lastName } = opts;
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'there';
  const subject = 'Password reset instructions';

  const bodyText = `Hello ${displayName},\n\n` +
    'We received a request to reset your ClassReflect password.\n' +
    'If you made this request, please set a new password using the link below:\n\n' +
    `${resetLink}\n\n` +
    'This link will expire in 60 minutes. If you did not request a password reset, you can safely ignore this email.\n\n' +
    'ClassReflect Support';

  const bodyHtml = `
    <p>Hello ${displayName},</p>
    <p>We received a request to reset your ClassReflect password. If you made this request, click the button below within the next 60 minutes:</p>
    <p><a href="${resetLink}" style="display:inline-block;padding:12px 20px;background:#1a56db;color:#fff;text-decoration:none;border-radius:4px;">Reset Password</a></p>
    <p>If the button doesn't work, copy and paste this link into your browser:</p>
    <p><a href="${resetLink}">${resetLink}</a></p>
    <p>If you did not request a password reset, you can safely ignore this message.</p>
    <p>ClassReflect Support</p>
  `;

  await sendEmail({
    to: recipient,
    subject,
    bodyText,
    bodyHtml,
  });
}
