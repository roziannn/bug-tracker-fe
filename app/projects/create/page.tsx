import type { Metadata } from "next";
import { ProjectFormPage } from "@/features/projects/components/project-form-page";

export const metadata: Metadata = {
  title: "Create Project",
};

export default function CreateProjectRoute() {
  return <ProjectFormPage />;
}
