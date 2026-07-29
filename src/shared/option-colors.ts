import { z } from "zod";

export const assignmentOptionColorSchema = z
  .string()
  .regex(/^#[0-9A-F]{6}$/, "Color must use uppercase #RRGGBB format");

export type AssignmentOptionColor = z.infer<typeof assignmentOptionColorSchema>;

export const defaultAssignmentOptionColor: AssignmentOptionColor = "#39845B";

export function normalizeAssignmentOptionColor(value: string): AssignmentOptionColor {
  return value.toUpperCase();
}
