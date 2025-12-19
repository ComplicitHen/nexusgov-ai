/**
 * Test Email Sending Script
 *
 * Usage:
 *   node scripts/test-email.js your-email@example.com
 */

require('dotenv').config({ path: '.env.local' });

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@nexusgov.ai';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'NexusGov AI';

async function testEmail(toEmail) {
  if (!SENDGRID_API_KEY) {
    console.error('❌ SENDGRID_API_KEY not found in .env.local');
    process.exit(1);
  }

  if (!toEmail) {
    console.error('❌ Usage: node scripts/test-email.js your-email@example.com');
    process.exit(1);
  }

  console.log('📧 Testing SendGrid configuration...');
  console.log(`From: ${FROM_NAME} <${FROM_EMAIL}>`);
  console.log(`To: ${toEmail}`);

  const payload = {
    personalizations: [
      {
        to: [{ email: toEmail }],
        subject: 'Test Email from NexusGov AI',
      },
    ],
    from: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    content: [
      {
        type: 'text/plain',
        value: 'This is a test email from NexusGov AI. If you received this, SendGrid is configured correctly!',
      },
      {
        type: 'text/html',
        value: `
          <html>
            <body style="font-family: sans-serif; padding: 40px; background-color: #f3f4f6;">
              <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px;">
                <h1 style="color: #3b82f6;">✅ SendGrid Test Successful!</h1>
                <p>This is a test email from NexusGov AI.</p>
                <p>If you received this, your SendGrid configuration is working correctly.</p>
                <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 14px;">
                  Configuration:<br>
                  From: ${FROM_NAME} &lt;${FROM_EMAIL}&gt;<br>
                  API Key: ${SENDGRID_API_KEY.substring(0, 10)}...
                </p>
              </div>
            </body>
          </html>
        `,
      },
    ],
  };

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log('✅ Email sent successfully!');
      console.log('📬 Check your inbox (and spam folder)');
      console.log('');
      console.log('Next steps:');
      console.log('1. Check if you received the email');
      console.log('2. If not in inbox, check spam folder');
      console.log('3. Verify domain authentication in SendGrid dashboard');
      console.log('4. Test user invitations at /admin/users/invite');
    } else {
      const error = await response.text();
      console.error('❌ SendGrid API error:', response.status);
      console.error(error);

      if (response.status === 403) {
        console.log('');
        console.log('💡 Common fixes for 403 Forbidden:');
        console.log('1. Verify sender email in SendGrid (Single Sender Verification)');
        console.log('2. Complete domain authentication');
        console.log('3. Check API key has Mail Send permission');
      }
    }
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
  }
}

const toEmail = process.argv[2];
testEmail(toEmail);
