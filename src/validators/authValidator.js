import { z } from "zod";

export const createStaffSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(128),
  full_name: z.string().trim().min(2).max(100),
  role: z.enum(["admin", "instructor"]),
});

export const registerSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(128),
  full_name: z.string().trim().min(2).max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128),
});

export const updateProfileSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1).max(128),
  new_password: z.string().min(6).max(128),
});
