type BugNotificationProps = {
  bugId: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  reportedBy: string;
  assignedTo?: string;
  bugUrl: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });
}

export function bugNotificationTemplate(bug: BugNotificationProps) {
  const e = escapeHtml;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#202124;line-height:1.65;">
  <div style="margin:0 0 24px;padding-bottom:14px;border-bottom:1px solid #ddd;">
    <strong style="font-size:21px;">BugTracker</strong><br />
    <span style="font-size:13px;color:#5f6368;">Issue Notification</span>
  </div>

  <p style="margin:0 0 20px;font-size:15px;">
  <strong style="font-size:20px;">A new issue has been reported.</strong><br />
  Halo Developer, terdapat bug baru yang membutuhkan perhatian dan tindak lanjut dari tim.</p>
  <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;line-height:1.65;font-size:15px;">
    <tr>
      <td style="padding:6px 14px 6px 0;vertical-align:top;white-space:nowrap;"><strong>ID Ticket:</strong></td>
      <td style="padding:4px 0;vertical-align:top;">${e(bug.bugId)}</td>
    </tr>
    <tr>
      <td style="padding:6px 14px 6px 0;vertical-align:top;white-space:nowrap;"><strong>Title:</strong></td>
      <td style="padding:6px 0;vertical-align:top;">${e(bug.title)}</td>
    </tr>
    <tr>
      <td style="padding:6px 14px 6px 0;vertical-align:top;white-space:nowrap;"><strong>Deskripsi:</strong></td>
      <td style="padding:6px 0;vertical-align:top;">${e(bug.description).replace(/\r?\n/g, "<br />")}</td>
    </tr>
  </table>
  <p><a href="${e(bug.bugUrl)}">Lihat detail issue</a></p>
  <p>Regards,<br />Tim Bug Tracker - System</p>

  <div style="margin-top:32px;padding-top:12px;border-top:1px solid #ddd;font-size:13px;color:#555;">
    Email otomatis dari BugTracker. Mohon tidak membalas email ini.
  </div>
</body>
</html>`;
}
