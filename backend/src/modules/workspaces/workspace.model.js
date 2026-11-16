
import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 80,
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        },
        status: {
            type: String,
            enum: ["ACTIVE", "DELETED"],
            default: "ACTIVE",
            index: true,
        },

        deletedAt: {
            type: Date,
            default: null,
        },

        description: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const Workspace = mongoose.model("Workspace", workspaceSchema);

export default Workspace;
