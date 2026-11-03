import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { categoryConfigs } from "@/features/settings/data/category-store";

export function CategoriesIndexPage() {
  return (
    <AppShell
      activeNav="settings"
      breadcrumbs={[{ label: "Settings", href: "/settings/role" }, { label: "Categories" }]}
      eyebrow="Configuration"
      title="Settings"
      toolbar={<div><h2 className="text-lg font-semibold tracking-tight">Categories</h2><p className="text-sm text-muted-foreground">Manage the values used across issues and projects.</p></div>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categoryConfigs.map((category) => (
          <Card key={category.slug}>
            <CardHeader><CardTitle>{category.title}</CardTitle></CardHeader>
            <CardContent className="flex items-end justify-between gap-4">
              <p className="text-sm text-muted-foreground">{category.description}</p>
              <Button nativeButton={false} render={<Link href={`/settings/category/${category.slug}`} />} variant="outline" size="icon" aria-label={`Open ${category.title}`}><ArrowRight /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
