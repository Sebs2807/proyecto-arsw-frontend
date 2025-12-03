import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  Fragment,
} from "react";
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
import AgentModal from "./organisms/modals/agentsModal";

// Tipos que coinciden con el backend
export interface Board {
  id: string;
  title: string;
}

export interface List {
  id: string;
  title: string;
  // ... otros campos según ListDto
}

export interface Agent {
  id: string;
  name: string;
  flowConfig: any;
  workspaceId: string; // ✅ Backend devuelve workspaceId, no workspace
  temperature: number;
  maxTokens: number;
  boards: Board[];
  lists: List[];
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TransformedRow {
  id: string;
  name: string;
  boards: number;
  lists: number;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ITEMS_PER_PAGE = 10;

const AgentsManager: React.FC = () => {
  const activeWorkspaceId = useSelector(
    (state: RootState) => state.workspace.selectedWorkspace?.id
  );

  const [agents, setAgents] = useState<Agent[]>([]);
  const [data, setData] = useState<TransformedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [tempSearchTerm, setTempSearchTerm] = useState("");
  const [isFiltersVisible, setIsFiltersVisible] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAgent, setModalAgent] = useState<Agent | null>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "delete">("add");

  const [tempBoardSearchTerm, setTempBoardSearchTerm] = useState("");
  const [tempSelectedBoardId, setTempSelectedBoardId] = useState<string | null>(
    null
  );

  const CONFIG = useMemo(
    () => ({
      endpoint: "/v1/agents/paginated", // ✅ Endpoint correcto
      columns: [
        { key: "name", label: "Name" },
        { key: "boards", label: "Boards" },
        { key: "lists", label: "Lists" }, // ✅ Agregada columna de listas
        { key: "createdAt", label: "Created" },
        { key: "actions", label: "Actions" },
      ],
      transform: (items: Agent[]): TransformedRow[] =>
        items.map((a) => ({
          id: a.id,
          name: a.name,
          boards: a.boards?.length || 0, // ✅ Manejo seguro de undefined
          lists: a.lists?.length || 0, // ✅ Agregado
          createdAt: new Date(a.createdAt).toLocaleDateString(),
          updatedAt: new Date(a.updatedAt).toLocaleDateString(),
        })),
      title: "Agents",
      description: "View and manage workspace AI agents.",
    }),
    []
  );

  const handleApplyFilters = useCallback(() => {
    setSearchTerm(tempSearchTerm);
    setPage(1);
  }, [tempSearchTerm]);

  const handleResetFilters = useCallback(() => {
    setSearchTerm("");
    setTempSearchTerm("");
    setTempSelectedBoardId(null); // ✅ Resetear también el board seleccionado
    setPage(1);
  }, []);

  const handleAdd = () => {
    setModalMode("add");
    setModalAgent(null);
    setIsModalOpen(true);
  };

  const handleEdit = (row: TransformedRow) => {
    const agent = agents.find((a) => a.id === row.id);
    if (!agent) return;
    setModalMode("edit");
    setModalAgent(agent);
    setIsModalOpen(true);
  };

  const handleDelete = (row: TransformedRow) => {
    const agent = agents.find((a) => a.id === row.id);
    if (!agent) return;
    setModalMode("delete");
    setModalAgent(agent);
    setIsModalOpen(true);
  };

  const fetchData = useCallback(async () => {
    if (!activeWorkspaceId) {
      console.warn("No active workspace selected");
      return;
    }

    const abortController = new AbortController();
    try {
      setLoading(true);

      // ✅ Construcción correcta de query params
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        workspaceId: activeWorkspaceId,
      });

      if (searchTerm.trim()) {
        params.append("search", searchTerm.trim());
      }

      if (tempSelectedBoardId) {
        params.append("boardId", tempSelectedBoardId);
      }

      const query = `${CONFIG.endpoint}?${params.toString()}`;
      console.log("Fetching agents with query:", query);

      const response = await apiService.get<PaginatedResponse<Agent>>(query, {
        signal: abortController.signal,
      });

      console.log("Agents response:", response);

      setAgents(response.items || []);
      setData(CONFIG.transform(response.items || []));
      setTotalItems(response.total ?? 0);
      setTotalPages(response.totalPages ?? 1);
    } catch (error: any) {
      if (error.name !== "CanceledError") {
        console.error(`Error fetching ${CONFIG.title}:`, error);
        setData([]);
        setAgents([]);
      }
    } finally {
      setLoading(false);
    }

    return () => abortController.abort();
  }, [page, searchTerm, activeWorkspaceId, tempSelectedBoardId, CONFIG]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setTempSearchTerm(searchTerm);
  }, [searchTerm]);

  const pageRange = useMemo(() => {
    const range: number[] = [];
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, page + 2);
    if (page <= 3) end = Math.min(5, totalPages);
    if (page > totalPages - 2) start = Math.max(1, totalPages - 4);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }, [page, totalPages]);

  const headers = CONFIG.columns.map((c) => c.key) as (
    | keyof TransformedRow
    | "actions"
  )[];
  const areFiltersUnchanged =
    tempSearchTerm === searchTerm && tempSelectedBoardId === null; // ✅ Considerar también el board filter
  const isAnyFilterActive = searchTerm !== "" || tempSelectedBoardId !== null;

  return (
    <div className="flex flex-col h-full font-poppins">
      <div className="bg-dark-800 rounded-xl shadow-md p-3 mb-4 border border-dark-600">
        <div className="flex items-start justify-between">
          <div className="max-w-60">
            <h1 className="text-lg font-bold text-text-primary">
              {CONFIG.title}
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              {CONFIG.description}
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 bg-limeyellow-500 hover:bg-limeyellow-400 text-text-primary text-sm font-semibold px-3 py-2 rounded-lg"
          >
            <PlusIcon className="w-4 h-4 text-text-primary" />
            Add
          </button>
        </div>

        <div
          className="flex justify-between items-center mt-3 pt-3 border-t border-dark-600 cursor-pointer"
          onClick={() => setIsFiltersVisible((v) => !v)}
        >
          <h2 className="text-sm font-semibold text-text-primary">
            Filters{" "}
            {!areFiltersUnchanged && (
              <span className="ml-2 text-limeyellow-500 text-xs font-bold">
                (Pending Apply)
              </span>
            )}
            {areFiltersUnchanged && isAnyFilterActive && (
              <span className="ml-2 text-text-secondary text-xs font-normal">
                (Active)
              </span>
            )}
          </h2>
          <button className="p-1 text-text-secondary hover:bg-dark-700 rounded-full">
            {isFiltersVisible ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </button>
        </div>

        {isFiltersVisible && (
          <div className="mt-3 flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex flex-col w-full sm:w-48">
              <label className="text-xs text-text-secondary font-medium mb-1">
                General Search
              </label>
              <input
                value={tempSearchTerm}
                onChange={(e) => setTempSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                placeholder="Search by name..."
                className="w-full px-3 py-1.5 bg-dark-600 text-text-primary rounded-lg border border-dark-600 focus:outline-none focus:border-limeyellow-500 transition-colors text-sm"
              />
            </div>
            <BoardPicker
              boardSearchTerm={tempBoardSearchTerm}
              selectedBoardId={tempSelectedBoardId}
              setSelectedBoardId={setTempSelectedBoardId}
              setBoardSearchTerm={setTempBoardSearchTerm}
              handleApplyFilters={handleApplyFilters}
            />
            <div className="flex space-x-2">
              <button
                onClick={handleApplyFilters}
                disabled={areFiltersUnchanged}
                className="px-4 py-1.5 bg-limeyellow-600 hover:bg-limeyellow-400 text-text-primary text-sm font-semibold rounded-lg disabled:opacity-50"
              >
                Apply
              </button>
              <button
                onClick={handleResetFilters}
                disabled={!isAnyFilterActive}
                className="px-4 py-1.5 bg-dark-600 hover:bg-dark-700 text-text-secondary text-sm rounded-lg disabled:opacity-50"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 bg-dark-900 rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center text-text-secondary p-6">Loading...</div>
        ) : (
          <div className="bg-dark-800 rounded-2xl shadow-lg p-4 flex flex-col h-full">
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
                  {data.length === 0 ? (
                    <tr>
                      <td
                        colSpan={headers.length}
                        className="px-4 py-6 text-center text-text-muted"
                      >
                        No agents found. Create your first agent to get started.
                      </td>
                    </tr>
                  ) : (
                    data.map((row, i) => (
                      <Fragment key={row.id || i}>
                        <tr
                          onClick={() =>
                            setExpandedRow(expandedRow === i ? null : i)
                          }
                          className={`cursor-pointer border-b border-dark-700 hover:bg-dark-800 ${
                            i % 2 === 0 ? "bg-dark-900" : "bg-dark-800"
                          }`}
                        >
                          {headers.map((key) =>
                            key === "actions" ? (
                              <td key={key as string} className="px-4 py-3">
                                <div className="flex items-center gap-2 justify-start">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEdit(row);
                                    }}
                                    className="p-1 bg-dark-600 hover:bg-limeyellow-400 rounded-lg transition-colors"
                                    title="Edit agent"
                                  >
                                    <EditIcon className="w-4 h-4 text-text-primary" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(row);
                                    }}
                                    className="p-1 bg-dark-600 hover:bg-red-500 rounded-lg transition-colors"
                                    title="Delete agent"
                                  >
                                    <TrashIcon className="w-4 h-4 text-text-primary" />
                                  </button>
                                </div>
                              </td>
                            ) : (
                              <td key={key as string} className="px-4 py-3">
                                {row[key] ?? "-"}
                              </td>
                            )
                          )}
                        </tr>
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-dark-700">
                <span className="text-xs text-text-secondary">
                  Showing <strong>{ITEMS_PER_PAGE * (page - 1) + 1}</strong>–
                  <strong>{Math.min(ITEMS_PER_PAGE * page, totalItems)}</strong>{" "}
                  of <strong>{totalItems}</strong>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1 || loading}
                    className="p-2 rounded-full text-text-secondary hover:bg-dark-700 disabled:opacity-50 transition-colors"
                    title="Previous page"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>
                  {pageRange.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
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
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages || loading}
                    className="p-2 rounded-full text-text-secondary hover:bg-dark-700 disabled:opacity-50 transition-colors"
                    title="Next page"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        agent={modalAgent}
        mode={modalMode}
      />
    </div>
  );
};

export default AgentsManager;
