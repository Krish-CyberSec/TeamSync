
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
