"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CredentialConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel: string;
  onVerified: () => void | Promise<void>;
};

export function CredentialConfirmDialog({ open, onOpenChange, actionLabel, onVerified }: CredentialConfirmDialogProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (verifying) return;
    setVerifying(true);
    setError("");
    try {
      const response = await fetch("/api/auth/verify-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "Unable to verify credentials.");
        return;
      }
      onOpenChange(false);
      setPassword("");
      await onVerified();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form className="grid gap-4" onSubmit={verify}>
          <DialogHeader>
            <DialogTitle>Confirm your identity</DialogTitle>
            <DialogDescription>Enter your username and password to {actionLabel.toLowerCase()}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2"><Label htmlFor="confirm-username">Username or email</Label><Input id="confirm-username" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></div>
          <div className="grid gap-2"><Label htmlFor="confirm-password">Password</Label><Input id="confirm-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={verifying}>Cancel</Button>
            <Button type="submit" disabled={verifying || !username.trim() || !password}>{verifying ? "Verifying..." : actionLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
