import type { Metadata } from "next";

import { AuditTrailPage } from "@/features/audit-trail/components/audit-trail-page";

export const metadata: Metadata = {
  title: "Audit Trail",
};

export default function AuditTrailRoute() {
  return <AuditTrailPage />;
}
