import React, { useEffect, useState, useRef, useCallback } from "react";
import BoardPreviewCard from "../../atoms/BoardPreviewCard";
import SearchInput from "../../atoms/SearchInput";
import ModalBase from "../../atoms/ModalBase";
import { Plus, Check } from "lucide-react";
import { apiService } from "../../../services/api/ApiService";

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

const LIMIT = 10; // cantidad de tableros por carga

const BoardsSidebar: React.FC = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const [page, setPage] = useState(0);

  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null); // <-- nuevo

  const fetchBoards = useCallback(async (offset = 0) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.get<Board[]>(
        `/v1/boards?offset=${offset}&limit=${LIMIT}`
      );
      if (Array.isArray(data)) {
        if (offset === 0) {
          setBoards(data);
        } else {
          setBoards((prev) => [...prev, ...data]);
        }
        setHasMore(data.length === LIMIT);
      } else {
        setError("No se pudieron cargar los tableros");
        setHasMore(false);
      }
    } catch (err) {
      console.error("Error fetching boards:", err);
      setError("No se pudieron cargar los tableros");
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // carga inicial
  useEffect(() => {
    fetchBoards(0);
  }, [fetchBoards]);

  // Scroll infinito (observer usa el contenedor scrollable como root)
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    const rootEl = scrollContainerRef.current;

    if (!sentinel || !rootEl) return;

    // desconectar si hay uno previo
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !loading) {
          setPage((prevPage) => {
            const nextPage = prevPage + 1;
            fetchBoards(nextPage * LIMIT);
            return nextPage;
          });
        }
      },
      {
        root: rootEl, // IMPORTANT: observar respecto del contenedor de scroll
        rootMargin: "150px",
        threshold: 0.1,
      }
    );

    observer.current.observe(sentinel);

    return () => {
      observer.current?.disconnect();
    };
  }, [loading, hasMore, fetchBoards]);

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) return;
    try {
      setCreating(true);
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        color: selectedColor,
        members: [],
      };
      await apiService.post<Board>("/v1/boards", payload);

      // cerrar modal y resetear estado
      setIsCreateOpen(false);
      setTitle("");
      setDescription("");
      setSelectedColor(COLOR_PALETTE[0]);

      // refrescar lista desde 0
      setPage(0);
      setHasMore(true);
      await fetchBoards(0);
      // opcional: scrollear al top del contenedor
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

        <div ref={loadMoreRef} className="h-10" />
      </div>

      <ModalBase
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Crear tablero"
      >
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Título</label>
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
            <label className="block text-sm text-text-secondary mb-2">Color del tablero</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition ${
                    selectedColor === color
                      ? "border-limeyellow-500 scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && <Check size={14} className="text-dark-900" />}
                </button>
              ))}
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
