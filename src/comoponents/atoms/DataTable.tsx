import React, { useEffect, useState } from "react";
import { apiService } from "../../services/api/ApiService";

interface DataTableProps {
  endpoint: string; // ruta parcial del endpoint
  title?: string;
  itemsPerPage?: number;
  useMock?: boolean; // si true, usará datos de mockData
}

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

const DataTable: React.FC<DataTableProps> = ({
  endpoint,
  title,
  itemsPerPage = 5,
  useMock = false,
}) => {
  const [data, setData] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        if (useMock) {
          // Simula un delay de API
          await new Promise((res) => setTimeout(res, 500));
          setData(mockData);
        } else {
          const response = await apiService.get<{
            data: Record<string, any>[];
          }>(endpoint);
          setData(response.data);
        }
      } catch (err: any) {
        console.error(err);
        setError("Error al cargar los datos.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint, useMock]);

  if (loading)
    return (
      <div className="p-6 bg-dark-800 text-text-muted rounded-2xl shadow-lg text-center">
        Cargando datos...
      </div>
    );

  if (error)
    return (
      <div className="p-6 bg-dark-800 text-red-500 rounded-2xl shadow-lg text-center">
        {error}
      </div>
    );

  if (!data || data.length === 0)
    return (
      <div className="p-6 bg-dark-800 text-text-muted rounded-2xl shadow-lg text-center">
        No hay datos disponibles
      </div>
    );

  const headers = Object.keys(data[0]);
  const totalPages = Math.ceil(data.length / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) pages.push(i);

    return pages;
  };

  return (
    <div className="bg-dark-800 rounded-2xl shadow-lg p-4 font-poppins">
      {title && (
        <h2 className="text-xl font-semibold text-text-primary mb-4">
          {title}
        </h2>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm text-text-primary">
          <thead>
            <tr className="bg-dark-600 text-left uppercase text-xs tracking-wider">
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 font-semibold">
                  {header.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-dark-700 hover:bg-dark-700 transition-colors duration-150 ${
                  i % 2 === 0 ? "bg-dark-900" : "bg-dark-800"
                }`}
              >
                {headers.map((key) => (
                  <td key={key} className="px-4 py-3 text-text-secondary">
                    {typeof row[key] === "boolean"
                      ? row[key]
                        ? "✅"
                        : "❌"
                      : row[key] ?? "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginador */}
      <div className="flex items-center justify-center mt-6 gap-2 select-none">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
            currentPage === 1
              ? "bg-dark-700 text-text-muted cursor-not-allowed"
              : "bg-dark-700 hover:bg-limeyellow-500 hover:text-dark-900 text-text-primary"
          }`}
        >
          ‹
        </button>

        {getPageNumbers().map((num) => (
          <button
            key={num}
            onClick={() => handlePageChange(num)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg font-semibold text-sm transition-all duration-200 ${
              num === currentPage
                ? "bg-limeyellow-500 text-dark-900 shadow-md"
                : "bg-dark-700 text-text-secondary hover:bg-limeyellow-600 hover:text-dark-900"
            }`}
          >
            {num}
          </button>
        ))}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
            currentPage === totalPages
              ? "bg-dark-700 text-text-muted cursor-not-allowed"
              : "bg-dark-700 hover:bg-limeyellow-500 hover:text-dark-900 text-text-primary"
          }`}
        >
          ›
        </button>
      </div>

      <p className="text-center text-xs text-text-muted mt-2">
        Mostrando {startIndex + 1}–
        {Math.min(startIndex + itemsPerPage, data.length)} de {data.length}{" "}
        registros
      </p>
    </div>
  );
};

export default DataTable;
