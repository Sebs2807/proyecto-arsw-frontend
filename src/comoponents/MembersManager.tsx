import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { apiService } from "../services/api/ApiService";

import TrashIcon from "../assets/trash-2.svg?react";
import EditIcon from "../assets/pencil.svg?react";
import PlusIcon from "../assets/plus.svg?react";
import ChevronLeftIcon from "../assets/chevron-left.svg?react";
import ChevronRightIcon from "../assets/chevron-right.svg?react";
import ChevronDownIcon from "../assets/chevron-down.svg?react";
import ChevronUpIcon from "../assets/chevron-up.svg?react";
import BoardPicker from "./molecules/BoardPicker";

const Role = {
  SUPER_ADMIN: "superAdmin",
  ADMIN: "admin",
  MEMBER: "member",
  GUEST: "guest",
} as const;

type Role = (typeof Role)[keyof typeof Role];

const ROLE_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: Role.SUPER_ADMIN, label: "Super Admin" },
  { value: Role.ADMIN, label: "Admin" },
  { value: Role.MEMBER, label: "Member" },
  { value: Role.GUEST, label: "Guest" },
];

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  active?: boolean;
  createdAt: string;
  updatedAt: string;
  rol: Role;
}

interface TransformedRow {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  rol: Role;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const ITEMS_PER_PAGE = 10;

const MembersManager: React.FC = () => {
  const { activeItem, activeWorkspaceId } = useSelector((state: RootState) => ({
    activeItem: state.sidebar.activeItem,
    activeWorkspaceId: state.workspace.selectedWorkspace?.id,
  }));

  const [data, setData] = useState<TransformedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filtros APLICADOS (Usados en la query de fetchData)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  // Filtros TEMPORALES (Usados en los inputs del formulario)
  const [tempSearchTerm, setTempSearchTerm] = useState("");
  const [tempSelectedRole, setTempSelectedRole] = useState<string>("");
  const [tempBoardSearchTerm, setTempBoardSearchTerm] = useState("");
  const [tempSelectedBoardId, setTempSelectedBoardId] = useState<string | null>(
    null
  );

  const [isFiltersVisible, setIsFiltersVisible] = useState(true);

  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<Record<string, any> | null>(
    null
  );
  const [deletingItem, setDeletingItem] = useState<Record<string, any> | null>(
    null
  );

  const CONFIG = useMemo(
    () => ({
      endpoint: "/v1/users/paginated",
      columns: [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "active", label: "Status" },
        { key: "createdAt", label: "Created" },
        { key: "updatedAt", label: "Updated" },
        { key: "rol", label: "Role" },
      ],
      transform: (items: Member[]): TransformedRow[] =>
        items.map((m) => ({
          id: m.id,
          name: `${m.firstName} ${m.lastName}`,
          email: m.email,
          active: m.active ?? false,
          createdAt: new Date(m.createdAt).toLocaleDateString(),
          updatedAt: new Date(m.updatedAt).toLocaleDateString(),
          rol: m.rol,
        })),
      title: "Members",
      description: "View and manage workspace members.",
    }),
    []
  );

  const handleApplyFilters = useCallback(() => {
    // 1. Aplica los filtros temporales al estado aplicado
    setSearchTerm(tempSearchTerm);
    setSelectedRole(tempSelectedRole);
    setSelectedBoardId(tempSelectedBoardId);
    // 2. Reinicia la paginación a la página 1 para la nueva búsqueda
    setPage(1);
  }, [tempSearchTerm, tempSelectedRole, tempSelectedBoardId]);

  // Nueva función para resetear todos los filtros
  const handleResetFilters = useCallback(() => {
    // Resetear estados aplicados
    setSearchTerm("");
    setSelectedRole("");
    setSelectedBoardId(null);
    // Resetear estados temporales
    setTempSearchTerm("");
    setTempSelectedRole("");
    setTempSelectedBoardId(null);
    setTempBoardSearchTerm("");
    // Reiniciar paginación
    setPage(1);
  }, []);

