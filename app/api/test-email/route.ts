import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  const { data, error } = await resend.emails.send({
    from: "Bug Tracker <onboarding@resend.dev>",
    to: ["firdarozian10@gmail.com"],
    subject: "Testing Bug Tracker Notification",
    html: "<h1>Hello!</h1><p>Email berhasil dikirim dari Bug Tracker.</p>",
  });

  if (error) {
    return Response.json({ error }, { status: 400 });
  }

  return Response.json({ success: true, data });
}