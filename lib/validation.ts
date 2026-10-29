import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi"),
  email: z.string().trim().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  roleId: z.number().int().positive("Role wajib dipilih"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const roleSchema = z.object({
  name: z.string().trim().min(1, "Nama role wajib diisi").max(100, "Nama role maksimal 100 karakter"),
  isActive: z.boolean().optional(),
});

export type RoleInput = z.infer<typeof roleSchema>;
