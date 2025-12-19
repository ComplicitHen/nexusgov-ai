/**
 * Email Service using SendGrid
 * Handles sending invitation emails and other notifications
 */

interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
  textContent: string;
}

/**
 * Send an email via SendGrid
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@nexusgov.ai';
  const fromName = process.env.SENDGRID_FROM_NAME || 'NexusGov AI';

  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY is not configured');
  }

  const payload = {
    personalizations: [
      {
        to: [{ email: params.to }],
        subject: params.subject,
      },
    ],
    from: {
      email: fromEmail,
      name: fromName,
    },
    content: [
      {
        type: 'text/plain',
        value: params.textContent,
      },
      {
        type: 'text/html',
        value: params.htmlContent,
      },
    ],
  };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid API error: ${response.status} - ${error}`);
  }

  console.log(`[Email] Sent to ${params.to}: ${params.subject}`);
}

/**
 * Send user invitation email
 */
export async function sendInvitationEmail(
  email: string,
  inviteUrl: string,
  organizationName: string,
  role: string,
  tokenLimit?: number,
  budgetLimit?: number
): Promise<void> {
  const roleLabels: Record<string, string> = {
    USER: 'Användare',
    UNIT_ADMIN: 'Enhetadministratör',
    ORG_ADMIN: 'Organisationsadministratör',
    DPO: 'Dataskyddsombud (DPO)',
    SUPER_ADMIN: 'Superadministratör',
  };

  const roleName = roleLabels[role] || role;

  const subject = `Inbjudan till NexusGov AI - ${organizationName}`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inbjudan till NexusGov AI</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                NexusGov AI
              </h1>
              <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px;">
                GDPR-kompatibel AI-portal för svenska myndigheter
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 600;">
                Du har blivit inbjuden!
              </h2>

              <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 24px;">
                Du har blivit inbjuden att gå med i <strong style="color: #111827;">${organizationName}</strong> på NexusGov AI.
              </p>

              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">Organisation:</span>
                          <strong style="color: #111827; font-size: 14px; margin-left: 8px;">${organizationName}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">Roll:</span>
                          <strong style="color: #111827; font-size: 14px; margin-left: 8px;">${roleName}</strong>
                        </td>
                      </tr>
                      ${
                        tokenLimit
                          ? `
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">Tokengräns:</span>
                          <strong style="color: #111827; font-size: 14px; margin-left: 8px;">${tokenLimit.toLocaleString('sv-SE')} tokens/månad</strong>
                        </td>
                      </tr>
                      `
                          : ''
                      }
                      ${
                        budgetLimit
                          ? `
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">Budget:</span>
                          <strong style="color: #111827; font-size: 14px; margin-left: 8px;">${budgetLimit.toLocaleString('sv-SE')} SEK/månad</strong>
                        </td>
                      </tr>
                      `
                          : ''
                      }
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      Acceptera inbjudan
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px; line-height: 20px;">
                Eller kopiera och klistra in denna länk i din webbläsare:
              </p>
              <p style="margin: 0 0 24px 0; color: #3b82f6; font-size: 14px; word-break: break-all;">
                ${inviteUrl}
              </p>

              <!-- Warning -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <tr>
                  <td style="padding: 16px;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                      ⚠️ <strong>Denna inbjudan går ut om 7 dagar.</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-align: center;">
                Om du inte förväntade dig denna inbjudan kan du ignorera detta meddelande.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} NexusGov AI. Alla rättigheter förbehållna.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textContent = `
NexusGov AI - Inbjudan

Du har blivit inbjuden att gå med i ${organizationName} på NexusGov AI.

Organisation: ${organizationName}
Roll: ${roleName}
${tokenLimit ? `Tokengräns: ${tokenLimit.toLocaleString('sv-SE')} tokens/månad` : ''}
${budgetLimit ? `Budget: ${budgetLimit.toLocaleString('sv-SE')} SEK/månad` : ''}

Acceptera inbjudan genom att besöka:
${inviteUrl}

⚠️ Denna inbjudan går ut om 7 dagar.

Om du inte förväntade dig denna inbjudan kan du ignorera detta meddelande.

© ${new Date().getFullYear()} NexusGov AI
  `;

  await sendEmail({
    to: email,
    subject,
    htmlContent,
    textContent,
  });
}

/**
 * Send budget alert email to admins
 */
export async function sendBudgetAlertEmail(
  adminEmail: string,
  organizationName: string,
  currentSpend: number,
  limit: number,
  threshold: number
): Promise<void> {
  const percentUsed = (currentSpend / limit) * 100;

  const subject = `⚠️ Budgetvarning - ${organizationName} har nått ${threshold}% av budget`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
          <tr>
            <td style="background-color: #dc2626; padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px;">⚠️ Budgetvarning</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px 0; color: #111827; font-size: 16px;">
                <strong>${organizationName}</strong> har använt <strong>${percentUsed.toFixed(1)}%</strong> av månadsbudgeten.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-radius: 6px; padding: 20px; margin: 20px 0;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Förbrukat:</p>
                    <p style="margin: 0 0 16px 0; color: #111827; font-size: 24px; font-weight: 600;">${currentSpend.toFixed(2)} SEK</p>
                    <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">Gräns:</p>
                    <p style="margin: 0; color: #111827; font-size: 24px; font-weight: 600;">${limit.toFixed(2)} SEK</p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                Logga in på NexusGov AI för att se detaljerad användning och justera inställningar.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textContent = `
⚠️ Budgetvarning - NexusGov AI

${organizationName} har använt ${percentUsed.toFixed(1)}% av månadsbudgeten.

Förbrukat: ${currentSpend.toFixed(2)} SEK
Gräns: ${limit.toFixed(2)} SEK

Logga in på NexusGov AI för att se detaljerad användning.
  `;

  await sendEmail({
    to: adminEmail,
    subject,
    htmlContent,
    textContent,
  });
}
