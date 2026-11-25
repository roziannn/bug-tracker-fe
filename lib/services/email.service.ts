
import { Resend } from "resend";
import { bugNotificationTemplate } from "@/lib/email/issue-notification";
import { serviceRequestNotificationTemplate } from "@/lib/email/service-request-notification";

export async function sendBugNotification(
  recipient: string,
  bug: {
    bugId: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    reportedBy: string;
    assignedTo?: string;
    bugUrl: string;
  }
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: "BugTracker <onboarding@resend.dev>",
    to: [recipient],
    subject: `[ID Ticket: ${bug.bugId}] ${bug.title}`,
    html: bugNotificationTemplate(bug),
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function sendServiceRequestNotification(
  recipient: string,
  request: { requestNumber: string; title: string; description: string; priority: string; assignedBy: string; assignedTo: string; requestUrl: string; discussionComment?: string },
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: "BugTracker <onboarding@resend.dev>",
    to: [recipient],
    subject: `${request.discussionComment ? "[New discussion]" : "[Service Request]"} ${request.requestNumber}: ${request.title}`,
    html: serviceRequestNotificationTemplate(request),
  });

  if (error) throw new Error(error.message);
  return data;
}
