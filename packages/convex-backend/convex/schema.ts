import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  boards: defineTable({
    name: v.string(),
    isPaused: v.boolean(),
  }),
  cells: defineTable({
    boardId: v.id("boards"),
    x: v.number(),
    y: v.number(),
  }).index("by_board", ["boardId"]),
});
