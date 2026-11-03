import type { Metadata } from "next";
import { ProjectFormPage } from "@/features/projects/components/project-form-page";

export const metadata: Metadata = {
  title: "Edit Project",
};

export default async function EditProjectRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ProjectFormPage projectId={id} />;
}
