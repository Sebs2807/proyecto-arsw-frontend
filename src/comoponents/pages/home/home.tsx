import React from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";
import DataTable from "../../atoms/DataTable";
import Plus from "../../../assets/plus.svg?react";

const mockData = [
  {
    id: "WS-001",
    nombre: "Marketing Team",
    miembros: 12,
    proyectos_activos: 4,
    activo: true,
    creado_en: "2025-05-12",
  },
  {
    id: "WS-002",
    nombre: "Ventas LATAM",
    miembros: 8,
    proyectos_activos: 2,
    activo: true,
    creado_en: "2025-06-01",
  },
  {
    id: "WS-003",
    nombre: "Investigación I+D",
    miembros: 5,
    proyectos_activos: 3,
    activo: false,
    creado_en: "2025-04-22",
  },
  {
    id: "WS-004",
    nombre: "Soporte Técnico",
    miembros: 9,
    proyectos_activos: 1,
    activo: true,
    creado_en: "2025-07-10",
  },
];

const Home: React.FC = () => {
  const { activeItem } = useSelector((state: RootState) => state.sidebar);

  // Mapeo de descripciones según el item activo
  const itemInfo: Record<string, { title: string; description: string }> = {
    members: {
      title: "Miembros",
      description: "Visualiza los miembros asociados al workspace.",
    },
    boards: {
      title: "Tableros",
      description: "Visualiza los tableros asociados al workspace.",
    },
    agents: {
      title: "Agentes de IA",
      description: "Configura y supervisa los agentes inteligentes.",
    },
  };

  const activeInfo = itemInfo[activeItem as keyof typeof itemInfo] || {
    title: "🏠 Home",
    description:
      "Selecciona una opción del menú lateral para comenzar a trabajar con tus espacios de trabajo, tableros o agentes.",
  };

  const renderContent = () => {
    switch (activeItem) {
      case "members":
        return (
          <div className="">
            <DataTable endpoint="/workspaces" title="Workspaces" useMock />
          </div>
        );
      case "boards":
        return (
          <p className="mt-6 text-text-secondary">📋 Gestión de tableros</p>
        );
      case "agents":
        return <p className="mt-6 text-text-secondary">🤖 Agentes de IA</p>;
      default:
        return (
          <p className="mt-6 text-text-secondary">
            Selecciona una opción del menú lateral.
          </p>
        );
    }
  };

  return (
    <div className="flex flex-col h-full font-poppins">
      <div className="bg-dark-800 rounded-xl shadow-md p-3 mb-4 border border-dark-600">
        <div className="flex items-center justify-between">
          <div className="max-w-60">
            <h1 className="text-lg font-bold text-text-primary">
              {activeInfo.title}
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              {activeInfo.description}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Separador */}
            <div className="w-px h-12 bg-limeyellow-600 rounded-full" />

            {/* Botón */}
            <button className="h-10 flex items-center justify-center gap-1 bg-limeyellow-500 hover:bg-limeyellow-600 text-white text-sm font-semibold px-2 py-2 rounded-lg transition-colors duration-200">
              <Plus className="w-4 h-4 relative top-[0.5px]" />
              <span className="leading-none pr-1">Añadir</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🔹 Contenido principal (scroll dentro del Outlet) */}
      <div className="flex-1 overflow-y-auto bg-dark-900 rounded-xl">
        {renderContent()}
      </div>
    </div>
  );
};

export default Home;
