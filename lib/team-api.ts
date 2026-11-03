import { fail } from "@/lib/api";
import type { MemberError, TeamError } from "@/repositories/team.repository";

// Mengubah kode error dari repository team menjadi respons API.
export function teamErrorResponse(error: TeamError) {
  switch (error) {
    case "not-found":
      return fail("Group team not found", 404);
    case "domain-invalid":
      return fail("Domain must be an active Teams Domain value", 400);
    case "domain-taken":
      return fail("A group team for this domain already exists", 409);
    case "lead-not-found":
      return fail("Lead not found or inactive", 400);
  }
}

export function memberErrorResponse(error: MemberError) {
  switch (error) {
    case "team-not-found":
      return fail("Group team not found", 404);
    case "member-not-found":
      return fail("Member not found", 404);
    case "user-not-found":
      return fail("User not found or inactive", 400);
    case "already-member":
      return fail("This user is already a member of the group team", 409);
  }
}
