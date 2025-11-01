import React, { useEffect, useState, useRef, useCallback } from "react";
import BoardPreviewCard from "../../atoms/BoardPreviewCard";
import ModalBase from "../../atoms/ModalBase";
import { apiService } from "../../../services/api/ApiService";
import { useSelector } from "react-redux";
import { HexColorPicker } from "react-colorful";
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

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);

  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const { selectedWorkspace } = useSelector(
    (state: RootState) => state.workspace
  );
  const WORKSPACE_ID = selectedWorkspace?.id;

  // Función de fetch de boards
  const fetchBoards = useCallback(
    async (pageNumber = 1, replace = false) => {
      if (!WORKSPACE_ID) return;
      try {
        setLoading(true);
        setError(null);

        const response = await apiService.get<{
          items: Board[];
          total?: number;
        }>(
          `/v1/boards/paginated?page=${pageNumber}&limit=${LIMIT}&workspaceId=${WORKSPACE_ID}`
        );

        const boardsData = Array.isArray(response)
          ? response
          : response?.items ?? [];

        if (replace) {
          setBoards(boardsData);
        } else {
          setBoards((prev) => {
            // Combinar y eliminar duplicados por ID
            const combined = [...prev, ...boardsData];
            const uniqueBoards = combined.filter(
              (b, index, self) => index === self.findIndex((x) => x.id === b.id)
            );
            return uniqueBoards;
          });
        }

        setHasMore(boardsData.length === LIMIT);
      } catch (err) {
        console.error("Error fetching boards:", err);
        setError("No se pudieron cargar los tableros");
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [WORKSPACE_ID]
  );

  // Carga inicial
  useEffect(() => {
    fetchBoards(1, true);
  }, [fetchBoards]);

  // IntersectionObserver para paginación infinita
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    const rootEl = scrollContainerRef.current;
    if (!sentinel || !rootEl) return;

    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !loading) {
          const nextPage = Math.floor(boards.length / LIMIT) + 1;
          fetchBoards(nextPage);
        }
      },
      {
        root: rootEl,
        rootMargin: "150px",
        threshold: 0.1,
      }
    );

    observer.current.observe(sentinel);
    return () => observer.current?.disconnect();
  }, [boards, hasMore, loading, fetchBoards]);

  // Crear tablero
  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;

    try {
      setCreating(true);
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        workspaceId: WORKSPACE_ID,
        color: selectedColor,
        memberIds: [],
      };
      await apiService.post<Board>("/v1/boards", payload);

      setIsCreateOpen(false);
      setTitle("");
      setDescription("");
      setSelectedColor(COLOR_PALETTE[0]);

      // Re-fetch boards desde la página 1
      await fetchBoards(1, true);
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    } catch (err) {
      console.error("Error creating board:", err);
      alert("No se pudo crear el tablero.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <aside className="flex flex-col h-full border border-dark-600 bg-dark-900 rounded-2xl overflow-hidden z-30">
      <div className="p-3 border-b border-dark-600 flex items-center justify-center">
        <button
          onClick={() => setIsCreateOpen(true)}
          className="text-sm text-text-muted hover:text-text-primary px-3 py-2 flex items-center justify-center transition"
          title="Crear tablero"
        >
          + Crear Tablero
        </button>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 scrollbar-custom"
      >
        {boards.map((b) => (
          <BoardPreviewCard
            key={b.id}
            title={b.title}
            color={b.color || stringToColor(b.id)}
          />
        ))}

        {loading && (
          <p className="text-sm text-text-secondary text-center">Cargando...</p>
        )}

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        <div ref={loadMoreRef} className="h-10" />
      </div>

      {/* Modal de creación */}
      <ModalBase
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Crear tablero"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Título
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-dark-700 text-white rounded-lg px-3 py-2 text-sm outline-none border border-dark-600 focus:border-limeyellow-500"
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">
              Descripción (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-dark-700 text-white rounded-lg px-3 py-2 text-sm outline-none border border-dark-600 focus:border-limeyellow-500"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-2">
              Color del tablero
            </label>
            <div className="flex flex-col items-center gap-3">
              <HexColorPicker
                color={selectedColor}
                onChange={setSelectedColor}
              />
              <div
                className="w-10 h-10 rounded-full border-2 border-dark-600"
                style={{ backgroundColor: selectedColor }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-3 py-2 bg-dark-700 text-text-secondary rounded-lg text-sm hover:bg-dark-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-3 py-2 bg-limeyellow-500 hover:bg-limeyellow-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {creating ? "Creando..." : "Crear"}
            </button>
          </div>
        </form>
      </ModalBase>
    </aside>
  );
};

export default BoardsSidebar;
