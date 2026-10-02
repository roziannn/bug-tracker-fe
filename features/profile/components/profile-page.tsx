"use client";

import { useState } from "react";
import { BriefcaseBusiness, Mail, MapPin, User2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { appToast } from "@/lib/app-toast";

const quickStats = [
  {
    label: "Open Tasks",
    value: "12",
    note: "Issues currently in progress.",
    color: "text-blue-500",
  },
  {
    label: "Closed Tasks",
    value: "148",
    note: "Completed in this quarter.",
    color: "text-green-500",
  },
  {
    label: "Avg. Lead Time",
    value: "2.4d",
    note: "Average time to resolution.",
    color: "text-orange-500",
  },
] as const;

export function ProfilePage() {
  const [profile, setProfile] = useState({
    fullName: "Raka Aditya",
    displayName: "Raka",
    email: "raka@bugtracker.app",
    role: "Engineering Lead",
    team: "Frontend",
    location: "Jakarta, Indonesia",
  });

  function handleSave() {
    appToast.success({
      title: "Profile updated",
      description: "Your profile details have been saved successfully.",
    });
  }

  return (
    <AppShell
      activeNav="settings"
      title="Profile"
      toolbar={
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Personal Workspace</h2>
            <p className="text-sm text-muted-foreground">Manage your identity and team role within the workspace.</p>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-5">
                <Avatar className="size-20 border shadow-sm lg:size-24">
                  <AvatarFallback className="text-2xl font-medium bg-muted text-muted-foreground">RA</AvatarFallback>
                </Avatar>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold tracking-tight">{profile.fullName}</h3>
                    <Badge variant="secondary" className="font-medium">
                      {profile.role}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Mail className="size-4 opacity-70" />
                      {profile.email}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-4 opacity-70" />
                      {profile.location}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[32rem]">
                {quickStats.map((item) => (
                  <div key={item.label} className="flex flex-col justify-between rounded-xl border bg-muted/20 p-4 transition-colors hover:bg-muted/30">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                      <p className={`mt-1 text-3xl font-bold tracking-tight ${item.color}`}>{item.value}</p>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground/80 line-clamp-2">{item.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Details Form */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User2 className="size-5 text-primary" />
              <CardTitle>Account Details</CardTitle>
            </div>
            <CardDescription>Update your primary information used for issue ownership and team routing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="full-name">Full Name</Label>
                <Input id="full-name" onChange={(e) => setProfile((prev) => ({ ...prev, fullName: e.target.value }))} value={profile.fullName} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="display-name">Display Name</Label>
                <Input id="display-name" onChange={(e) => setProfile((prev) => ({ ...prev, displayName: e.target.value }))} value={profile.displayName} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Work Email</Label>
                <Input id="email" type="email" onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))} value={profile.email} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" onChange={(e) => setProfile((prev) => ({ ...prev, role: e.target.value }))} value={profile.role} />
              </div>
            </div>

            <Separator />

            <div className="grid gap-6 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="team">Primary Squad</Label>
                <div className="relative">
                  <BriefcaseBusiness className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input id="team" className="pl-9" onChange={(e) => setProfile((prev) => ({ ...prev, team: e.target.value }))} value={profile.team} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Work Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input id="location" className="pl-9" onChange={(e) => setProfile((prev) => ({ ...prev, location: e.target.value }))} value={profile.location} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
