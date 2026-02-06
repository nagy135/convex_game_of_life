import { useQuery, useMutation } from "convex/react";
import { api } from "@repo/convex-backend/convex/_generated/api";
import { useState, useEffect, useCallback } from "react";
import { Id } from "@repo/convex-backend/convex/_generated/dataModel";

const GRID_SIZE = 30;
const CELL_SIZE = 16;

function App() {
  const [selectedBoardId, setSelectedBoardId] = useState<Id<"boards"> | null>(
    null
  );
  const [newBoardName, setNewBoardName] = useState("");

  const boards = useQuery(api.board.list);
  const board = useQuery(
    api.board.get,
    selectedBoardId ? { id: selectedBoardId } : "skip"
  );
  const cells = useQuery(
    api.cells.list,
    selectedBoardId ? { boardId: selectedBoardId } : "skip"
  );

  const createBoard = useMutation(api.board.create);
  const togglePause = useMutation(api.board.togglePause);
  const tick = useMutation(api.board.tick);
  const clearBoard = useMutation(api.board.clear);
  const toggleCell = useMutation(api.cells.toggle);

  // Auto-select first board if none selected
  useEffect(() => {
    if (!selectedBoardId && boards && boards.length > 0) {
      setSelectedBoardId(boards[0]._id);
    }
  }, [boards, selectedBoardId]);

  // Run tick automatically when not paused
  useEffect(() => {
    if (!board || board.isPaused || !selectedBoardId) return;

    const interval = setInterval(() => {
      tick({ id: selectedBoardId });
    }, 200);

    return () => clearInterval(interval);
  }, [board, selectedBoardId, tick]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    const id = await createBoard({ name: newBoardName });
    setSelectedBoardId(id);
    setNewBoardName("");
  };

  const handleCellClick = useCallback(
    (x: number, y: number) => {
      if (!selectedBoardId) return;
      toggleCell({ boardId: selectedBoardId, x, y });
    },
    [selectedBoardId, toggleCell]
  );

  // Create a set of living cells for fast lookup
  const livingCells = new Set<string>();
  if (cells) {
    for (const cell of cells) {
      livingCells.add(`${cell.x},${cell.y}`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Game of Life</h1>

        {/* Board selector and creator */}
        <div className="mb-6 flex flex-wrap gap-4 items-center justify-center">
          <form onSubmit={handleCreateBoard} className="flex gap-2">
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="New board name..."
              className="px-4 py-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              Create Board
            </button>
          </form>

          {boards && boards.length > 0 && (
            <select
              value={selectedBoardId || ""}
              onChange={(e) =>
                setSelectedBoardId(e.target.value as Id<"boards">)
              }
              className="px-4 py-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500"
            >
              {boards.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Controls */}
        {selectedBoardId && board && (
          <div className="mb-6 flex gap-4 justify-center">
            <button
              onClick={() => togglePause({ id: selectedBoardId })}
              className={`px-6 py-2 rounded transition-colors ${
                board.isPaused
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-yellow-600 hover:bg-yellow-700"
              }`}
            >
              {board.isPaused ? "Play" : "Pause"}
            </button>
            <button
              onClick={() => tick({ id: selectedBoardId })}
              disabled={!board.isPaused}
              className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Step
            </button>
            <button
              onClick={() => clearBoard({ id: selectedBoardId })}
              className="px-6 py-2 bg-red-600 rounded hover:bg-red-700 transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        {/* Grid */}
        {selectedBoardId && (
          <div className="flex justify-center">
            <div
              className="grid bg-gray-800 border border-gray-700 rounded"
              style={{
                gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL_SIZE}px)`,
                gap: "1px",
              }}
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                const x = i % GRID_SIZE;
                const y = Math.floor(i / GRID_SIZE);
                const isAlive = livingCells.has(`${x},${y}`);

                return (
                  <div
                    key={`${x},${y}`}
                    onClick={() => handleCellClick(x, y)}
                    className={`cursor-pointer transition-colors ${
                      isAlive
                        ? "bg-green-500 hover:bg-green-400"
                        : "bg-gray-700 hover:bg-gray-600"
                    }`}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Stats */}
        {cells && (
          <p className="mt-4 text-center text-gray-400">
            Living cells: {cells.length}
          </p>
        )}

        {/* Empty state */}
        {(!boards || boards.length === 0) && (
          <p className="text-center text-gray-500">
            No boards yet. Create one above to start!
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
