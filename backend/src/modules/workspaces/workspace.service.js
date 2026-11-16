
import mongoose from "mongoose";

import Workspace from "./workspace.model.js";
import WorkspaceMember from "./workspace-member.model.js";

export const createWorkspace = async ({
    name,
    slug,
    description = "",
    userId,
}) => {
    const session = await mongoose.startSession();

    let workspace;

    try {
        await session.withTransaction(async () => {
            // Create the workspace.
            const [createdWorkspace] = await Workspace.create(
                [
                    {
                        name,
                        slug,
                        description,
                        createdBy: userId,
                    },
                ],
                { session }
            );

            // Automatically make the creator the workspace OWNER.
            await WorkspaceMember.create(
                [
                    {
                        workspace: createdWorkspace._id,
                        user: userId,
                        role: "OWNER",
                    },
                ],
                { session }
            );

            workspace = createdWorkspace;
        });

        return workspace;
    } finally {
        await session.endSession();
    }
};

export const getUserWorkspaces = async (userId) => {
    const memberships = await WorkspaceMember.find({ user: userId })
        .populate({
            path: "workspace",
            match: { status: { $ne: "DELETED" } },
            select: "name slug description createdBy createdAt updatedAt",
        })
        .sort({ joinedAt: -1 })
        .lean();

    return memberships
        .filter((membership) => membership.workspace)
        .map((membership) => ({
            id: membership.workspace._id,
            name: membership.workspace.name,
            slug: membership.workspace.slug,
            description: membership.workspace.description,
            createdBy: membership.workspace.createdBy,
            role: membership.role,
            joinedAt: membership.joinedAt,
            createdAt: membership.workspace.createdAt,
            updatedAt: membership.workspace.updatedAt,
        }));
};


export const getWorkspaceDetails = async (workspaceId, userId) => {
    const membership = await WorkspaceMember.findOne({
        workspace: workspaceId,
        user: userId,
    })
        .populate({
            path: "workspace",
            match: { status: { $ne: "DELETED" } },
            select: "name slug description createdBy createdAt updatedAt",
        })
        .lean();

    if (!membership || !membership.workspace) {
        return null;
    }

    return {
        id: membership.workspace._id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
        description: membership.workspace.description,
        createdBy: membership.workspace.createdBy,
        role: membership.role,
        joinedAt: membership.joinedAt,
        createdAt: membership.workspace.createdAt,
        updatedAt: membership.workspace.updatedAt,
    };
};


export const updateWorkspaceDetails = async (
    workspaceId,
    userId,
    updates
) => {
    const membership = await WorkspaceMember.findOne({
        workspace: workspaceId,
        user: userId,
    })
        .select("role")
        .lean();

    if (!membership) {
        return { status: "NOT_FOUND" };
    }

    if (!["OWNER", "ADMIN"].includes(membership.role)) {
        return { status: "FORBIDDEN" };
    }
    const workspace = await Workspace.findOneAndUpdate(
        {
            _id: workspaceId,
            status: { $ne: "DELETED" },
        },
        {
            $set: updates,
        },
        {
            returnDocument: "after",
            runValidators: true,
        }
    )
        .select("name slug description createdBy createdAt updatedAt")
        .lean();

    if (!workspace) {
        return { status: "NOT_FOUND" };
    }

    return {
        status: "UPDATED",
        workspace: {
            id: workspace._id,
            name: workspace.name,
            slug: workspace.slug,
            description: workspace.description,
            createdBy: workspace.createdBy,
            role: membership.role,
            createdAt: workspace.createdAt,
            updatedAt: workspace.updatedAt,
        },
    };
};


export const deleteWorkspace = async (workspaceId, userId) => {
    const membership = await WorkspaceMember.findOne({
        workspace: workspaceId,
        user: userId,
    })
        .select("role")
        .lean();

    if (!membership) {
        return { status: "NOT_FOUND" };
    }

    if (membership.role !== "OWNER") {
        return { status: "FORBIDDEN" };
    }

    const workspace = await Workspace.findOneAndUpdate(
        {
            _id: workspaceId,
            status: { $ne: "DELETED" },
        },
        {
            $set: {
                status: "DELETED",
                deletedAt: new Date(),
            },
        },
        {
            returnDocument: "after",
            runValidators: true,
        }
    ).lean();

    if (!workspace) {
        return { status: "NOT_FOUND" };
    }

    return { status: "DELETED" };
};
