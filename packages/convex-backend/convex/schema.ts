import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  boards: defineTable({
    name: v.string(),
    isPaused: v.boolean(),
    lastTickTime: v.optional(v.number()),
  }),
  cells: defineTable({
    boardId: v.id("boards"),
    x: v.number(),
    y: v.number(),
  }).index("by_board", ["boardId"]),
});
