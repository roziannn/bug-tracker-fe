"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const settingsLinks = [
  { href: "/settings/role", label: "Role" },
  { href: "/settings/environment", label: "Environment" },
] as const;

export function SettingsSubnav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {settingsLinks.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-muted"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
