const functions = require('firebase-functions');
const nodemailer = require('nodemailer');

const DEFAULT_SUPPORT_EMAIL = 'pderivera.student@ua.edu.ph';

let cachedTransport = null;

const getEmailConfig = () => {
  const config = (functions.config && functions.config().email) || {};
  return {
    user: config.user || process.env.EMAIL_USER || '',
    pass: config.pass || process.env.EMAIL_PASS || '',
    from: config.from || process.env.EMAIL_FROM || DEFAULT_SUPPORT_EMAIL,
    admin: config.admin || process.env.EMAIL_ADMIN || DEFAULT_SUPPORT_EMAIL
  };
};

const getTransport = () => {
  if (cachedTransport) return cachedTransport;
  const { user, pass } = getEmailConfig();

  if (!user || !pass) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Email credentials are not configured.'
    );
  }

  cachedTransport = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass
    }
  });

  return cachedTransport;
};

const sendMail = async ({ to, subject, text, replyTo }) => {
  const { from } = getEmailConfig();
  const transport = getTransport();
  await transport.sendMail({
    from,
    to,
    subject,
    text,
    replyTo
  });
};

const normalizeValue = (value) => String(value || '').trim();

exports.sendContactMessageEmail = functions.https.onCall(async (data) => {
  const name = normalizeValue(data?.name);
  const email = normalizeValue(data?.email);
  const message = normalizeValue(data?.message);

  if (!name || !email || !message) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Name, email, and message are required.'
    );
  }

  const { admin, from } = getEmailConfig();
  const timestamp = new Date().toLocaleString('en-US');

  await sendMail({
    to: admin,
    subject: `New SSITE message from ${name}`,
    replyTo: email,
    text: [
      'New contact form submission',
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      `Received: ${timestamp}`,
      '',
      'Message:',
      message
    ].join('\n')
  });

  await sendMail({
    to: email,
    subject: 'We received your message',
    replyTo: from,
    text: [
      `Hi ${name},`,
      '',
      'Thanks for contacting SSITE. We received your message and will get back to you soon.',
      '',
      'Your message:',
      message,
      '',
      `Sent from: ${email}`
    ].join('\n')
  });

  return { success: true };
});

exports.sendMessageReplyEmail = functions.https.onCall(async (data) => {
  const recipientEmail = normalizeValue(data?.recipientEmail);
  const recipientName = normalizeValue(data?.recipientName) || 'there';
  const replyText = normalizeValue(data?.replyText);
  const originalMessage = normalizeValue(data?.originalMessage);
  const adminEmail = normalizeValue(data?.adminEmail) || getEmailConfig().from;

  if (!recipientEmail || !replyText) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Recipient email and reply text are required.'
    );
  }

  const bodyLines = [
    `Hi ${recipientName},`,
    '',
    'Here is the reply to your SSITE message:',
    '',
    replyText,
    ''
  ];

  if (originalMessage) {
    bodyLines.push('Your original message:', originalMessage, '');
  }

  bodyLines.push(`Replied by: ${adminEmail}`);

  await sendMail({
    to: recipientEmail,
    subject: 'SSITE replied to your message',
    replyTo: adminEmail,
    text: bodyLines.join('\n')
  });

  return { success: true };
});