  const fetchData = useCallback(async () => {
    const abortController = new AbortController();

    try {
      if (page === 1) setLoading(true);

      if (!activeWorkspaceId) {
        setData([]);
        setTotalItems(0);
        setTotalPages(1);
        setLoading(false);
        return;
      }

      let query = `${CONFIG.endpoint}?page=${page}&limit=${ITEMS_PER_PAGE}`;
      query += `&workspaceId=${encodeURIComponent(activeWorkspaceId)}`;

      // Estos filtros se mantienen gracias a que 'searchTerm', 'selectedRole', y 'selectedBoardId'
      // solo cambian cuando se presiona 'Apply' o 'Reset', no cuando cambia 'page'.
      if (searchTerm.trim() !== "") {
        query += `&search=${encodeURIComponent(searchTerm.trim())}`;
      }

      if (selectedRole !== "") {
        query += `&role=${encodeURIComponent(selectedRole)}`;
      }

      if (selectedBoardId) {
        query += `&boardId=${encodeURIComponent(selectedBoardId)}`;
      }

      const response = await apiService.get<PaginatedResponse<Member>>(query, {
        signal: abortController.signal,
      });

      if (!response || !Array.isArray(response.data) || !response.meta) {
        throw new TypeError(
          "Invalid API response format: Missing data or meta."
        );
      }

      const { data: memberEntities, meta } = response;
      const transformed = CONFIG.transform(memberEntities);

      setData(transformed);
      setTotalItems(meta.total);
      setTotalPages(meta.totalPages);
    } catch (error) {
      if (error instanceof Error && (error as any).name === "CanceledError") {
        return;
      }
      console.error(`Error fetching ${CONFIG.title}:`, error);
      setData([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      if (page === 1) setLoading(false);
    }
    return () => {
      abortController.abort();
    };
  }, [
    page,
    searchTerm,
    selectedRole,
    selectedBoardId,
    activeWorkspaceId,
    CONFIG,
  ]);

  const handleNextPage = () => {
    // 💡 Al cambiar de página, los filtros (searchTerm, selectedRole, etc.) se mantienen
    // porque 'fetchData' depende de ellos. Solo se actualiza 'page'.
    setPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setPage((prev) => Math.max(prev - 1, 1));
  };

  const handleGoToPage = (newPage: number) => {
    setPage(Math.min(Math.max(newPage, 1), totalPages));
  };

  const handleTempSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempSearchTerm(e.target.value);
  };

  const handleTempRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTempSelectedRole(e.target.value);
  };

  const handleTempBoardSelect = (id: string | null) => {
    setTempSelectedBoardId(id);
  };

  const handleSave = (updated: Record<string, any>) => {
    console.log("Guardando registro:", updated);
  };

  const handleDelete = (deleted: Record<string, any>) => {
    console.log("Eliminando registro:", deleted);
  };

  const handleChange = (key: string, value: string) => {
    setEditingItem((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  const handleKeyDownOnInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleApplyFilters();
      e.currentTarget.blur();
    }
  };

  // useEffect para resetear la vista y filtros SOLO cuando el workspace cambia
  useEffect(() => {
    // Si el workspace cambia, resetea todos los estados.
    handleResetFilters();
    setData([]);
    setExpandedRow(null);
    setEditingItem(null);
    setDeletingItem(null);
  }, [activeWorkspaceId, handleResetFilters]);

  // useEffect para sincronizar los estados temporales con los aplicados
  // cuando la data se carga inicialmente o después de un apply/reset.
  useEffect(() => {
    const MOCK_BOARDS: { id: string; name: string }[] = [];

    // Sincroniza el BoardPicker con el board aplicado
    if (selectedBoardId) {
      const board = MOCK_BOARDS.find((b) => b.id === selectedBoardId);
      setTempBoardSearchTerm(board ? board.name : "");
    } else {
      setTempBoardSearchTerm("");
    }

    setTempSearchTerm(searchTerm);
    setTempSelectedRole(selectedRole);
    setTempSelectedBoardId(selectedBoardId);
  }, [searchTerm, selectedRole, selectedBoardId]);

  // useEffect para cargar los datos (se ejecuta con cada cambio en las dependencias de fetchData)
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const headers = CONFIG.columns.map((c) => c.key) as (keyof TransformedRow)[];
  const title = CONFIG.title;

  const getPageRange = () => {
    const range: number[] = [];
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, page + 2);

    if (page <= 3) end = Math.min(5, totalPages);
    if (page > totalPages - 2) start = Math.max(1, totalPages - 4);

    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  };

  const pageRange = getPageRange();

  // Verifica si NO hay diferencias entre filtros temporales y aplicados (Nombre ajustado para claridad)
  const areFiltersUnchanged =
    tempSearchTerm === searchTerm &&
    tempSelectedRole === selectedRole &&
    tempSelectedBoardId === selectedBoardId;

  // Verifica si hay algún filtro aplicado (para mostrar el botón de Reset)
  const isAnyFilterActive =
    searchTerm !== "" || selectedRole !== "" || selectedBoardId !== null;

