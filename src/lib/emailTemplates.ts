/**
 * Branded email templates for Your Wellbeing Center.
 *
 * Style notes:
 *  - Healing Teal #1BB0CE on warm sand #FBF7F0, matching the mobile app.
 *  - Inter-style sans-serif fallback stack (Google Fonts not loaded server-side).
 *  - Single-column, max-width 560px — renders identically in Gmail, Outlook,
 *    Apple Mail. No background images, no JS, no remote fonts that block.
 *  - Tone: trauma-informed — soft, never urgent or alarming.
 */

const COLORS = {
  brand: '#1BB0CE',
  brandDeep: '#137F94',
  ink: '#1A2530',
  inkSoft: '#3D4A57',
  inkMuted: '#6B7884',
  surface: '#FFFFFF',
  page: '#FBF7F0',
  divider: '#EEF2F5',
};

function layout({
  preheader,
  bodyHtml,
}: {
  /** Hidden preview text that previews surface above the open. */
  preheader: string;
  /** Inner HTML for the card. */
  bodyHtml: string;
}): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>Your Wellbeing Center</title>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:${COLORS.ink};-webkit-text-size-adjust:100%;">
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${COLORS.page};">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.page};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:${COLORS.surface};border-radius:24px;overflow:hidden;box-shadow:0 8px 24px rgba(26,37,48,0.06);">
            <!-- Brand band -->
            <tr>
              <td style="background:linear-gradient(135deg, ${COLORS.brand} 0%, ${COLORS.brandDeep} 100%);padding:28px 32px;">
                <div style="font-size:11px;letter-spacing:2px;color:rgba(255,255,255,0.85);text-transform:uppercase;font-weight:600;">Ubuzima Bwuzuye</div>
                <div style="font-family:Georgia,'Times New Roman',serif;color:#FFFFFF;font-size:22px;line-height:1.2;margin-top:6px;">Your Wellbeing Center</div>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                ${bodyHtml}
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background:${COLORS.page};padding:20px 32px;border-top:1px solid ${COLORS.divider};">
                <div style="font-size:12px;color:${COLORS.inkMuted};line-height:1.6;">
                  You are receiving this because you have an account with Your Wellbeing Center.
                  If this email arrived by surprise, you can quietly ignore it — nothing will change.
                </div>
                <div style="font-size:12px;color:${COLORS.inkMuted};margin-top:10px;">
                  &copy; ${new Date().getFullYear()} Your Wellbeing Center · Kigali, Rwanda
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function codeBlock(code: string): string {
  return `<div style="margin:24px 0;background:${COLORS.page};border:1px dashed ${COLORS.brand};border-radius:16px;padding:22px;text-align:center;">
    <div style="font-size:11px;letter-spacing:2px;color:${COLORS.brandDeep};text-transform:uppercase;font-weight:600;margin-bottom:8px;">Your code</div>
    <div style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:34px;letter-spacing:8px;color:${COLORS.ink};font-weight:700;">${escapeHtml(code)}</div>
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ───────── Templates ─────────

export function welcomeAndVerifyTemplate(args: {
  fullName: string;
  code: string;
  ttlMinutes: number;
}): { subject: string; html: string; text: string } {
  const firstName = args.fullName.trim().split(/\s+/)[0] || 'there';
  const subject = `Welcome, ${firstName} — a small code to confirm your email`;
  const html = layout({
    preheader: `Your verification code is ${args.code}. It is valid for ${args.ttlMinutes} minutes.`,
    bodyHtml: `
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:${COLORS.ink};margin:0 0 12px;font-weight:500;">Welcome, ${escapeHtml(firstName)}.</h1>
      <p style="font-size:15px;line-height:1.6;color:${COLORS.inkSoft};margin:0 0 8px;">We are gentle to have you here. Use the code below to confirm your email and unlock your full home.</p>
      ${codeBlock(args.code)}
      <p style="font-size:13px;line-height:1.6;color:${COLORS.inkMuted};margin:8px 0 0;">This code is valid for <strong style="color:${COLORS.ink};">${args.ttlMinutes} minutes</strong>. If it expires, you can quietly ask for a new one inside the app.</p>
      <p style="font-size:13px;line-height:1.6;color:${COLORS.inkMuted};margin:20px 0 0;">If you did not create an account, no further action is needed. We will keep things still and safe on our side.</p>
      <p style="font-size:13px;line-height:1.6;color:${COLORS.inkMuted};margin:20px 0 0;font-style:italic;">"Convince yourself every day that you are worthy of a good life." — Dr. Brave Olivier</p>
    `,
  });
  const text = `Welcome, ${firstName}.

Your verification code is: ${args.code}
It is valid for ${args.ttlMinutes} minutes.

If you did not create an account, you can ignore this email.

— Your Wellbeing Center`;
  return { subject, html, text };
}

export function passwordResetTemplate(args: {
  fullName: string;
  code: string;
  ttlMinutes: number;
}): { subject: string; html: string; text: string } {
  const firstName = args.fullName.trim().split(/\s+/)[0] || 'there';
  const subject = 'A gentle code to reset your password';
  const html = layout({
    preheader: `Your password reset code is ${args.code}. It is valid for ${args.ttlMinutes} minutes.`,
    bodyHtml: `
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:${COLORS.ink};margin:0 0 12px;font-weight:500;">Hello ${escapeHtml(firstName)},</h1>
      <p style="font-size:15px;line-height:1.6;color:${COLORS.inkSoft};margin:0 0 8px;">We received a request to reset your password. Use the code below to choose a new one — at your own pace.</p>
      ${codeBlock(args.code)}
      <p style="font-size:13px;line-height:1.6;color:${COLORS.inkMuted};margin:8px 0 0;">This code is valid for <strong style="color:${COLORS.ink};">${args.ttlMinutes} minutes</strong>.</p>
      <p style="font-size:13px;line-height:1.6;color:${COLORS.inkMuted};margin:20px 0 0;">If you did not ask to reset your password, you can ignore this email. Your account stays exactly as it was.</p>
    `,
  });
  const text = `Hello ${firstName},

Your password reset code is: ${args.code}
It is valid for ${args.ttlMinutes} minutes.

If you did not ask to reset your password, you can ignore this email.

— Your Wellbeing Center`;
  return { subject, html, text };
}

export function emailVerifiedTemplate(args: {
  fullName: string;
}): { subject: string; html: string; text: string } {
  const firstName = args.fullName.trim().split(/\s+/)[0] || 'there';
  const subject = 'Your email is confirmed — gentle as that';
  const html = layout({
    preheader: 'Your email has been verified. Welcome home.',
    bodyHtml: `
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:${COLORS.ink};margin:0 0 12px;font-weight:500;">You are in, ${escapeHtml(firstName)}.</h1>
      <p style="font-size:15px;line-height:1.6;color:${COLORS.inkSoft};margin:0 0 8px;">Your email is confirmed. Whenever you are ready, your home is open — daily quotes, gentle articles, group circles, and a therapist when you want one.</p>
      <p style="font-size:13px;line-height:1.6;color:${COLORS.inkMuted};margin:20px 0 0;">Move at your pace. We are here for the in-between moments too.</p>
    `,
  });
  const text = `You are in, ${firstName}.

Your email is confirmed. Whenever you are ready, your home is open.

— Your Wellbeing Center`;
  return { subject, html, text };
}
