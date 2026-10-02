"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bug,
  CheckCircle2,
  FolderKanban,
  Globe,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { ThemeToggle } from "@/components/shared/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { appToast } from "@/lib/app-toast";

const highlights = [
  "Kanban triage board with drag and drop workflow",
  "Issue severity, ownership, and release visibility in one place",
  "Dark mode and consistent shadcn-based product UI",
];

export function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
     console.log("handleSubmit dipanggil");

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          appToast.error({
            title: "Login gagal",
            description: data.error ?? "Terjadi kesalahan, coba lagi.",
          });
          return;
        }

        appToast.success({
          title: "Login successful",
          description: `Welcome back, ${data.user.name}. Redirecting to your workspace.`,
        });

        router.push("/");
        router.refresh();
      } catch {
        appToast.error({
          title: "Login gagal",
          description: "Tidak bisa terhubung ke server, coba lagi.",
        });
      }
    });
  }

  return (
    <div className="relative min-h-svh overflow-x-hidden overflow-y-auto lg:h-svh lg:overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_32%),radial-gradient(circle_at_bottom_right,color-mix(in_oklab,var(--accent)_30%,transparent),transparent_28%)]" />

      <div className="relative mx-auto flex min-h-svh max-w-7xl flex-col px-4 py-4 sm:px-6 lg:h-full lg:min-h-0 lg:px-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex max-w-[calc(100%-4rem)] items-center gap-3 rounded-full border bg-card/80 px-3 py-2 backdrop-blur sm:px-4"
          >
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <FolderKanban className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Bug Tracker</span>
              <span className="hidden text-xs text-muted-foreground sm:block">
                Quality operations workspace
              </span>
            </span>
          </Link>

          <ThemeToggle />
        </div>

        <div className="grid flex-1 gap-6 py-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-8 lg:py-6">
          <section className="order-2 hidden space-y-4 self-center lg:order-1 lg:block lg:space-y-5">
            <Badge variant="secondary" className="gap-2 px-3 py-1">
              <ShieldCheck className="size-3.5" />
              Secure engineering access
            </Badge>

            <div className="max-w-2xl space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl xl:text-5xl">
                Login yang lebih rapi untuk tim yang ngurus bug setiap hari.
              </h1>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                Masuk ke dashboard bug tracker, lanjutkan triage sprint, dan pantau issue kritikal tanpa layout auth yang terasa generik.
              </p>
            </div>

            <div className="hidden gap-4 md:grid md:grid-cols-3">
              <Card className="bg-card/85 backdrop-blur">
                <CardHeader>
                  <Bug className="size-5 text-primary" />
                  <CardTitle className="text-base">34 open bugs</CardTitle>
                  <CardDescription>Prioritas issue aktif lintas squad.</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-card/85 backdrop-blur">
                <CardHeader>
                  <LockKeyhole className="size-5 text-primary" />
                  <CardTitle className="text-base">SSO ready</CardTitle>
                  <CardDescription>Masuk aman untuk internal workspace.</CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-card/85 backdrop-blur">
                <CardHeader>
                  <CheckCircle2 className="size-5 text-primary" />
                  <CardTitle className="text-base">Fast triage</CardTitle>
                  <CardDescription>Board, issue list, dan notes tetap sinkron.</CardDescription>
                </CardHeader>
              </Card>
            </div>

            <Card className="max-w-2xl bg-card/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg">What you get after login</CardTitle>
                <CardDescription>
                  Fondasi auth ini tetap satu desain dengan shell bug tracker yang sudah ada.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {highlights.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <CheckCircle2 className="size-3.5" />
                    </span>
                    <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="order-1 flex justify-center lg:order-2 lg:self-center lg:justify-end">
            <Card className="w-full max-w-md border-border/70 bg-card/92 shadow-xl backdrop-blur">
              <CardHeader className="space-y-2 pb-4">
                <CardTitle className="text-xl sm:text-2xl">Welcome back</CardTitle>
                <CardDescription>
                  Sign in ke workspace engineering untuk lanjut review, assign, dan move issue antar status.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button variant="outline" className="justify-start">
                    <Globe />
                    Continue with GitHub
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Mail />
                    Continue with SSO
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Or sign in
                  </span>
                  <Separator className="flex-1" />
                </div>

                <form className="space-y-3" onSubmit={handleSubmit}>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Work email</Label>
                    <Input
                      id="email"
                      onChange={(event) => setEmail(event.target.value)}
                      value={email}
                      type="email"
                      placeholder="you@company.com"
                      disabled={isPending}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        href="/login"
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="password"
                      onChange={(event) => setPassword(event.target.value)}
                      value={password}
                      type="password"
                      placeholder="Enter your password"
                      disabled={isPending}
                      required
                    />
                  </div>

                 <Button className="w-full" disabled={isPending} size="lg" type="submit">
                  {isPending ? "Signing in..." : "Sign in to dashboard"}
                  <ArrowRight />
                </Button>
                </form>

                <div className="rounded-xl border bg-muted/40 p-3.5">
                  <p className="text-sm font-medium">Demo access</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Use your internal engineering account or SSO to access sprint triage, kanban workflow, and release health reports.
                  </p>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  Need access from another team?{" "}
                  <Link href="/login" className="font-medium text-primary hover:underline">
                    Request workspace invite
                  </Link>
                </p>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}