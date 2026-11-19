import {
  Activity, AlertCircle, Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Award,
  BadgeCheck, Bell, BookOpen, BriefcaseBusiness, Bug, CalendarDays, ChartNoAxesCombined,
  Check, CheckCircle2, Circle, CircleDot, CircleHelp, ClipboardCheck, ClipboardList,
  Clock3, Cloud, Code, Cog, Database, File, FileCheck2, FileClock, FileSearch2,
  FileText, Folder, FolderOpenDot, Gauge, GitBranch, Globe, HardDrive, House,
  KanbanSquare, LayoutDashboard, ListTodo, LockKeyhole, Mail, MessageSquare,
  Monitor, Network, Package, PanelsTopLeft, Pencil, Phone, Search, Server,
  Settings, Shield, SlidersHorizontal, Sparkles, Tag, Ticket, Trash2, Users,
  UsersRound, Wrench, Zap, type LucideIcon,
} from "lucide-react";

// Curated Lucide icons keep the picker useful without bundling the entire icon library.
export const menuIcons: Record<string, LucideIcon> = {
  Activity, AlertCircle, Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Award,
  BadgeCheck, Bell, BookOpen, BriefcaseBusiness, Bug, CalendarDays, ChartNoAxesCombined,
  Check, CheckCircle2, Circle, CircleDot, CircleHelp, ClipboardCheck, ClipboardList,
  Clock3, Cloud, Code, Cog, Database, File, FileCheck2, FileClock, FileSearch2,
  FileText, Folder, FolderOpenDot, Gauge, GitBranch, Globe, HardDrive, House,
  KanbanSquare, LayoutDashboard, ListTodo, LockKeyhole, Mail, MessageSquare,
  Monitor, Network, Package, PanelsTopLeft, Pencil, Phone, Search, Server,
  Settings, Shield, SlidersHorizontal, Sparkles, Tag, Ticket, Trash2, Users,
  UsersRound, Wrench, Zap,
};

export const NO_ICON = "none";

export function getMenuIcon(name: string): LucideIcon | null {
  if (name === NO_ICON) return null;
  return menuIcons[name] ?? Circle;
}
