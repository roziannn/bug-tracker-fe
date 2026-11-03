import type { Metadata } from "next";
import { CreateIssuePage } from "@/features/issues/components/create-issue-page";

export const metadata: Metadata = { title: "Edit Issue" };

export default async function EditIssueRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CreateIssuePage issueId={id} />;
}
