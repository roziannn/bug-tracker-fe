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

export function getMenuIcon(name: string): LucideIcon {
  return menuIcons[name] ?? Circle;
}
