import config from '../config/env.js';

// Single reusable HTML wrapper every transactional email renders inside —
// keeps every email on-brand and means a visual tweak (logo, colors) is a
// one-file change instead of hunting through every template.
export const emailLayout = ({ title, preheader = '', bodyHtml, ctaText, ctaUrl }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f6f6;font-family:Helvetica,Arial,sans-serif;">
  <span style="display:none;font-size:1px;color:#f6f6f6;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f6;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:#111111;padding:20px 32px;">
              <span style="color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:0.5px;">${config.email.fromName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#333333;font-size:15px;line-height:1.6;">
              ${bodyHtml}
              ${
                ctaUrl
                  ? `<div style="margin-top:28px;">
                      <a href="${ctaUrl}" style="background:#111111;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:4px;display:inline-block;font-size:14px;">${ctaText || 'View Details'}</a>
                    </div>`
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#fafafa;color:#999999;font-size:12px;">
              This is an automated message from ${config.email.fromName}. If you didn't expect this email, you can safely ignore it.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export default emailLayout;
