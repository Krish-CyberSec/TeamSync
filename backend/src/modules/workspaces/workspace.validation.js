
import { z } from "zod";

export const createWorkspaceSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(2, "Workspace name must contain at least 2 characters")
            .max(80, "Workspace name cannot exceed 80 characters"),

        slug: z
            .string()
            .trim()
            .toLowerCase()
            .min(2, "Workspace slug must contain at least 2 characters")
            .max(80, "Workspace slug cannot exceed 80 characters")
            .regex(
                /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                "Slug can contain lowercase letters, numbers and single hyphens"
            ),

        description: z
            .string()
            .trim()
            .max(500, "Description cannot exceed 500 characters")
            .optional()
            .default(""),
    })
    .strict();



export const updateWorkspaceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Workspace name must be at least 2 characters")
      .max(80, "Workspace name cannot exceed 80 characters")
      .optional(),

    description: z
      .string()
      .trim()
      .max(500, "Description cannot exceed 500 characters")
      .optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined,
    {
      message: "At least one field must be provided",
    }
  );
