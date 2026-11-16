import mongoose from "mongoose";
import {
    createWorkspace,
    getUserWorkspaces,
    getWorkspaceDetails,
    updateWorkspaceDetails,
    deleteWorkspace,
} from "./workspace.service.js";
import { createWorkspaceSchema, updateWorkspaceSchema, } from "./workspace.validation.js";
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


export const getUserWorkspacesController = async (req, res, next) => {
    try {
        const workspaces = await getUserWorkspaces(req.user.id);

        return res.status(200).json({
            success: true,
            message: "Workspaces retrieved successfully",
            data: {
                workspaces,
            },
        });
    } catch (error) {
        next(error);
    }
};


export const getWorkspaceDetailsController = async (req, res, next) => {
    try {
        const { workspaceId } = req.params;

        if (!mongoose.isValidObjectId(workspaceId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid workspace ID",
            });
        }

        const workspace = await getWorkspaceDetails(
            workspaceId,
            req.user.id
        );

        if (!workspace) {
            return res.status(404).json({
                success: false,
                message: "Workspace not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Workspace retrieved successfully",
            data: { workspace },
        });
    } catch (error) {
        next(error);
    }
};


export const updateWorkspaceController = async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.workspaceId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid workspace ID",
            });
        }
        
        const validation = updateWorkspaceSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validation.error.issues,
            });
        }

        const result = await updateWorkspaceDetails(
            req.params.workspaceId,
            req.user.id,
            validation.data
        );

        if (result.status === "NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Workspace not found",
            });
        }

        if (result.status === "FORBIDDEN") {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to update this workspace",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Workspace updated successfully",
            data: {
                workspace: result.workspace,
            },
        });
    } catch (error) {
        next(error);
    }
};



export const deleteWorkspaceController = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.workspaceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace ID",
      });
    }

    const result = await deleteWorkspace(
      req.params.workspaceId,
      req.user.id
    );

    if (result.status === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    if (result.status === "FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: "Only the workspace owner can delete this workspace",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Workspace deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
