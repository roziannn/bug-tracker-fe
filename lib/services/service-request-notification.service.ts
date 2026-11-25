import { query } from "@/lib/db";
import { sendServiceRequestNotification } from "@/lib/services/email.service";

export async function notifyServiceRequestPic(requestId: string, picId: number, assignedBy: string) {
  try {
    const [requests, users] = await Promise.all([
      query<{ id: string; number: string; title: string; description: string; priority: string }>(
        `SELECT "NewId" AS "id", "RequestNumber" AS "number", "Title" AS "title", "Description" AS "description", "Priority" AS "priority"
         FROM "DATA_ServiceRequests" WHERE "NewId" = $1 AND "IsActive" = true`, [requestId]),
      query<{ Id: number; Name: string; Email: string }>(
        `SELECT "Id", "Name", "Email" FROM "CORE_User" WHERE "Id" = $1 AND "IsActive" = true`, [picId]),
    ]);
    const request = requests[0];
    const recipient = users[0];
    if (!request || !recipient) return;

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://bugtracker-frt.vercel.app").replace(/\/$/, "");
    const href = `/service-requests/${encodeURIComponent(request.id)}`;
    const tasks: Promise<unknown>[] = [
      query(
        `INSERT INTO "DATA_Notifications" ("UserId", "IssueId", "Title", "Description", "Href") VALUES ($1, $2, $3, $4, $5)`,
        [recipient.Id, request.id, `Service request assigned: ${request.number}`, request.title, href]),
    ];
    if (recipient.Email) {
      tasks.push(sendServiceRequestNotification(recipient.Email, {
        requestNumber: request.number,
        title: request.title,
        description: request.description,
        priority: request.priority,
        assignedBy,
        assignedTo: recipient.Name,
        requestUrl: `${baseUrl}${href}`,
      }));
    }
    const results = await Promise.allSettled(tasks);
    for (const result of results) if (result.status === "rejected") console.error(`Failed to notify PIC for service request ${request.number}`, result.reason);
  } catch (error) {
    // Notification delivery must not undo a saved service request.
    console.error(`Failed to notify PIC for service request ${requestId}`, error);
  }
}

export async function notifyServiceRequestDiscussion(requestId: string, authorId: number, author: string, comment: string) {
  try {
    const requests = await query<{ id: string; number: string; title: string; description: string; priority: string; picId: number | null }>(
      `SELECT "NewId" AS "id", "RequestNumber" AS "number", "Title" AS "title", "Description" AS "description", "Priority" AS "priority", "PICId" AS "picId"
       FROM "DATA_ServiceRequests" WHERE "NewId" = $1 AND "IsActive" = true`, [requestId]);
    const request = requests[0];
    if (!request?.picId || request.picId === authorId) return;
    const recipients = await query<{ Id: number; Name: string; Email: string }>(
      `SELECT "Id", "Name", "Email" FROM "CORE_User" WHERE "Id" = $1 AND "IsActive" = true`, [request.picId]);
    const recipient = recipients[0];
    if (!recipient) return;

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://bugtracker-frt.vercel.app").replace(/\/$/, "");
    const href = `/service-requests/${encodeURIComponent(request.id)}`;
    const tasks: Promise<unknown>[] = [query(
      `INSERT INTO "DATA_Notifications" ("UserId", "IssueId", "Title", "Description", "Href") VALUES ($1, $2, $3, $4, $5)`,
      [recipient.Id, request.id, `New discussion on ${request.number}`, `${author}: ${comment}`, href],
    )];
    if (recipient.Email) tasks.push(sendServiceRequestNotification(recipient.Email, {
      requestNumber: request.number,
      title: request.title,
      description: request.description,
      priority: request.priority,
      assignedBy: author,
      assignedTo: recipient.Name,
      discussionComment: comment,
      requestUrl: `${baseUrl}${href}`,
    }));
    const results = await Promise.allSettled(tasks);
    for (const result of results) if (result.status === "rejected") console.error(`Failed to notify PIC about discussion on ${request.number}`, result.reason);
  } catch (error) {
    console.error(`Failed to notify PIC about service request discussion ${requestId}`, error);
  }
}
