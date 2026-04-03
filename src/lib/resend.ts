import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const webUrl = process.env.WEB_URL || 'https://paytab-web.netlify.app';

export async function sendAuthInviteEmail({
  to,
  inviterName,
  token,
}: {
  to: string;
  inviterName: string;
  token: string;
}): Promise<void> {
  try {
    await resend.emails.send({
      from: 'PayTab <onboarding@paytab.app>',
      to,
      subject: `${inviterName} invited you to PayTab`,
      html: `
        <h2>You've been invited!</h2>
        <p><strong>${inviterName}</strong> wants to connect with you on PayTab to split expenses.</p>
        <p>Sign up now to start tracking shared expenses together.</p>
        <p><a href="${webUrl}/signup?inviteToken=${token}">Join PayTab</a></p>
      `,
    });
  } catch (err) {
    console.error('Failed to send auth invite email:', err);
  }
}

export async function sendFriendRequestEmail({
  to,
  inviterName,
  friendshipId,
}: {
  to: string;
  inviterName: string;
  friendshipId: string;
}): Promise<void> {
  try {
    await resend.emails.send({
      from: 'PayTab <onboarding@paytab.app>',
      to,
      subject: `${inviterName} wants to connect on PayTab`,
      html: `
        <h2>Friend Request</h2>
        <p><strong>${inviterName}</strong> wants to connect with you on PayTab to split expenses.</p>
        <p>Open PayTab to accept the request.</p>
        <p><a href="${webUrl}/friend-request?friendshipId=${friendshipId}">View Request</a></p>
      `,
    });
  } catch (err) {
    console.error('Failed to send friend request email:', err);
  }
}

export async function sendVerificationEmail({
  to,
  token,
}: {
  to: string;
  token: string;
}): Promise<void> {
  try {
    await resend.emails.send({
      from: 'PayTab <onboarding@paytab.app>',
      to,
      subject: 'Verify your PayTab email',
      html: `
        <h2>Welcome to PayTab!</h2>
        <p>Please verify your email address to get started.</p>
        <p><a href="${webUrl}/verify-email?token=${token}">Verify Email</a></p>
        <p>If you didn't create a PayTab account, you can safely ignore this email.</p>
      `,
    });
  } catch (err) {
    console.error('Failed to send verification email:', err);
  }
}
