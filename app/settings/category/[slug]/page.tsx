import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategorySettingsPage } from "@/features/settings/components/category-settings-page";
import { getCategoryConfig } from "@/features/settings/data/category-store";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const config = getCategoryConfig((await params).slug);
  return { title: config?.title ?? "Category" };
}

export default async function SettingsCategoryRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getCategoryConfig(slug)) notFound();

  return <CategorySettingsPage slug={slug} />;
}
