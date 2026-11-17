
import mongoose from "mongoose";

const workspaceMemberSchema = new mongoose.Schema(
    {
        workspace: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        role: {
            type: String,
            enum: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
            default: "MEMBER",
            required: true,
        },


        status: {
            type: String,
            enum: ["PENDING", "ACCEPTED", "DECLINED"],
            default: "ACCEPTED",
            required: true,
            index: true,
        },

        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        acceptedAt: {
            type: Date,
            default: Date.now,
        },

        declinedAt: {
            type: Date,
            default: null,
        },


        joinedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// A user can have only one membership per workspace.
workspaceMemberSchema.index(
    { workspace: 1, user: 1 },
    { unique: true }
);

const WorkspaceMember = mongoose.model(
    "WorkspaceMember",
    workspaceMemberSchema
);

export default WorkspaceMember;
