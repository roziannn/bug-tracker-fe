import { Circle, CircleDot, FileSearch2, FolderOpenDot, Gauge, KanbanSquare, Settings, Users, type LucideIcon } from "lucide-react";

export const menuIcons: Record<string, LucideIcon> = {
  Gauge,
  CircleDot,
  KanbanSquare,
  Users,
  FolderOpenDot,
  FileSearch2,
  Settings,
  Circle,
};

export const NO_ICON = "none";

export function getMenuIcon(name: string): LucideIcon | null {
  if (name === NO_ICON) return null;
  return menuIcons[name] ?? Circle;
}
