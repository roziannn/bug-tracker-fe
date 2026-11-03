"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { useCurrentUser } from "@/components/app/user-provider";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { getMenuIcon } from "@/features/settings/data/menu-icons";
import { cn } from "@/lib/utils";
import type { NavMenu } from "@/types";

type TreeNode = NavMenu & { children: TreeNode[] };

// Lebar tetap (bukan acak) supaya hasil render di server dan di browser sama.
const SKELETON_WIDTHS = ["w-24", "w-32", "w-20", "w-28", "w-24"];

function normalize(path: string) {
  const trimmed = path.trim().replace(/\/+$/, "");
  return trimmed || "/";
}

function buildTree(menus: NavMenu[], parentId: string | null = null): TreeNode[] {
  return menus
    .filter((menu) => (menu.parentId ?? null) === parentId)
    .map((menu) => ({ ...menu, children: buildTree(menus, menu.id) }));
}

// Menu yang aktif adalah yang path-nya paling panjang dan cocok dengan alamat sekarang,
// supaya "/settings/role" tidak ikut menyala saat membuka "/settings/role/Admin" di menu lain.
function findActiveId(menus: NavMenu[], pathname: string): string | null {
  let best: { id: string; length: number } | null = null;

  for (const menu of menus) {
    if (!menu.path.trim()) continue;
    const path = normalize(menu.path);
    const matches = path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`);
    if (matches && (!best || path.length > best.length)) best = { id: menu.id, length: path.length };
  }
  return best?.id ?? null;
}

function ancestorIds(menus: NavMenu[], id: string | null): Set<string> {
  const ids = new Set<string>();
  let current = menus.find((menu) => menu.id === id);

  while (current?.parentId) {
    ids.add(current.parentId);
    current = menus.find((menu) => menu.id === current!.parentId);
  }
  return ids;
}

export function SidebarNavigation() {
  const pathname = usePathname();
  const { user, isLoading } = useCurrentUser();
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const menus = useMemo(() => user?.navigation ?? [], [user]);
  const tree = useMemo(() => buildTree(menus), [menus]);
  const activeId = findActiveId(menus, pathname);
  // Grup yang berisi halaman aktif terbuka otomatis, kecuali sudah dibuka/ditutup sendiri oleh user.
  const defaultOpen = ancestorIds(menus, activeId);

  const isOpen = (id: string) => toggled[id] ?? defaultOpen.has(id);
  const toggle = (id: string) => setToggled((current) => ({ ...current, [id]: !isOpen(id) }));

  if (isLoading) {
    return (
      <SidebarMenu>
        {Array.from({ length: 5 }, (_, index) => (
          <SidebarMenuItem key={index}>
            <div className="flex h-8 items-center gap-2 px-2" aria-hidden="true">
              <Skeleton className="size-4 shrink-0 rounded-md" />
              <Skeleton className={`h-4 ${SKELETON_WIDTHS[index % SKELETON_WIDTHS.length]} group-data-[collapsible=icon]:hidden`} />
            </div>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    );
  }

  if (tree.length === 0) {
    return (
      <p className="px-3 py-2 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
        No menus are assigned to your role.
      </p>
    );
  }

  const isActiveBranch = (node: TreeNode): boolean =>
    node.id === activeId || node.children.some((child) => isActiveBranch(child));

  function renderSub(nodes: TreeNode[]) {
    return (
      <SidebarMenuSub>
        {nodes.map((node) => {
          const hasChildren = node.children.length > 0;

          return (
            <SidebarMenuSubItem key={node.id}>
              {hasChildren ? (
                <>
                  <SidebarMenuSubButton render={<button type="button" />} onClick={() => toggle(node.id)}>
                    <span>{node.label}</span>
                    <ChevronRight className={cn("ml-auto size-3.5 transition-transform", isOpen(node.id) && "rotate-90")} />
                  </SidebarMenuSubButton>
                  {isOpen(node.id) ? renderSub(node.children) : null}
                </>
              ) : (
                <SidebarMenuSubButton isActive={node.id === activeId} render={<Link href={node.path || "#"} />}>
                  <span>{node.label}</span>
                </SidebarMenuSubButton>
              )}
            </SidebarMenuSubItem>
          );
        })}
      </SidebarMenuSub>
    );
  }

  return (
    <SidebarMenu>
      {tree.map((node) => {
        const Icon = getMenuIcon(node.icon);
        const hasChildren = node.children.length > 0;

        return (
          <SidebarMenuItem key={node.id}>
            {hasChildren ? (
              <>
                <SidebarMenuButton
                  isActive={isActiveBranch(node)}
                  onClick={() => toggle(node.id)}
                  tooltip={node.label}
                  type="button"
                >
                  {Icon ? <Icon /> : null}
                  <span>{node.label}</span>
                  <ChevronRight
                    className={cn(
                      "ml-auto transition-transform duration-200 group-data-[collapsible=icon]:hidden",
                      isOpen(node.id) && "rotate-90"
                    )}
                  />
                </SidebarMenuButton>
                {isOpen(node.id) ? renderSub(node.children) : null}
              </>
            ) : (
              <SidebarMenuButton isActive={node.id === activeId} render={<Link href={node.path || "#"} />} tooltip={node.label}>
                {Icon ? <Icon /> : null}
                <span>{node.label}</span>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
