type EmailLayoutOptions = {
  preheader: string;
  title: string;
  greeting: string;
  body: string;
  action?: { label: string; url: string };
  footerNote?: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] ?? character);
}

export function emailLayout(options: EmailLayoutOptions) {
  const action = options.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px"><tr><td style="border-radius:10px;background:#2563eb"><a href="${escapeHtml(options.action.url)}" style="display:inline-block;padding:14px 22px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">${escapeHtml(options.action.label)}</a></td></tr></table>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(options.title)}</title></head>
  <body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#172033">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(options.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
          <tr><td style="background:#0f3d91;padding:24px 32px"><span style="color:#ffffff;font-size:21px;font-weight:800;letter-spacing:-.3px">DaraLearn</span><span style="display:block;margin-top:5px;color:#bfdbfe;font-size:12px">Learn with confidence</span></td></tr>
          <tr><td style="padding:36px 32px 32px"><h1 style="margin:0;color:#0f172a;font-size:25px;line-height:1.25">${escapeHtml(options.title)}</h1><p style="margin:22px 0 0;color:#334155;font-size:16px;line-height:1.6">${escapeHtml(options.greeting)}</p><div style="margin-top:16px;color:#475569;font-size:15px;line-height:1.7">${options.body}</div>${action}${options.footerNote ? `<p style="margin:26px 0 0;color:#64748b;font-size:13px;line-height:1.6">${escapeHtml(options.footerNote)}</p>` : ''}</td></tr>
          <tr><td style="border-top:1px solid #e2e8f0;background:#f8fafc;padding:22px 32px"><p style="margin:0;color:#0f3d91;font-size:13px;font-weight:700">DaraLearn</p><p style="margin:6px 0 0;color:#64748b;font-size:12px;line-height:1.6">A thoughtful place to learn, teach, and make progress.</p><p style="margin:12px 0 0;color:#94a3b8;font-size:11px;line-height:1.5">You are receiving this email because of activity on your DaraLearn account. Please do not reply to this automated message.</p></td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function verificationEmail(code: string) {
  return emailLayout({
    preheader: 'Your DaraLearn verification code is ready.',
    title: 'Verify your email',
    greeting: 'You are almost ready to get started.',
    body: `Use this verification code to confirm your email address:<div style="margin:24px 0;padding:18px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;text-align:center;color:#1d4ed8;font-size:30px;font-weight:800;letter-spacing:8px">${escapeHtml(code)}</div><p style="margin:0">This code expires in <strong>10 minutes</strong>.</p>`,
    footerNote: 'If you did not create a DaraLearn account, you can safely ignore this email.',
  });
}

export function passwordResetEmail(url: string) {
  return emailLayout({
    preheader: 'Reset your DaraLearn password securely.',
    title: 'Reset your password',
    greeting: 'We received a request to update your password.',
    body: 'Use the button below to choose a new password. For your security, this link expires in 30 minutes.',
    action: { label: 'Reset password', url },
    footerNote: 'If you did not request a password reset, no action is needed and your password will remain unchanged.',
  });
}
