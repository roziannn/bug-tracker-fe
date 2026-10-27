"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";

type EnvironmentRow = {
  name: string;
  apiBase: string;
  database: string;
  status: "Active" | "Synced" | "Protected";
};

type EnvironmentStatus = EnvironmentRow["status"];

const initialEnvironments: EnvironmentRow[] = [
  {
    name: "Development",
    apiBase: "http://localhost:3000/api",
    database: "Local Postgres",
    status: "Active",
  },
  {
    name: "Staging",
    apiBase: "https://staging.bugtracker.internal/api",
    database: "Managed Postgres",
    status: "Synced",
  },
  {
    name: "Production",
    apiBase: "https://bugtracker.company.com/api",
    database: "Primary cluster",
    status: "Protected",
  },
];

const PAGE_SIZE = 4;

function statusBadgeVariant(status: EnvironmentStatus) {
  if (status === "Protected") return "destructive";
  if (status === "Synced") return "secondary";
  return "default";
}

export function EnvironmentSettingsPage() {
  const [environments, setEnvironments] = useState<EnvironmentRow[]>(initialEnvironments);
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [environmentName, setEnvironmentName] = useState("");
  const [apiBase, setApiBase] = useState("");
  const [database, setDatabase] = useState("");
  const [status, setStatus] = useState<EnvironmentStatus>("Active");
  const totalPages = Math.max(1, Math.ceil(environments.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedEnvironments = useMemo(
    () => environments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, environments]
  );

  function updateEnvironment(index: number, field: keyof EnvironmentRow, value: string) {
    setEnvironments((current) =>
      current.map((environment, currentIndex) =>
        currentIndex === index
          ? {
              ...environment,
              [field]: value,
            }
          : environment
      )
    );
  }

  function updateEnvironmentStatus(index: number, value: EnvironmentStatus) {
    setEnvironments((current) =>
      current.map((environment, currentIndex) =>
        currentIndex === index
          ? {
              ...environment,
              status: value,
            }
          : environment
      )
    );
  }

  function createEnvironment() {
    if (!environmentName.trim() || !apiBase.trim() || !database.trim()) {
      return;
    }

    setEnvironments((current) => [
      ...current,
      {
        name: environmentName.trim(),
        apiBase: apiBase.trim(),
        database: database.trim(),
        status,
      },
    ]);

    setEnvironmentName("");
    setApiBase("");
    setDatabase("");
    setStatus("Active");
    setIsCreateDialogOpen(false);
  }

  return (
    <AppShell
      activeNav="settings"
      breadcrumbs={[
        { label: "Settings", href: "/settings/role" },
        { label: "Environment Settings" },
      ]}
      eyebrow="Configuration"
      title="Settings"
      toolbar={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Environment settings</h2>
            <p className="text-sm text-muted-foreground">
              Edit environment app, endpoint API, database profile, dan status koneksi langsung dari tabel.
            </p>
          </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger render={<Button />}>
            <Plus />
            Add Environment
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add new environment</DialogTitle>
              <DialogDescription>
                Tambahkan environment baru beserta endpoint API, database profile, dan status awalnya.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="environment-name" className="text-sm font-medium">
                  Environment name
                </label>
                <Input
                  id="environment-name"
                  value={environmentName}
                  onChange={(event) => setEnvironmentName(event.target.value)}
                  placeholder="Contoh: UAT"
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="environment-api-base" className="text-sm font-medium">
                  API Base URL
                </label>
                <Input
                  id="environment-api-base"
                  value={apiBase}
                  onChange={(event) => setApiBase(event.target.value)}
                  placeholder="Contoh: https://uat.bugtracker.internal/api"
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="environment-database" className="text-sm font-medium">
                  Database
                </label>
                <Input
                  id="environment-database"
                  value={database}
                  onChange={(event) => setDatabase(event.target.value)}
                  placeholder="Contoh: Replica Postgres"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={status} onValueChange={(value) => setStatus((value ?? "Active") as EnvironmentStatus)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Synced">Synced</SelectItem>
                    <SelectItem value="Protected">Protected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter showCloseButton>
              <Button onClick={createEnvironment}>
                <Plus />
                Add environment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Environment</TableHead>
                  <TableHead>API Base URL</TableHead>
                  <TableHead>Database</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEnvironments.map((environment, index) => {
                  const absoluteIndex = (currentPage - 1) * PAGE_SIZE + index;

                  return (
                  <TableRow key={environment.name}>
                    <TableCell className="font-medium">{environment.name}</TableCell>
                    <TableCell className="min-w-64">
                      <Input
                        value={environment.apiBase}
                        onChange={(event) => updateEnvironment(absoluteIndex, "apiBase", event.target.value)}
                      />
                    </TableCell>
                    <TableCell className="min-w-52">
                      <Input
                        value={environment.database}
                        onChange={(event) => updateEnvironment(absoluteIndex, "database", event.target.value)}
                      />
                    </TableCell>
                    <TableCell className="min-w-44">
                      <div className="flex items-center gap-2">
                        <Select
                          value={environment.status}
                          onValueChange={(value) => updateEnvironmentStatus(absoluteIndex, (value ?? "Active") as EnvironmentStatus)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Synced">Synced</SelectItem>
                            <SelectItem value="Protected">Protected</SelectItem>
                          </SelectContent>
                        </Select>
                        <Badge variant={statusBadgeVariant(environment.status)}>
                          {environment.status}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {paginatedEnvironments.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, environments.length)} of {environments.length} environments
              </p>
              <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
