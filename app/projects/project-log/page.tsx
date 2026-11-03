import type { Metadata } from "next";
import { ProjectLogPage } from "@/features/projects/components/project-log-page";

export const metadata: Metadata = {
  title: "Project Log",
};

export default function ProjectLogRoute() {
  return <ProjectLogPage />;
}
