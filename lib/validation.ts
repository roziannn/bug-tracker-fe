import { z } from "zod";
import { parseDateOnly } from "@/lib/date";

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  roleId: z.number().int().positive("Role is required"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const roleSchema = z.object({
  name: z.string().trim().min(1, "Role name is required").max(100, "Role name must be at most 100 characters"),
  isActive: z.boolean().optional(),
});

export type RoleInput = z.infer<typeof roleSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  roleId: z.number().int().positive("Role is required"),
  isActive: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const menuSchema = z.object({
  label: z.string().trim().min(1, "Menu name is required").max(100, "Menu name must be at most 100 characters"),
  path: z.string().trim().max(255, "Path must be at most 255 characters").default(""),
  icon: z.string().trim().min(1).max(50).default("Circle"),
  parentId: z.string().nullable().default(null),
  actions: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string().trim().min(1, "Button name is required").max(100, "Button name must be at most 100 characters"),
      })
    )
    .default([]),
});

export type MenuInput = z.infer<typeof menuSchema>;

export const menuVisibleSchema = z.object({ visible: z.boolean() });

export const menuMoveSchema = z.object({ direction: z.union([z.literal(-1), z.literal(1)]) });

export const roleAccessSchema = z.object({
  menus: z.array(z.string()).default([]),
  actions: z.array(z.string()).default([]),
});

const envKey = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, "Key is required")
  .max(100, "Key must be at most 100 characters")
  .regex(/^[A-Z][A-Z0-9_]*$/, "Key must use uppercase letters, numbers, and underscores, starting with a letter");

export const createEnvVarSchema = z.object({
  environment: z.string().trim().min(1, "Environment is required").max(50, "Environment must be at most 50 characters"),
  label: z.string().trim().max(100, "Label must be at most 100 characters").default(""),
  key: envKey,
  value: z.string().max(10000, "Value is too long").default(""),
  isSecret: z.boolean().default(false),
});

export type CreateEnvVarInput = z.infer<typeof createEnvVarSchema>;

// Saat edit, value yang tidak dikirim berarti nilai lama dipertahankan.
export const updateEnvVarSchema = z.object({
  label: z.string().trim().max(100, "Label must be at most 100 characters").default(""),
  key: envKey,
  value: z.string().max(10000, "Value is too long").optional(),
  isSecret: z.boolean().default(false),
});

export type UpdateEnvVarInput = z.infer<typeof updateEnvVarSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  description: z.string().trim().max(255, "Description must be at most 255 characters").default(""),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const categoryActiveSchema = z.object({ isActive: z.boolean() });

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const dateOnly = z.string().refine((value) => parseDateOnly(value) !== null, "Date is invalid");

export const createProjectSchema = z
  .object({
    name: z.string().trim().min(1, "Project name is required").max(150, "Project name must be at most 150 characters"),
    ownerId: z.number({ error: "Owner is required" }).int().positive("Owner is required"),
    description: z.string().trim().max(5000, "Description must be at most 5000 characters").default(""),
    goLiveDate: z
      .string()
      .default("")
      .refine((value) => value === "" || parseDateOnly(value) !== null, "Go Live date is invalid"),
    tags: z.array(z.number().int().positive()).max(50, "Too many tags").default([]),
    repositories: z.array(z.string().trim().max(255, "Repository must be at most 255 characters")).max(50, "Too many repositories").default([]),
    environments: z.record(z.string(), z.string()).default({}),
    phases: z
      .array(
        z
          .object({
            name: z.string().trim().min(1, "Phase name is required").max(100, "Phase name must be at most 100 characters"),
            start: dateOnly,
            end: dateOnly,
          })
          .refine((phase) => parseDateOnly(phase.end)! >= parseDateOnly(phase.start)!, {
            message: "A phase end date must be on or after its start date",
          })
      )
      .max(50, "Too many phases")
      .default([]),
  })
  .superRefine((value, ctx) => {
    for (const [environment, url] of Object.entries(value.environments)) {
      if (environment.trim().length === 0 || environment.length > 50) {
        ctx.addIssue({ code: "custom", message: "Environment name must be 1-50 characters", path: ["environments", environment] });
      } else if (url.trim() && (url.trim().length > 500 || !isHttpUrl(url.trim()))) {
        ctx.addIssue({ code: "custom", message: `${environment} URL must start with http:// or https://`, path: ["environments", environment] });
      }
    }
  });

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
