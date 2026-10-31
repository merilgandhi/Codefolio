const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );

export function renderPasswordResetEmail({ resetUrl, expiresInMinutes = 30 }) {
  const safeUrl = escapeHtml(resetUrl);
  const text = `Reset your CodeFolio password\n\nUse this secure link to choose a new password. It expires in ${expiresInMinutes} minutes and can only be used once:\n${resetUrl}\n\nIf you did not request this change, you can ignore this email. Your password will not change.`;
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Reset your CodeFolio password</title></head>
<body style="margin:0;padding:32px 12px;background:#f4f2f7;color:#292633;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;border:1px solid #e3dfe9;border-radius:18px;background:#fff;">
    <tr><td style="height:4px;border-radius:18px 18px 0 0;background:#9f83cf;font-size:0;">&nbsp;</td></tr>
    <tr><td style="padding:32px 36px 36px;">
      <p style="margin:0 0 24px;color:#292633;font-size:21px;font-weight:700;letter-spacing:-.5px;">CodeFolio<span style="color:#7357b9;">.</span></p>
      <p style="margin:0 0 10px;color:#62459d;font-size:10px;font-weight:700;letter-spacing:1.5px;">ACCOUNT SECURITY</p>
      <h1 style="margin:0 0 14px;color:#292633;font-size:28px;line-height:1.25;letter-spacing:-.6px;">Reset your password</h1>
      <p style="margin:0;color:#6b6577;font-size:15px;line-height:25px;">We received a request to reset the password for your CodeFolio account. Choose a new password using the button below.</p>
      <p style="margin:28px 0;"><a href="${safeUrl}" style="display:inline-block;padding:14px 22px;border-radius:9px;background:#6d51b5;color:#fff;text-decoration:none;font-size:14px;font-weight:700;">Choose a new password&nbsp; →</a></p>
      <p style="margin:0 0 12px;color:#6b6577;font-size:13px;line-height:22px;">This link expires in ${expiresInMinutes} minutes and works once. If the button does not work, copy this address into your browser:</p>
      <p style="margin:0 0 24px;overflow-wrap:anywhere;font-size:12px;line-height:20px;"><a href="${safeUrl}" style="color:#62459d;">${safeUrl}</a></p>
      <p style="margin:0;padding-top:20px;border-top:1px solid #eae7ee;color:#716a7b;font-size:12px;line-height:20px;">If you did not request a password reset, ignore this email. Your password will stay the same.</p>
    </td></tr>
  </table>
  <p style="margin:18px auto 0;text-align:center;color:#716a7b;font-size:11px;line-height:18px;">CodeFolio · Built for developers.</p>
</body></html>`;
  return { html, text };
}
