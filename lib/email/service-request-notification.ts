type ServiceRequestNotification = {
  requestNumber: string;
  title: string;
  description: string;
  priority: string;
  assignedBy: string;
  assignedTo: string;
  requestUrl: string;
  discussionComment?: string;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export function serviceRequestNotificationTemplate(request: ServiceRequestNotification) {
  const e = escapeHtml;
  return `
<!DOCTYPE html>
<html><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#202124;line-height:1.65;">
  <div style="margin:0 0 24px;padding-bottom:14px;border-bottom:1px solid #ddd;"><strong style="font-size:21px;">BugTracker</strong><br /><span style="font-size:13px;color:#5f6368;">Service Request Notification</span></div>
  <p><strong style="font-size:20px;">${request.discussionComment ? "There is a new discussion comment on your service request." : "A service request has been assigned to you."}</strong><br />Hi ${e(request.assignedTo)}, ${request.discussionComment ? "a new comment was added to a request assigned to you." : "please review the request details below."}</p>
  <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;line-height:1.65;font-size:15px;">
    <tr><td style="padding:6px 14px 6px 0;vertical-align:top;white-space:nowrap;"><strong>Request:</strong></td><td style="padding:6px 0;">${e(request.requestNumber)}</td></tr>
    <tr><td style="padding:6px 14px 6px 0;vertical-align:top;white-space:nowrap;"><strong>Title:</strong></td><td style="padding:6px 0;">${e(request.title)}</td></tr>
    <tr><td style="padding:6px 14px 6px 0;vertical-align:top;white-space:nowrap;"><strong>Priority:</strong></td><td style="padding:6px 0;">${e(request.priority)}</td></tr>
    ${request.discussionComment ? `<tr><td style="padding:6px 14px 6px 0;vertical-align:top;white-space:nowrap;"><strong>Comment by:</strong></td><td style="padding:6px 0;">${e(request.assignedBy)}</td></tr><tr><td style="padding:6px 14px 6px 0;vertical-align:top;white-space:nowrap;"><strong>Comment:</strong></td><td style="padding:6px 0;">${e(request.discussionComment).replace(/\r?\n/g, "<br />")}</td></tr>` : `<tr><td style="padding:6px 14px 6px 0;vertical-align:top;white-space:nowrap;"><strong>Assigned by:</strong></td><td style="padding:6px 0;">${e(request.assignedBy)}</td></tr><tr><td style="padding:6px 14px 6px 0;vertical-align:top;white-space:nowrap;"><strong>Description:</strong></td><td style="padding:6px 0;">${e(request.description).replace(/\r?\n/g, "<br />")}</td></tr>`}
  </table>
  <p><a href="${e(request.requestUrl)}">View service request</a></p>
  <p>Regards,<br />BugTracker</p>
  <div style="margin-top:32px;padding-top:12px;border-top:1px solid #ddd;font-size:13px;color:#555;">This is an automatic email from BugTracker. Please do not reply.</div>
</body></html>`;
}
