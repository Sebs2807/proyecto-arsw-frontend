import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";
import DataTable from "../../atoms/DataTable";
import Plus from "../../../assets/plus.svg?react";
import ModalBase from "../../atoms/ModalBase";
import { apiService } from "../../../services/api/ApiService";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  picture?: string;
  active?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Board {
  id: string;
  title: string;
  description?: string;
}

interface Agent {
  id: string;
  name: string;
  type: string;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ITEMS_PER_PAGE = 10;

const Home: React.FC = () => {
  const { activeItem } = useSelector((state: RootState) => state.sidebar);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const CONFIG = {
    members: {
      endpoint: "/v1/users/paginated",
      columns: [
        { key: "name", label: "Nombre" },
        { key: "email", label: "Correo" },
        { key: "active", label: "Estado" },
        { key: "createdAt", label: "Creado" },
        { key: "updatedAt", label: "Actualizado" },
      ],
      transform: (items: Member[]) =>
        items.map((m) => ({
          id: m.id,
          name: `${m.firstName} ${m.lastName}`,
          email: m.email,
          active: m.active ? "Activo" : "Inactivo",
          createdAt: new Date(m.createdAt).toLocaleString(),
          updatedAt: new Date(m.updatedAt).toLocaleString(),
        })),
      title: "Miembros",
      description: "Visualiza los miembros asociados al workspace.",
    },
    boards: {
      endpoint: "/v1/boards",
      columns: [
        { key: "id", label: "ID" },
        { key: "title", label: "Título" },
        { key: "description", label: "Descripción" },
      ],
      transform: (items: Board[]) =>
        items.map((b) => ({
          id: b.id,
          title: b.title,
          description: b.description || "—",
        })),
      title: "Tableros",
      description: "Visualiza los tableros asociados al workspace.",
    },
    agents: {
      endpoint: "/v1/agents",
      columns: [
        { key: "id", label: "ID" },
        { key: "name", label: "Nombre" },
        { key: "type", label: "Tipo" },
        { key: "status", label: "Estado" },
      ],
      transform: (items: Agent[]) =>
        items.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          status: a.status || "Activo",
        })),
      title: "Agentes de IA",
      description: "Configura y supervisa los agentes inteligentes.",
    },
  };

  const config = CONFIG[activeItem as keyof typeof CONFIG];

  const fetchData = async () => {
    if (!config) return;

    try {
      setLoading(true);
      const response = await apiService.get<any[]>(
        `${config.endpoint}?page=${page}&limit=${ITEMS_PER_PAGE}`
      );

      if (!response || response.length === 0) return;

      const transformed = config.transform(response);
      setData((prev) => (page === 1 ? transformed : [...prev, ...transformed]));
      setTotalItems(transformed.length);
    } catch (error) {
      console.error(`Error al obtener ${activeItem}:`, error);
      if (page === 1) setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setData([]);
  }, [activeItem]);

  useEffect(() => {
    fetchData();
  }, [page, activeItem]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    const nearBottom = scrollTop + clientHeight >= scrollHeight - 50;

    if (nearBottom && !loading && data.length < totalItems) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <div className="flex flex-col h-full font-poppins">
      <div className="bg-dark-800 rounded-xl shadow-md p-3 mb-4 border border-dark-600">
        <div className="flex items-center justify-between">
          <div className="max-w-60">
            <h1 className="text-lg font-bold text-text-primary">
              {config?.title || "🏠 Home"}
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              {config?.description ||
                "Selecciona una opción del menú lateral para comenzar."}
            </p>
          </div>

          {config && (
            <div className="flex items-center space-x-3">
              <div className="w-px h-12 bg-limeyellow-600 rounded-full" />
              <button
                onClick={() => setIsModalOpen(true)}
                className="h-10 flex items-center justify-center gap-1 bg-limeyellow-500 hover:bg-limeyellow-600 text-white text-sm font-semibold px-2 py-2 rounded-lg transition-colors duration-200"
              >
                <Plus className="w-4 h-4 relative top-[0.5px]" />
                <span className="leading-none pr-1">Añadir</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto bg-dark-900 rounded-xl"
        onScroll={handleScroll}
      >
        {loading && page === 1 ? (
          <div className="p-4 text-text-secondary text-center">
            Cargando {config?.title?.toLowerCase()}...
          </div>
        ) : config ? (
          <>
            <DataTable
              data={data}
              title={config.title}
              columns={config.columns}
            />
            {loading && (
              <div className="p-3 text-center text-text-secondary text-sm">
                Cargando más...
              </div>
            )}
          </>
        ) : (
          <p className="mt-6 text-text-secondary text-center">
            Selecciona una opción del menú lateral.
          </p>
        )}
      </div>

      <ModalBase
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Añadir ${config?.title?.toLowerCase() || ""}`}
      >
        <p className="text-text-secondary text-sm">
          Aquí irá el formulario para añadir {config?.title?.toLowerCase()}.
        </p>
      </ModalBase>
    </div>
  );
};

export default Home;
