
import mongoose from "mongoose";
import { env } from "../../src/config/env.js";

const migrate = async () => {
    try {
        await mongoose.connect(env.MONGO_URI);

        const result = await mongoose.connection
            .collection("workspacemembers")
            .updateMany(
                {
                    status: { $exists: false },
                },
                [
                    {
                        $set: {
                            status: "ACCEPTED",
                            acceptedAt: "$joinedAt",
                        },
                    },
                ]
            );

        console.log("Workspace membership migration completed.");
        console.log(`Matched: ${result.matchedCount}`);
        console.log(`Modified: ${result.modifiedCount}`);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

await migrate();
