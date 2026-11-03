import { Badge } from "@/components/ui/badge";

// High mencolok (merah), Medium biasa, Low paling kalem.
const VARIANTS = {
  High: "destructive",
  Medium: "secondary",
  Low: "outline",
} as const;

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge variant={VARIANTS[priority as keyof typeof VARIANTS] ?? "outline"}>{priority}</Badge>;
}
