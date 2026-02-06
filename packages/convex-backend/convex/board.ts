import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const get = query({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("boards").collect();
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("boards", {
      name: args.name,
      isPaused: true,
    });
  },
});

export const togglePause = mutation({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.id);
    if (!board) throw new Error("Board not found");
    await ctx.db.patch(args.id, { isPaused: !board.isPaused });
  },
});

// Game of Life tick - applies the rules:
// 1. Any live cell with 2 or 3 neighbors survives
// 2. Any dead cell with exactly 3 neighbors becomes alive
// 3. All other live cells die, all other dead cells stay dead
// Throttled to prevent multiple clients from triggering simultaneous ticks
const TICK_THROTTLE_MS = 150; // Slightly less than client interval to allow graceful updates

export const tick = mutation({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    const board = await ctx.db.get(args.id);
    if (!board) throw new Error("Board not found");
    if (board.isPaused) return;

    // Throttle tick calls - only allow one tick per TICK_THROTTLE_MS
    const now = Date.now();
    const lastTick = board.lastTickTime || 0;
    if (now - lastTick < TICK_THROTTLE_MS) {
      return; // Ignore this tick call, too soon
    }

    // Get all living cells for this board
    const cells = await ctx.db
      .query("cells")
      .withIndex("by_board", (q) => q.eq("boardId", args.id))
      .collect();

    // Create a set of living cell positions for fast lookup
    const livingCells = new Set<string>();
    for (const cell of cells) {
      livingCells.add(`${cell.x},${cell.y}`);
    }

    // Count neighbors for each cell and its adjacent cells
    const neighborCounts = new Map<string, number>();

    for (const cell of cells) {
      // Check all 8 neighbors
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cell.x + dx;
          const ny = cell.y + dy;
          const key = `${nx},${ny}`;
          neighborCounts.set(key, (neighborCounts.get(key) || 0) + 1);
        }
      }
    }

    // Determine which cells should live in the next generation
    const nextGeneration = new Set<string>();

    // Check living cells - survive with 2 or 3 neighbors
    for (const cell of cells) {
      const key = `${cell.x},${cell.y}`;
      const neighbors = neighborCounts.get(key) || 0;
      if (neighbors === 2 || neighbors === 3) {
        nextGeneration.add(key);
      }
    }

    // Check dead cells with neighbors - become alive with exactly 3 neighbors
    for (const [key, count] of neighborCounts) {
      if (!livingCells.has(key) && count === 3) {
        nextGeneration.add(key);
      }
    }

    // Delete cells that should die
    for (const cell of cells) {
      const key = `${cell.x},${cell.y}`;
      if (!nextGeneration.has(key)) {
        await ctx.db.delete(cell._id);
      }
    }

     // Create new cells
     for (const key of nextGeneration) {
       if (!livingCells.has(key)) {
         const [x, y] = key.split(",").map(Number);
         await ctx.db.insert("cells", {
           boardId: args.id,
           x,
           y,
         });
       }
     }

     // Update last tick time for throttling
     await ctx.db.patch(args.id, { lastTickTime: now });
   },
});

export const clear = mutation({
  args: { id: v.id("boards") },
  handler: async (ctx, args) => {
    const cells = await ctx.db
      .query("cells")
      .withIndex("by_board", (q) => q.eq("boardId", args.id))
      .collect();

    for (const cell of cells) {
      await ctx.db.delete(cell._id);
    }
  },
});
