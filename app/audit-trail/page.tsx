import type { Metadata } from "next";

import { AuditTrailPage } from "@/features/audit-trail/components/audit-trail-page";
import { getAuditTrailEvents } from "@/repositories/audit-trail.repository";
import type { AuditTrailEntry } from "@/features/bug-tracker/data/bug-tracker-data";

export const metadata: Metadata = {
  title: "Audit Trail",
};

export const dynamic = "force-dynamic";

export default async function AuditTrailRoute() {
  let entries: AuditTrailEntry[] = [];

  try {
    entries = await getAuditTrailEvents();
  } catch (error) {
    console.error("AUDIT TRAIL PAGE LOAD ERROR:", error);
  }

  return <AuditTrailPage initialEntries={entries} />;
}
