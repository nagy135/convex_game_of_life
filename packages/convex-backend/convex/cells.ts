import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cells")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();
  },
});

// Toggle a cell at position (x, y) - if it exists, delete it; if not, create it
export const toggle = mutation({
  args: {
    boardId: v.id("boards"),
    x: v.number(),
    y: v.number(),
  },
  handler: async (ctx, args) => {
    // Find if cell already exists at this position
    const existingCells = await ctx.db
      .query("cells")
      .withIndex("by_board", (q) => q.eq("boardId", args.boardId))
      .collect();

    const existingCell = existingCells.find(
      (cell) => cell.x === args.x && cell.y === args.y
    );

    if (existingCell) {
      // Cell exists, delete it (kill it)
      await ctx.db.delete(existingCell._id);
    } else {
      // Cell doesn't exist, create it (bring it to life)
      await ctx.db.insert("cells", {
        boardId: args.boardId,
        x: args.x,
        y: args.y,
      });
    }
  },
});
