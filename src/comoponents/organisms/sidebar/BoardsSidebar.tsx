import React, { useEffect, useState, useRef, useCallback } from "react";
import CloseIcon from "../../../assets/x.svg?react";
import SearchIcon from "../../../assets/search.svg?react";
import BoardPreviewCard from "../../atoms/BoardPreviewCard";
import { setSelectedBoard } from "../../../store/slices/workspaceSlice";
import { apiService } from "../../../services/api/ApiService";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../../store";

interface Board {
  id: string;
  title: string;
  description?: string | null;
  color?: string;
}

const COLOR_PALETTE = [
  "#FACC15", // amarillo
  "#60A5FA", // azul
  "#FB7185", // rosa
  "#34D399", // verde
  "#A78BFA", // violeta
  "#F97316", // naranja
];

const stringToColor = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  const idx = Math.abs(h) % COLOR_PALETTE.length;
  return COLOR_PALETTE[idx];
};

const LIMIT = 10;

const BoardsSidebar: React.FC = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [tempSearchTerm, setTempSearchTerm] = useState("");

  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingRef = useRef(false); // 🔒 evita llamadas duplicadas

  const dispatch = useDispatch();
  const { selectedWorkspace, selectedBoard } = useSelector(
    (state: RootState) => state.workspace
  );
  const WORKSPACE_ID = selectedWorkspace?.id;

  const fetchBoards = useCallback(
    async (pageNumber = 1, replace = false, search = "") => {
      if (!WORKSPACE_ID || isFetchingRef.current) return;

      isFetchingRef.current = true;
      try {
        setLoading(true);
        setError(null);

        const query = new URLSearchParams({
          page: String(pageNumber),
          limit: String(LIMIT),
          workspaceId: WORKSPACE_ID,
        });
        if (search.trim()) query.append("search", search.trim());

        const response = await apiService.get<{ items: Board[] }>(
          `/v1/boards/paginated?${query.toString()}`
        );

        const boardsData = response?.items ?? [];

        setBoards((prev) =>
          replace
            ? boardsData
            : [
                ...prev,
                ...boardsData.filter(
                  (b) => !prev.some((existing) => existing.id === b.id)
                ),
              ]
        );

        setHasMore(boardsData.length === LIMIT);
      } catch (err) {
        console.error("Error fetching boards:", err);
        setError("No se pudieron cargar los tableros");
        setHasMore(false);
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
        setInitialLoadDone(true);
      }
    },
    [WORKSPACE_ID]
  );

  useEffect(() => {
    setInitialLoadDone(false);
    setBoards([]);
    fetchBoards(1, true, searchTerm);
  }, [fetchBoards, searchTerm]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    const rootEl = scrollContainerRef.current;
    if (!sentinel || !rootEl) return;

    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry.isIntersecting &&
          hasMore &&
          !loading &&
          !isFetchingRef.current
        ) {
          const nextPage = Math.floor(boards.length / LIMIT) + 1;
          fetchBoards(nextPage, false, searchTerm);
        }
      },
      { root: rootEl, rootMargin: "150px", threshold: 0.1 }
    );

    observer.current.observe(sentinel);
    return () => observer.current?.disconnect();
  }, [boards, hasMore, loading, fetchBoards, searchTerm]);

  const handleSearchChange = (value: string) => {
    setTempSearchTerm(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchTerm(value);
    }, 400);
  };

  const handleResetFilters = useCallback(() => {
    setTempSearchTerm("");
    setSearchTerm("");
  }, []);

  return (
    <aside className="flex flex-col h-full rounded-2xl overflow-hidden z-30">
      {/* 🔍 Buscador */}
      <div className="p-3 border-b border-dark-600">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={tempSearchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar por título..."
              className="w-full px-3 py-1.5 pr-8 bg-dark-800 text-text-primary rounded-lg border border-dark-600 focus:outline-none focus:border-limeyellow-500 transition-colors text-sm"
            />

            {tempSearchTerm ? (
              <button
                onClick={handleResetFilters}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            ) : (
              <SearchIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            )}
          </div>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 scrollbar-hide"
      >
        {boards.map((b) => (
          <BoardPreviewCard
            key={b.id}
            title={b.title}
            color={b.color || stringToColor(b.id)}
            isActive={selectedBoard?.id === b.id}
            onClick={() => dispatch(setSelectedBoard(b))}
          />
        ))}

        {loading && (
          <p className="text-sm text-text-secondary text-center animate-pulse">
            Cargando tableros...
          </p>
        )}

        {!loading && initialLoadDone && boards.length === 0 && (
          <p className="text-sm text-text-secondary text-center mt-4">
            No se encontraron tableros.
          </p>
        )}

        {error && (
          <p className="text-sm text-red-400 text-center mt-2">{error}</p>
        )}

        <div ref={loadMoreRef} className="h-10" />
      </div>
    </aside>
  );
};

export default BoardsSidebar;
