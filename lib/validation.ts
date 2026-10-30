import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
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
