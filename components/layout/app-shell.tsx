"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronRight, ChevronsUpDown, CircleDot, CreditCard, FileSearch, FileSearch2, FolderKanban, FolderOpenDot, Gauge, History, KanbanSquare, LogOut, PencilLine, Plus, Settings, UserCircle2, Users } from "lucide-react";
import { useCurrentUser } from "@/components/app/user-provider";
import { NotificationDropdown } from "@/components/shared/navigation/notification-dropdown";
import { ThemeToggle } from "@/components/shared/theme/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { appToast } from "@/lib/app-toast";

type AppShellProps = {
  activeNav: "overview" | "issues" | "kanban" | "teams" | "projects" | "changelog" | "settings" | "audit-trail";
  eyebrow?: string;
  title: string;
  toolbar?: ReactNode;
  showCreateIssueButton?: boolean;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  children: ReactNode;
};

type NavigationChild = {
  id: string;
  label: string;
  href: string;
};

type NavigationItem = {
  id: AppShellProps["activeNav"] | "settings-group";
  label: string;
  href?: string;
  icon: typeof Gauge;
  badge?: string;
  children?: readonly NavigationChild[];
};

type CurrentUser = {
  name: string;
  email: string;
};


const navigation: readonly NavigationItem[] = [
  { id: "overview", label: "Overview", href: "/", icon: Gauge },
  { id: "issues", label: "All Issues", href: "/issues", icon: CircleDot, badge: "34" },
  { id: "kanban", label: "Kanban", href: "/kanban", icon: KanbanSquare },
  { id: "teams", label: "Teams", href: "/teams", icon: Users },
  { id: "projects", label: "Projects", href: "/projects", icon: FolderOpenDot },
  { id: "changelog", label: "Changelog", href: "/changelog", icon: History },
  {
    id: "settings-group",
    label: "Settings",
    icon: Settings,
    children: [
      { id: "role", label: "Role", href: "/settings/role" },
      { id: "menu", label: "Menu", href: "/settings/menu" },
      { id: "permission", label: "Permission", href: "/settings/permission" },
    ],
  },
  { id: "audit-trail", label: "Audit Trail", href: "/audit-trail", icon: FileSearch2 },
] as const;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function AppShell({
  activeNav,
  title,
  toolbar,
  showCreateIssueButton = false,
  breadcrumbs,
  children,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const resolvedBreadcrumbs = breadcrumbs?.length ? breadcrumbs : [{ label: title }];
  const [isSettingsOpen, setIsSettingsOpen] = useState(pathname.startsWith("/settings"));
  const { user, clearUser } = useCurrentUser();
  useEffect(() => {
    if (pathname.startsWith("/settings")) {
      setIsSettingsOpen(true);
    }
  }, [pathname]);

 

 async function handleLogout() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    clearUser();
    appToast.success({
      title: "Logged out successfully",
      description: "You have been signed out from the bug tracker workspace.",
    });
    router.push("/login");
    router.refresh();
  }
}

  const displayName = user?.name ?? "...";
  const displayEmail = user?.email ?? "";
  const initials = user?.name ? getInitials(user.name) : "..";

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" variant="inset">
       <SidebarHeader className="gap-3 p-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-2">
  <div className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/50 px-3 py-3 transition-all group-data-[collapsible=icon]:size-14 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-2xl group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:border-transparent">
    
    <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground transition-all group-data-[collapsible=icon]:size-9">
      <FolderKanban className="size-5" />
    </div>

    <div className="min-w-0 group-data-[collapsible=icon]:hidden">
      <p className="truncate text-sm font-semibold">Bug Tracker</p>
      <p className="truncate text-xs text-sidebar-foreground/70">Engineering workspace</p>
    </div>
  </div>
</SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isSettingsGroup = item.id === "settings-group";
                  const hasChildren = Boolean(item.children?.length);
                  const isChildActive = item.children?.some((child) => pathname === child.href) ?? false;
                  const isActive = isSettingsGroup ? isChildActive : item.id === activeNav;

                  return (
                    <SidebarMenuItem key={item.label}>
                      {hasChildren ? (
                        <>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => setIsSettingsOpen((current) => !current)}
                            tooltip={item.label}
                            type="button"
                          >
                            <Icon />
                            <span>{item.label}</span>
                            <ChevronRight
                              className={cn(
                                "ml-auto transition-transform duration-200 group-data-[collapsible=icon]:hidden",
                                isSettingsOpen && "rotate-90",
                              )}
                            />
                          </SidebarMenuButton>
                          {isSettingsOpen ? (
                            <SidebarMenuSub>
                              {item.children?.map((child) => (
                                <SidebarMenuSubItem key={child.id}>
                                  <SidebarMenuSubButton
                                    isActive={pathname === child.href}
                                    render={<Link href={child.href} />}
                                  >
                                    <span>{child.label}</span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          ) : null}
                        </>
                      ) : (
                        <SidebarMenuButton isActive={isActive} render={<Link href={item.href ?? "#"} />} tooltip={item.label}>
                          <Icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      )}
                      {"badge" in item && item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="flex w-full items-center gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent/60 px-3 py-2.5 text-left transition-all hover:bg-sidebar-accent group-data-[collapsible=icon]:size-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:hover:bg-transparent">
                  <Avatar data-size="lg">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-medium">{displayName}</p>
                    <p className="truncate text-xs text-sidebar-foreground/60">{displayEmail}</p>
                  </div>
                  <ChevronsUpDown className="size-4 text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden" />
                </button>
              }
            />
            <DropdownMenuContent align="end" className="w-72 rounded-xl p-0" side="top" sideOffset={8}>
              <div className="flex items-center gap-3 px-3 py-3">
                <Avatar data-size="lg">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{displayEmail}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/profile" />}>
                <UserCircle2 />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} variant="destructive">
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <div className="flex min-h-svh flex-col">
          <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
            <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <SidebarTrigger />
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 text-lg">
                      {resolvedBreadcrumbs.map((item, index) => {
                        const isLastItem = index === resolvedBreadcrumbs.length - 1;

                        return (
                          <div key={`${item.label}-${index}`} className="flex items-center gap-1.5">
                            {item.href && !isLastItem ? (
                              <Link
                                href={item.href}
                                className="font-medium text-muted-foreground transition-colors hover:text-foreground"
                              >
                                {item.label}
                              </Link>
                            ) : (
                              <span
                                className={isLastItem ? "font-semibold tracking-tight text-foreground" : "font-medium text-muted-foreground"}
                              >
                                {item.label}
                              </span>
                            )}
                            {!isLastItem ? (
                              <ChevronRight className="size-4 text-muted-foreground/70" />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <NotificationDropdown />
                  {showCreateIssueButton ? (
                    <Button
                      nativeButton={false}
                      render={
                        <Link href="/issues/create">
                          <Plus />
                          Create issue
                        </Link>
                      }
                      size="lg"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {toolbar ? <div className="mb-6">{toolbar}</div> : null}
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}