  return (
    <div className="flex flex-col h-full font-poppins">
      <div className="bg-dark-800 rounded-xl shadow-md p-3 mb-4 border border-dark-600 transition-all duration-300">
        <div className="flex items-start justify-between">
          <div className="max-w-60">
            <h1 className="text-lg font-bold text-text-primary">
              {title || "🏠 Home"}
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              {CONFIG.description || "View and manage workspace members."}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-px h-8 bg-limeyellow-600 rounded-full" />
            <button
              onClick={() =>
                console.log(`Abrir modal de creación para ${title}`)
              }
              className="h-8 flex items-center justify-center gap-1 bg-limeyellow-500 hover:bg-limeyellow-600 text-dark-900 text-sm font-semibold px-2 py-2 rounded-lg transition-colors duration-200"
            >
              <PlusIcon className="w-4 h-4 relative top-[0.5px]" />
              <span className="leading-none pr-1">Add</span>
            </button>
          </div>
        </div>

        <div
          className="flex justify-between items-center mt-3 pt-3 border-t border-dark-600 cursor-pointer"
          onClick={() => setIsFiltersVisible(!isFiltersVisible)}
        >
          <h2 className="text-sm font-semibold text-text-primary">
            Filtros
            {/* Muestra "Pending Apply" si los filtros NO están sin cambios */}
            {!areFiltersUnchanged && (
              <span className="ml-2 text-limeyellow-500 text-xs font-bold">
                {" "}
                (Pending Apply)
              </span>
            )}
            {/* Muestra "Active" si los filtros NO tienen cambios Y HAY ALGÚN filtro activo */}
            {areFiltersUnchanged && isAnyFilterActive && (
              <span className="ml-2 text-text-secondary text-xs font-normal">
                {" "}
                (Active)
              </span>
            )}
          </h2>
          <button className="p-1 rounded-full text-text-secondary hover:bg-dark-700">
            {isFiltersVisible ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </button>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ${
            isFiltersVisible ? "max-h-96 opacity-100 mt-3" : "max-h-0 opacity-0"
          }`}
        >
          <div className="flex flex-col sm:flex-row gap-4 justify-start items-end">
            <div className="flex flex-col w-full sm:w-48">
              <label
                htmlFor="search-term"
                className="text-xs text-text-secondary font-medium mb-1"
              >
                General Search
              </label>
              <input
                id="search-term"
                type="text"
                placeholder="Name or Email..."
                value={tempSearchTerm}
                onChange={handleTempSearchChange}
                onKeyDown={handleKeyDownOnInput}
                className="w-full px-3 py-1.5 bg-dark-600 text-text-primary placeholder-text-muted rounded-lg border border-dark-600 focus:outline-none focus:border-limeyellow-500 transition-colors text-sm"
              />
            </div>

            <div className="flex flex-col w-full sm:w-40">
              <label
                htmlFor="role-select"
                className="text-xs text-text-secondary font-medium mb-1"
              >
                Role
              </label>
              <select
                id="role-select"
                value={tempSelectedRole}
                onChange={handleTempRoleChange}
                className="w-full px-3 py-1.5 bg-dark-600 text-text-primary rounded-lg border border-dark-600 focus:outline-none focus:border-limeyellow-500 transition-colors appearance-none cursor-pointer text-sm"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <BoardPicker
              boardSearchTerm={tempBoardSearchTerm}
              selectedBoardId={tempSelectedBoardId}
              setSelectedBoardId={handleTempBoardSelect}
              setBoardSearchTerm={setTempBoardSearchTerm}
              handleApplyFilters={handleApplyFilters}
            />

            <div className="flex flex-col w-full sm:w-auto mt-4 sm:mt-0">
              <label className="text-xs text-text-secondary font-medium mb-1 invisible">
                Actions
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={handleApplyFilters}
                  // 🟢 Deshabilitado si son iguales (no hay cambios pendientes)
                  disabled={areFiltersUnchanged}
                  className="w-full sm:w-auto px-4 py-1.5 bg-limeyellow-500 hover:bg-limeyellow-600 text-dark-900 text-sm font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
                <button
                  onClick={handleResetFilters}
                  disabled={!isAnyFilterActive}
                  className="w-full sm:w-auto px-4 py-1.5 bg-dark-600 hover:bg-dark-700 text-text-secondary text-sm font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-dark-900 rounded-xl overflow-hidden">
        {loading && page === 1 ? (
          <div className="text-center text-text-secondary p-6">Loading...</div>
        ) : (
          <div className="bg-dark-800 rounded-2xl shadow-lg p-4 font-poppins animate-fade-in flex flex-col h-full">
            <div className="overflow-x-auto flex-grow">
              <table className="min-w-full border-collapse text-sm text-text-primary">
                <thead>
                  <tr className="bg-dark-600 text-left uppercase text-xs tracking-wider">
                    {CONFIG.columns.map((col) => (
                      <th key={col.key} className="px-4 py-3 font-semibold">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 && !loading ? (
                    <tr>
                      <td
                        colSpan={headers.length}
                        className="px-4 py-6 text-center text-text-muted"
                      >
                        No hay datos disponibles para **{title}** en esta
                        página.
                      </td>
                    </tr>
                  ) : (
                    data.map((row, i) => (
                      <React.Fragment key={row.id || i}>
                        <tr
                          onClick={() =>
                            setExpandedRow(expandedRow === i ? null : i)
                          }
                          className={`cursor-pointer border-b border-dark-700 hover:bg-dark-800 ${
                            i % 2 === 0 ? "bg-dark-900" : "bg-dark-800"
                          }`}
                        >
                          {headers.map((key) => (
                            <td
                              key={key as string}
                              className="px-4 py-3 text-text-secondary"
                            >
                              {typeof row[key] === "boolean"
                                ? row[key]
                                  ? "Activo"
                                  : "Inactivo"
                                : row[key]?.toString() || "-"}
                            </td>
                          ))}
                        </tr>

                        {expandedRow === i && (
                          <tr className="bg-dark-600/50 ">
                            <td colSpan={headers.length} className="px-2 py-1">
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={() => setEditingItem(row)}
                                  className="px-1 py-1 bg-limeyellow-500 hover:bg-limeyellow-400 rounded text-dark-900 transition-colors duration-150"
                                >
                                  <EditIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeletingItem(row)}
                                  className="px-1 py-1 bg-red-600 hover:bg-red-500 rounded text-white transition-colors duration-150"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-dark-700">
                <span className="text-xs text-text-secondary">
                  Showing <strong>{ITEMS_PER_PAGE * (page - 1) + 1}</strong> to{" "}
                  <strong>{Math.min(ITEMS_PER_PAGE * page, totalItems)}</strong>{" "}
                  of <strong>{totalItems}</strong> results
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevPage}
                    disabled={page === 1 || loading}
                    className="p-2 rounded-full text-text-secondary disabled:opacity-50 hover:bg-dark-700 transition-colors"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>

                  {pageRange.map((p) => (
                    <button
                      key={p}
                      onClick={() => handleGoToPage(p)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-150 
                        ${
                          p === page
                            ? "bg-limeyellow-500 text-dark-900"
                            : "text-text-secondary hover:bg-dark-700"
                        }`}
                      disabled={loading}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    onClick={handleNextPage}
                    disabled={page === totalPages || loading}
                    className="p-2 rounded-full text-text-secondary disabled:opacity-50 hover:bg-dark-700 transition-colors"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-dark-800 p-6 rounded-xl w-96 shadow-lg animate-scale-in">
            <h3 className="text-lg font-semibold mb-4 text-text-primary">
              Editar registro ({title})
            </h3>
            <div className="flex flex-col gap-3">
              {CONFIG.columns.map((col) => (
                <div key={col.key}>
                  <label className="text-xs text-text-muted">{col.label}</label>
                  {col.key === "rol" ? (
                    <select
                      value={editingItem[col.key] ?? ""}
                      onChange={(e) => handleChange(col.key, e.target.value)}
                      className="w-full px-3 py-1 bg-dark-600 text-text-primary rounded appearance-none"
                    >
                      {ROLE_OPTIONS.slice(1).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={editingItem[col.key] ?? ""}
                      onChange={(e) => handleChange(col.key, e.target.value)}
                      className="w-full px-3 py-1 bg-dark-600 text-text-primary rounded"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setEditingItem(null)}
                className="px-3 py-1 bg-gray-600 rounded text-white text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handleSave(editingItem);
                  setEditingItem(null);
                }}
                className="px-3 py-1 bg-limeyellow-500 text-dark-900 rounded text-xs"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-dark-800 p-6 rounded-xl shadow-lg animate-scale-in">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Confirmar eliminación
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              ¿Seguro que deseas eliminar este registro de **{title}**?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingItem(null)}
                className="px-3 py-1 bg-gray-600 rounded text-white text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handleDelete(deletingItem);
                  setDeletingItem(null);
                }}
                className="px-3 py-1 bg-red-600 rounded text-white text-xs"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MembersManager;
