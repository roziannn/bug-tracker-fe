import { fail } from "@/lib/api";
import type { ProjectError } from "@/repositories/project.repository";

// Mengubah kode error dari repository project menjadi respons API.
export function projectErrorResponse(error: ProjectError | "not-found", projectName: string) {
  switch (error) {
    case "not-found":
      return fail("Project not found", 404);
    case "name-taken":
      return fail(`A project named "${projectName}" already exists`, 409);
    case "owner-not-found":
      return fail("Owner not found or inactive", 400);
    case "invalid-tags":
      return fail("One or more tags are not valid Teams Domain values", 400);
  }
}
