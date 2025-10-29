import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { apiService } from "../services/api/ApiService";

// Íconos
import TrashIcon from "../assets/trash-2.svg?react";
import EditIcon from "../assets/pencil.svg?react";
import PlusIcon from "../assets/plus.svg?react";
import ChevronLeftIcon from "../assets/chevron-left.svg?react";
import ChevronRightIcon from "../assets/chevron-right.svg?react";
import ChevronDownIcon from "../assets/chevron-down.svg?react";
import ChevronUpIcon from "../assets/chevron-up.svg?react";

interface UserMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface BoardEntity {
  id: string;
  title: string;
  description: string;
  createdBy: {
    id: string;
  };
  members: UserMember[];
  createdAt: string;
  updatedAt: string;
}

interface BoardsResponse {
  data: BoardEntity[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface BoardData {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  memberNames: string;
  createdAt: string;
  updatedAt: string;
}

type EditingBoardData = BoardData & { memberIds: string[] };

const ITEMS_PER_PAGE = 10;

const BoardsManager: React.FC = () => {
  const { selectedWorkspace } = useSelector(
    (state: RootState) => state.workspace
  );

  const workspaceId = selectedWorkspace?.id;
  const isWorkspaceSelected = !!workspaceId;

  const [data, setData] = useState<BoardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [boardMemberMap, setBoardMemberMap] = useState<
    Record<string, string[]>
  >({});

  const [searchTerm, setSearchTerm] = useState("");
  const [tempSearchTerm, setTempSearchTerm] = useState("");

  const [isFiltersVisible, setIsFiltersVisible] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<EditingBoardData | null>(null);
  const [deletingItem, setDeletingItem] = useState<BoardData | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);

  const CONFIG = useMemo(
    () => ({
      endpoint: "/v1/boards/paginated",
      columns: [
        { key: "title", label: "Title" },
        { key: "description", label: "Description" },
        { key: "memberNames", label: "Members" },
        { key: "createdAt", label: "Created" },
        { key: "updatedAt", label: "Updated" },
      ],
      transform: (items: BoardEntity[]): BoardData[] =>
        items.map((b) => ({
          id: b.id,
          title: b.title,
          description:
            b.description.substring(0, 50) +
            (b.description.length > 50 ? "..." : ""),
          createdBy: b.createdBy.id,
          memberNames:
            b.members
              .map((m) => {
                const fullName = `${m.firstName || ""} ${
                  m.lastName || ""
                }`.trim();
                return fullName ? fullName.split(" ")[0] : "N/A";
              })
              .join(", ") || "N/A",
          createdAt: new Date(b.createdAt).toLocaleDateString(),
          updatedAt: new Date(b.updatedAt).toLocaleDateString(),
        })),
      title: "Boards",
      description: "View and manage workspace boards.",
    }),
    []
  );

  const handleApplyFilters = useCallback(() => {
    setSearchTerm(tempSearchTerm);
    setPage(1);
  }, [tempSearchTerm]);

  useEffect(() => {
    if (!workspaceId) {
      setData([]);
      setTotalItems(0);
      setTotalPages(1);
      return;
    }

    const abortController = new AbortController();

    async function fetchBoards() {
      if (page === 1) setLoading(true);

      const url = `/v1/boards/paginated?page=${page}&limit=${ITEMS_PER_PAGE}&search=${encodeURIComponent(
        searchTerm
      )}&workspaceId=${workspaceId}`;

      try {
        const response: BoardsResponse = await apiService.get<BoardsResponse>(
          url,
          {
            withCredentials: true,
            signal: abortController.signal,
          }
        );

        if (!response || !Array.isArray(response.data) || !response.meta) {
          throw new TypeError(
            "Invalid API response format: Missing data array or meta object."
          );
        }

        const { data: boardEntities, meta } = response;
        const transformed = CONFIG.transform(boardEntities);

        setData(transformed);
        setTotalItems(meta.total);
        setTotalPages(meta.totalPages);

        const memberMap: Record<string, string[]> = {};
        boardEntities.forEach((board) => {
          memberMap[board.id] = board.members
            ? board.members.map((m) => m.id)
            : [];
        });
        setBoardMemberMap(memberMap);
      } catch (error) {
        if (error instanceof Error && error.name === "CanceledError") {
          return;
        }

        console.error(`Error fetching ${CONFIG.title}:`, error);
        setData([]);
        setTotalItems(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    }

    fetchBoards();

    return () => {
      abortController.abort();
    };
  }, [page, searchTerm, workspaceId, CONFIG]);

  useEffect(() => {
    setTempSearchTerm(searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
    setSearchTerm("");
  }, [selectedWorkspace?.id]);

  const handleEditClick = (row: BoardData) => {
    const memberIds = boardMemberMap[row.id] || [];
    setEditingItem({ ...row, memberIds });
    setExpandedRow(null);
  };

  const handleDeleteClick = (row: BoardData) => {
    setDeletingItem(row);
    setExpandedRow(null);
  };

  const handleFormSave = (
    id: string | null,
    updates: { title: string; description: string; memberIds: string[] }
  ) => {
    if (id) {
      console.log(`[API PATCH] /v1/boards/${id}`, updates);
      setEditingItem(null);
    } else {
      console.log("[API POST] /v1/boards", { ...updates, workspaceId });
      setIsAddingItem(false);
    }
    setPage(1);
  };

  const handleDelete = async (deleted: BoardData) => {
    try {
      console.log(`[API DELETE] /v1/boards/${deleted.id}`);
      setDeletingItem(null);
      setPage((prevPage) => prevPage);
    } catch (error) {
      console.error("Error deleting board:", error);
    }
  };

  const handleKeyDownOnInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleApplyFilters();
      e.currentTarget.blur();
    }
  };

  const handleNextPage = () =>
    setPage((prev) => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setPage((prev) => Math.max(prev - 1, 1));
  const handleGoToPage = (newPage: number) =>
    setPage(Math.min(Math.max(newPage, 1), totalPages));

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

  const headers = CONFIG.columns.map((c) => c.key);
  const title = CONFIG.title;

  const areFiltersApplied = tempSearchTerm === searchTerm;

  return (
    <div className="flex flex-col h-full font-poppins">
      <div className="bg-dark-800 rounded-xl shadow-md p-3 mb-4 border border-dark-600 transition-all duration-300 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="max-w-60">
            <h1 className="text-lg font-bold text-text-primary">
              {title || "🏠 Home"}
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              {CONFIG.description || "View and manage workspace boards."}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-px h-8 bg-limeyellow-600 rounded-full" />
            <button
              onClick={() => setIsAddingItem(true)}
              disabled={!isWorkspaceSelected}
              className="h-8 flex items-center justify-center gap-1 bg-limeyellow-500 hover:bg-limeyellow-600 text-dark-900 text-sm font-semibold px-2 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusIcon className="w-4 h-4 relative top-[0.5px]" />
              <span className="leading-none pr-1">Add Board</span>
            </button>
          </div>
        </div>

        {isWorkspaceSelected && (
          <div
            className="flex justify-between items-center mt-3 pt-3 border-t border-dark-600 cursor-pointer"
            onClick={() => setIsFiltersVisible(!isFiltersVisible)}
          >
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Filters
              {!areFiltersApplied && (
                <span className="ml-2 text-limeyellow-500 text-xs font-bold">
                  {" "}
                  (Pending Apply)
                </span>
              )}
              {areFiltersApplied && searchTerm && (
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
        )}

        {isWorkspaceSelected && (
          <div
            className={`overflow-hidden transition-all duration-300 ${
              isFiltersVisible
                ? "max-h-96 opacity-100 mt-3"
                : "max-h-0 opacity-0"
            }`}
          >
            <div className="flex flex-col sm:flex-row gap-4 justify-start items-end">
              <div className="flex flex-col w-full sm:w-80">
                <label
                  htmlFor="search-term"
                  className="text-xs text-text-secondary font-medium mb-1"
                >
                  Board Search
                </label>
                <input
                  id="search-term"
                  type="text"
                  placeholder="Title or Description..."
                  value={tempSearchTerm}
                  onChange={(e) => setTempSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDownOnInput}
                  className="w-full px-3 py-1.5 bg-dark-600 text-text-primary placeholder-text-muted rounded-lg border border-dark-600 focus:outline-none focus:border-limeyellow-500 transition-colors text-sm"
                />
              </div>

              <div className="flex flex-col w-full sm:w-auto mt-4 sm:mt-0">
                <label className="text-xs text-text-secondary font-medium mb-1 invisible">
                  Apply
                </label>
                <button
                  onClick={handleApplyFilters}
                  disabled={areFiltersApplied}
                  className="w-full sm:w-auto px-4 py-1.5 bg-limeyellow-500 hover:bg-limeyellow-600 text-dark-900 text-sm font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 bg-dark-900 rounded-xl">
        {!isWorkspaceSelected ? (
          <div className="bg-dark-800 rounded-2xl shadow-lg p-6 text-center text-text-primary">
            <h3 className="font-bold">No Workspace Selected</h3>
            <p className="text-sm text-text-secondary mt-2">
              Please select a workspace from the sidebar to view and manage
              boards.
            </p>
          </div>
        ) : loading && page === 1 ? (
          <div className="text-center text-text-secondary p-6">Loading...</div>
        ) : (
          <div className="bg-dark-800 rounded-2xl shadow-lg p-4 font-poppins animate-fade-in">
            <div className="overflow-x-auto">
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
                        No hay tableros disponibles en este workspace.
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
                              key={key}
                              className="px-4 py-3 text-text-secondary max-w-xs overflow-hidden text-ellipsis"
                            >
                              {row[key as keyof BoardData]?.toString() ?? "-"}
                            </td>
                          ))}
                        </tr>

                        {expandedRow === i && (
                          <tr className="bg-dark-600/50 ">
                            <td colSpan={headers.length} className="px-2 py-1">
                              <div className="flex justify-end gap-1">
                                <button
                                  onClick={() => handleEditClick(row)}
                                  className="px-1 py-1 bg-limeyellow-500 hover:bg-limeyellow-400 rounded text-dark-900 transition-colors duration-150"
                                >
                                  <EditIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(row)}
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
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-dark-700 flex-shrink-0">
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

      {/* MODALS */}
      {/* {(editingItem || isAddingItem) && (
        <BoardFormModal
          boardToEdit={editingItem}
          workspaceId={workspaceId}
          onSave={handleFormSave}
          onClose={() => {
            setEditingItem(null);
            setIsAddingItem(false);
          }}
        />
      )} */}

      {deletingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
          <div className="bg-dark-800 p-6 rounded-xl shadow-lg animate-scale-in">
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Confirmar eliminación
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              ¿Seguro que deseas eliminar el tablero **{deletingItem.title}**?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingItem(null)}
                className="px-3 py-1 bg-gray-600 rounded text-white text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deletingItem)}
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

export default BoardsManager;
