import React, { useState, useEffect, useCallback, useRef } from "react";
import ChevronDownIcon from "../../assets/chevron-down.svg?react";
import { useSelector } from "react-redux";
import type { RootState } from "../../store";
import { apiService } from "../../services/api/ApiService";

interface Board {
  id: string;
  title: string;
  description: string;
}

const ITEMS_PER_PAGE = 5;

const BoardPicker: React.FC<{
  boardSearchTerm: string;
  selectedBoardId: string | null;
  setSelectedBoardId: (id: string | null) => void;
  setBoardSearchTerm: (term: string) => void;
  handleApplyFilters: () => void;
}> = ({
  boardSearchTerm,
  selectedBoardId,
  setSelectedBoardId,
  setBoardSearchTerm,
  handleApplyFilters,
}) => {
  const workspaceId = useSelector(
    (state: RootState) => state.workspace.selectedWorkspace?.id
  );

  const [boards, setBoards] = useState<Board[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const fetchBoards = useCallback(async () => {
    if (!workspaceId) return;

    setIsFetching(true);
    try {
      const params = new URLSearchParams();
      params.append("page", "1");
      params.append("limit", ITEMS_PER_PAGE.toString());
      params.append("workspaceId", workspaceId);
      if (boardSearchTerm.trim()) params.append("search", boardSearchTerm);

      const response = await apiService.get(`/v1/boards/paginated?${params}`, {
        withCredentials: true,
      });

      const res = response as { data?: Board[]; boards?: Board[] };
      const boardsData = res.data || res.boards || [];
      setBoards(boardsData);
    } catch (err) {
      console.error("Error fetching boards:", err);
      setBoards([]);
    } finally {
      setIsFetching(false);
    }
  }, [workspaceId, boardSearchTerm]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  // 🔒 Cierra el menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col w-full sm:w-40 relative">
      <label
        htmlFor="board-picker"
        className="text-xs text-text-secondary font-medium mb-1"
      >
        Board
      </label>

      <div className="relative">
        <input
          id="board-picker"
          ref={inputRef}
          value={boardSearchTerm}
          onChange={(e) => {
            setBoardSearchTerm(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          placeholder="Select board..."
          className="w-full px-3 py-1.5 bg-dark-600 text-text-primary rounded-lg border border-dark-600 focus:outline-none focus:border-limeyellow-500 transition-colors appearance-none cursor-pointer text-sm"
        />
        <ChevronDownIcon
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-secondary cursor-pointer transition-transform ${
            isDropdownOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top:
              inputRef.current?.getBoundingClientRect().bottom! +
              window.scrollY +
              4,
            left: inputRef.current?.getBoundingClientRect().left,
            width: inputRef.current?.offsetWidth,
          }}
          className="rounded-lg border border-dark-600 bg-dark-900 text-sm text-text-primary shadow-xl z-[9999] max-h-60 overflow-y-auto animate-fade-in"
        >
          {isFetching ? (
            <div className="px-3 py-2 text-text-secondary text-xs">
              Loading...
            </div>
          ) : boards.length > 0 ? (
            boards.map((board) => (
              <div
                key={board.id}
                onMouseDown={() => {
                  setSelectedBoardId(board.id);
                  setBoardSearchTerm(board.title);
                  setIsDropdownOpen(false);
                  handleApplyFilters();
                }}
                className={`px-3 py-2 cursor-pointer transition-colors text-sm ${
                  selectedBoardId === board.id
                    ? "bg-limeyellow-500 text-white"
                    : "hover:bg-limeyellow-500 hover:text-white text-text-primary"
                }`}
              >
                {board.title}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-text-secondary text-xs">
              No boards found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BoardPicker;
