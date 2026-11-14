
import test, { after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { env } from "../../src/config/env.js";

const collectionName = "teamsync_transaction_probe";

after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test("MongoDB commits multiple writes atomically", async () => {
  await mongoose.connect(env.MONGO_URI);

  const db = mongoose.connection.db;
  const collections = await db
    .listCollections({ name: collectionName })
    .toArray();

  if (collections.length === 0) {
    await db.createCollection(collectionName);
  }

  const collection = db.collection(collectionName);

  const firstId = new mongoose.Types.ObjectId();
  const secondId = new mongoose.Types.ObjectId();

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(
      async () => {
        await collection.insertMany(
          [
            { _id: firstId, label: "transaction-test-1" },
            { _id: secondId, label: "transaction-test-2" },
          ],
          { session }
        );
      },
      {
        readPreference: "primary",
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      }
    );

    const count = await collection.countDocuments({
      _id: { $in: [firstId, secondId] },
    });

    assert.equal(count, 2);
  } finally {
    await collection.deleteMany({
      _id: { $in: [firstId, secondId] },
    });

    await session.endSession();
  }
});



test("MongoDB rolls back writes when a transaction fails", async () => {
  const db = mongoose.connection.db;
  const collection = db.collection(collectionName);

  const testId = new mongoose.Types.ObjectId();
  const session = await mongoose.startSession();

  try {
    await assert.rejects(
      session.withTransaction(async () => {
        await collection.insertOne(
          {
            _id: testId,
            label: "rollback-test",
          },
          { session }
        );

        // Deliberately fail after the insert.
        throw new Error("Intentional rollback test");
      }),
      /Intentional rollback test/
    );

    // Check outside the transaction.
    const document = await collection.findOne({ _id: testId });

    assert.equal(document, null);
  } finally {
    await collection.deleteOne({ _id: testId });
    await session.endSession();
  }
});
