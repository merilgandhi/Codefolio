import { isContactEmail } from '../../shared/contact.js';

const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );

export function renderContactEmail({ owner, contact }) {
  const ownerName = owner.profile?.name || owner.username;
  const name = escapeHtml(contact.name);
  const email = escapeHtml(contact.email);
  const subject = escapeHtml(contact.subject);
  const username = escapeHtml(owner.username);
  const initials = escapeHtml(
    contact.name
      .trim()
      .split(/\s+/u)
      .slice(0, 2)
      .map((word) => Array.from(word)[0])
      .join('')
      .toUpperCase(),
  );
  const replyUrl = isContactEmail(contact.email)
    ? `mailto:${encodeURIComponent(contact.email)}?subject=${encodeURIComponent(`Re: ${contact.subject}`)}`
    : null;
  const safeReplyUrl = escapeHtml(replyUrl);
  const paragraphs = String(contact.message)
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/u)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:27px;color:#393344;word-wrap:break-word;overflow-wrap:anywhere;">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`,
    )
    .join('');
  const text = `New message for ${ownerName} (@${owner.username})\n\nSubject: ${contact.subject}\nFrom: ${contact.name}\nReply email: ${contact.email}\n\n${contact.message}\n\nReply directly to this email to continue the conversation.\nSent through your CodeFolio portfolio. Contact details were supplied by the visitor.`;
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>New portfolio enquiry | CodeFolio</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0; mso-table-rspace:0; }
    table { border-collapse:separate; }
    a { color:#6d51b5; }
    @media screen and (max-width:480px) {
      .email-outer { padding:20px 10px !important; }
      .email-content { padding:28px 22px !important; }
      .email-heading { font-size:26px !important; line-height:34px !important; }
      .email-message { padding:22px 18px 6px !important; }
      .email-brand-note { display:none !important; }
      .email-button { display:block !important; text-align:center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:#f4f2f7;font-family:Arial,Helvetica,sans-serif;color:#292633;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;font-size:1px;line-height:1px;">A new message from ${name} through your CodeFolio portfolio.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f2f7" style="width:100%;background-color:#f4f2f7;">
    <tr><td align="center" class="email-outer" style="padding:40px 16px;">
      <!--[if mso]><table role="presentation" width="640" align="center"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;margin:0 auto;table-layout:fixed;">
        <tr><td style="padding:0 4px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td width="46" valign="middle"><div style="width:36px;height:36px;border-radius:10px;background-color:#6d51b5;color:#ffffff;text-align:center;font-family:Consolas,monospace;font-size:16px;font-weight:bold;line-height:36px;">&lt;/&gt;</div></td>
            <td valign="middle" style="font-size:22px;line-height:30px;font-weight:700;letter-spacing:-.8px;color:#292633;">CodeFolio<span style="color:#7357b9;">.</span></td>
            <td align="right" class="email-brand-note" style="font-size:10px;line-height:18px;font-weight:700;letter-spacing:1.5px;color:#716a7b;">PORTFOLIO INBOX</td>
          </tr></table>
        </td></tr>
        <tr><td bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid #e3dfe9;border-radius:20px;overflow:hidden;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;table-layout:fixed;">
            <tr><td height="4" bgcolor="#9f83cf" style="height:4px;background-color:#9f83cf;font-size:1px;line-height:4px;border-radius:20px 20px 0 0;">&nbsp;</td></tr>
            <tr><td class="email-content" style="padding:36px 40px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#f0ebf8" style="padding:7px 10px;border-radius:6px;background-color:#f0ebf8;color:#62459d;font-size:10px;line-height:16px;font-weight:700;letter-spacing:1.3px;">NEW PORTFOLIO ENQUIRY</td></tr></table>
              <h1 class="email-heading" style="margin:22px 0 14px;font-size:32px;line-height:40px;font-weight:700;letter-spacing:-.8px;color:#292633;word-wrap:break-word;overflow-wrap:anywhere;">${subject}</h1>
              <p style="margin:0;font-size:15px;line-height:25px;color:#6b6577;">Hi ${escapeHtml(ownerName)},<br>Someone reached out through your portfolio. Here’s their message.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:28px 0 24px;table-layout:fixed;"><tr>
                <td width="58" valign="middle"><div style="width:44px;height:44px;border-radius:50%;background-color:#eae3f6;color:#62459d;font-size:14px;font-weight:700;line-height:44px;text-align:center;">${initials}</div></td>
                <td valign="middle" style="word-wrap:break-word;overflow-wrap:anywhere;">
                  <p style="margin:0 0 4px;color:#292633;font-size:15px;line-height:21px;font-weight:700;">${name}</p>
                  <p style="margin:0;color:#6b6577;font-size:13px;line-height:20px;">${replyUrl ? `<a href="${safeReplyUrl}" style="color:#6d51b5;text-decoration:none;word-break:break-all;">${email}</a>` : email}</p>
                </td>
              </tr></table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;table-layout:fixed;"><tr>
                <td class="email-message" bgcolor="#f7f5fa" style="padding:24px 24px 8px;background-color:#f7f5fa;border:1px solid #eae5f0;border-left:3px solid #b49bdb;border-radius:12px;word-wrap:break-word;overflow-wrap:anywhere;">
                  <p style="margin:0 0 16px;color:#716a7b;font-size:10px;line-height:16px;font-weight:700;letter-spacing:1.4px;">THE MESSAGE</p>
                  ${paragraphs}
                </td>
              </tr></table>
              ${replyUrl ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;"><tr><td bgcolor="#6d51b5" align="center" style="background-color:#6d51b5;border:1px solid #6d51b5;border-radius:9px;mso-padding-alt:14px 24px;"><a href="${safeReplyUrl}" class="email-button" style="display:inline-block;padding:14px 24px;border-radius:9px;color:#ffffff;text-decoration:none;font-size:14px;line-height:20px;font-weight:700;">Reply to enquiry&nbsp; &rarr;</a></td></tr></table>` : ''}
              <p style="margin:12px 0 0;color:#716a7b;font-size:12px;line-height:20px;">You can also use your email app’s Reply button.</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:28px;"><tr><td style="padding-top:22px;border-top:1px solid #eae7ee;">
                <p style="margin:0;color:#6b6577;font-size:11px;line-height:19px;">Sent through <strong style="color:#4f485d;">@${username}</strong>’s CodeFolio portfolio.</p>
                <p style="margin:4px 0 0;color:#716a7b;font-size:11px;line-height:19px;">Contact details were supplied by the visitor.</p>
              </td></tr></table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:22px 16px 0;color:#716a7b;font-size:11px;line-height:20px;">CodeFolio &middot; Built for developers.</td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`;
  return { html, text };
}
