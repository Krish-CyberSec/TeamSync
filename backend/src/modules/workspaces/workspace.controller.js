
import { createWorkspace } from "./workspace.service.js";
import { createWorkspaceSchema } from "./workspace.validation.js";

export const createWorkspaceController = async (req, res, next) => {
    try {
        // Validate incoming request body.
        const result = createWorkspaceSchema.safeParse(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: result.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        // User identity comes from authentication middleware.
        const userId = req.user.id;

        // Execute transactional workspace creation.
        const workspace = await createWorkspace({
            ...result.data,
            userId,
        });

        return res.status(201).json({
            success: true,
            message: "Workspace created successfully",
            data: {
                workspace: {
                    id: workspace._id,
                    name: workspace.name,
                    slug: workspace.slug,
                    description: workspace.description,
                    createdBy: workspace.createdBy,
                    createdAt: workspace.createdAt,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};
