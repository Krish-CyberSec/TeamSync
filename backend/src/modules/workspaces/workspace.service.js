
import mongoose from "mongoose";
import User from "../users/user.model.js";
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
                        status: "ACCEPTED",
                        acceptedAt: new Date(),
                        joinedAt: new Date(),
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
    const memberships = await WorkspaceMember.find({
        user: userId,
        status: "ACCEPTED",
    })
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
        status: "ACCEPTED",
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
        status: "ACCEPTED",
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
        status: "ACCEPTED",
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


export const getWorkspaceMembers = async (workspaceId, userId) => {
    // First, verify that the requesting user belongs to an active workspace.
    const membership = await WorkspaceMember.findOne({
        workspace: workspaceId,
        user: userId,
        status: "ACCEPTED",
    })
        .populate({
            path: "workspace",
            match: { status: { $ne: "DELETED" } },
            select: "_id",
        })
        .lean();

    if (!membership || !membership.workspace) {
        return null;
    }

    // Fetch all members belonging to this workspace.
    const members = await WorkspaceMember.find({
        workspace: workspaceId,
        status: "ACCEPTED",
    })
        .populate({
            path: "user",
            select: "name email",
        })
        .sort({ joinedAt: 1 })
        .lean();

    return members
        .filter((member) => member.user)
        .map((member) => ({
            userId: member.user._id,
            name: member.user.name,
            email: member.user.email,
            role: member.role,
            joinedAt: member.joinedAt,
        }));
};


export const inviteWorkspaceMember = async ({
    workspaceId,
    inviterUserId,
    email,
}) => {
    // 1. Verify that the workspace exists and is active.
    const workspace = await Workspace.findOne({
        _id: workspaceId,
        status: "ACTIVE",
    })
        .select("_id")
        .lean();

    if (!workspace) {
        return { status: "NOT_FOUND" };
    }

    // 2. Verify that the inviter is an accepted OWNER or ADMIN.
    const inviterMembership = await WorkspaceMember.findOne({
        workspace: workspaceId,
        user: inviterUserId,
        status: "ACCEPTED",
    })
        .select("role")
        .lean();

    if (!inviterMembership) {
        return { status: "NOT_FOUND" };
    }

    if (!["OWNER", "ADMIN"].includes(inviterMembership.role)) {
        return { status: "FORBIDDEN" };
    }

    // 3. Find the registered user by normalized email.
    const normalizedEmail = email.trim().toLowerCase();

    const invitedUser = await User.findOne({
        email: normalizedEmail,
    })
        .select("_id email")
        .lean();

    if (!invitedUser) {
        return { status: "USER_NOT_FOUND" };
    }

    // 4. Prevent users from inviting themselves.
    if (invitedUser._id.toString() === inviterUserId.toString()) {
        return { status: "SELF_INVITATION" };
    }

    // 5. Check whether a membership already exists.
    const existingMembership = await WorkspaceMember.findOne({
        workspace: workspaceId,
        user: invitedUser._id,
    });

    if (existingMembership) {
        if (existingMembership.status === "ACCEPTED") {
            return { status: "ALREADY_MEMBER" };
        }

        if (existingMembership.status === "PENDING") {
            return { status: "INVITATION_PENDING" };
        }

        // Reuse a declined membership instead of inserting a duplicate.
        existingMembership.status = "PENDING";
        existingMembership.role = "MEMBER";
        existingMembership.invitedBy = inviterUserId;
        existingMembership.acceptedAt = null;
        existingMembership.declinedAt = null;
        existingMembership.joinedAt = null;

        await existingMembership.save();

        return {
            status: "INVITATION_CREATED",
            invitation: {
                id: existingMembership._id,
                email: invitedUser.email,
                status: existingMembership.status,
            },
        };
    }

    // 6. Create a new pending invitation.
    let invitation;

    try {
        invitation = await WorkspaceMember.create({
            workspace: workspaceId,
            user: invitedUser._id,
            role: "MEMBER",
            status: "PENDING",
            invitedBy: inviterUserId,
            acceptedAt: null,
            declinedAt: null,
            joinedAt: null,
        });
    } catch (error) {
        if (error.code === 11000) {
            const currentMembership = await WorkspaceMember.findOne({
                workspace: workspaceId,
                user: invitedUser._id,
            }).select("status").lean();

            if (currentMembership?.status === "ACCEPTED") {
                return { status: "ALREADY_MEMBER" };
            }

            return { status: "INVITATION_PENDING" };
        }

        throw error;
    }

    return {
        status: "INVITATION_CREATED",
        invitation: {
            id: invitation._id,
            email: invitedUser.email,
            status: invitation.status,
        },
    };
};
