import React from "react";

interface ColumnConfig {
  key: string;
  label?: string;
}

interface DataTableProps {
  data: Record<string, any>[];
  title?: string;
  columns?: ColumnConfig[];
  itemsPerPage?: number;

  // 🔹 Props para paginación controlada desde el padre
  currentPage?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
}

const DataTable: React.FC<DataTableProps> = ({
  data,
  title,
  columns,
  itemsPerPage = 5,
  currentPage = 1,
  totalItems,
  onPageChange,
}) => {
  // Si no hay datos
  if (!data || data.length === 0)
    return (
      <div className="p-6 bg-dark-800 text-text-muted rounded-2xl shadow-lg text-center">
        No hay datos disponibles
      </div>
    );

  // Si no se definen columnas, las genera automáticamente
  const headers =
    columns && columns.length > 0
      ? columns
      : Object.keys(data[0]).map((key) => ({
          key,
          label: key.replace(/_/g, " "),
        }));

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "boolean") return value ? "Activo" : "Inactivo";
    if (typeof value === "number")
      return value.toLocaleString("es-CO", { maximumFractionDigits: 2 });
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value))
      return new Date(value).toLocaleDateString("es-CO");
    return value.toString();
  };

  // 🔹 Cálculo de páginas (puede venir del backend o ser local)
  const totalPages = totalItems
    ? Math.ceil(totalItems / itemsPerPage)
    : Math.ceil(data.length / itemsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
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
              {headers.map((col) => (
                <th key={col.key} className="px-4 py-3 font-semibold">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-dark-700 hover:bg-dark-700 transition-colors duration-150 ${
                  i % 2 === 0 ? "bg-dark-900" : "bg-dark-800"
                }`}
              >
                {headers.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-text-secondary">
                    {formatValue(row[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginador */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center mt-6 gap-2 select-none">
          <button
            onClick={() => onPageChange?.(currentPage - 1)}
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
              onClick={() => onPageChange?.(num)}
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
            onClick={() => onPageChange?.(currentPage + 1)}
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
      )}

      <p className="text-center text-xs text-text-muted mt-2">
        Página {currentPage} de {totalPages}
      </p>
    </div>
  );
};

export default DataTable;
