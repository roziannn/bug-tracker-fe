"use client";

import { BriefcaseBusiness, Mail, User2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileData = {
  name: string;
  email: string;
  role: string;
  team: string;
  openIssues: number;
  closedIssues: number;
};

export function ProfilePage({ profile }: { profile: ProfileData }) {
  const initials = profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const quickStats = [
    { label: "Open Issues", value: profile.openIssues, note: "Open issues you created.", color: "text-blue-500" },
    { label: "Closed Issues", value: profile.closedIssues, note: "Issues you created that are done.", color: "text-green-500" },
  ] as const;

  return (
    <AppShell
      activeNav="settings"
      title="Profile"
      toolbar={
        <div>
          <h2 className="text-xl font-bold tracking-tight">Personal Workspace</h2>
          <p className="text-sm text-muted-foreground">Manage your identity and team role within the workspace.</p>
        </div>
      }
    >
      <div className="space-y-6">
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-5">
                <Avatar className="size-20 border shadow-sm lg:size-24">
                  <AvatarFallback className="bg-muted text-2xl font-medium text-muted-foreground">{initials || "?"}</AvatarFallback>
                </Avatar>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-2xl font-bold tracking-tight">{profile.name}</h3>
                    <Badge variant="secondary" className="font-medium">{profile.role}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Mail className="size-4 opacity-70" />{profile.email}</span>
                    <span className="flex items-center gap-1.5"><BriefcaseBusiness className="size-4 opacity-70" />{profile.team}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[22rem]">
                {quickStats.map((item) => (
                  <div key={item.label} className="flex flex-col justify-between rounded-xl border bg-muted/20 p-4 transition-colors hover:bg-muted/30">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                      <p className={`mt-1 text-3xl font-bold tracking-tight ${item.color}`}>{item.value}</p>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground/80">{item.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User2 className="size-5 text-primary" />
              <CardTitle>Account Details</CardTitle>
            </div>
            <CardDescription>Current account information used for issue ownership and team routing.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="profile-name">Full Name</Label>
              <Input id="profile-name" value={profile.name} readOnly />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-email">Work Email</Label>
              <Input id="profile-email" value={profile.email} readOnly />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-role">Role</Label>
              <Input id="profile-role" value={profile.role} readOnly />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profile-team">Team</Label>
              <Input id="profile-team" value={profile.team} readOnly />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
