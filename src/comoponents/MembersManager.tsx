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
import MembersModal from "./organisms/modals/memberModal";

const Role = {
  SUPER_ADMIN: "superAdmin",
  ADMIN: "admin",
  MEMBER: "member",
  GUEST: "guest",
} as const;

type Role = (typeof Role)[keyof typeof Role];

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  picture?: string;
  createdAt: string;
  updatedAt: string;
  role: Role;
}

interface TransformedRow {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  role: string;
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

const ROLE_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: Role.SUPER_ADMIN, label: "Super Admin" },
  { value: Role.ADMIN, label: "Admin" },
  { value: Role.MEMBER, label: "Member" },
  { value: Role.GUEST, label: "Guest" },
];

const ITEMS_PER_PAGE = 10;

const MembersManager: React.FC = () => {
  const activeWorkspaceId = useSelector(
    (state: RootState) => state.workspace.selectedWorkspace?.id
  );

  const [data, setData] = useState<TransformedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  const [tempSearchTerm, setTempSearchTerm] = useState("");
  const [tempSelectedRole, setTempSelectedRole] = useState("");
  const [tempBoardSearchTerm, setTempBoardSearchTerm] = useState("");
  const [tempSelectedBoardId, setTempSelectedBoardId] = useState<string | null>(
    null
  );

  const [isFiltersVisible, setIsFiltersVisible] = useState(true);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMember, setModalMember] = useState<Member | null>(null);

  const transformMembers = (items: Member[]): TransformedRow[] => {
    return items.map((m) => ({
      id: m.id,
      name: `${m.firstName} ${m.lastName}`,
      email: m.email,
      createdAt: new Date(m.createdAt).toLocaleDateString(),
      updatedAt: new Date(m.updatedAt).toLocaleDateString(),
      role: Object.entries(Role).find(([, v]) => v === m.role)?.[0] || m.role,
    }));
  };


const CONFIG = useMemo(
  () => ({
    endpoint: "/v1/users/paginated",
    columns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "createdAt", label: "Created" },
      { key: "role", label: "Role" },
      { key: "actions", label: "Actions" },
    ],
    transform: transformMembers,
    title: "Members",
    description: "View and manage workspace members.",
  }),
  []
);


  const handleApplyFilters = useCallback(() => {
    setSearchTerm(tempSearchTerm);
    setSelectedRole(tempSelectedRole);
    setSelectedBoardId(tempSelectedBoardId);
    setPage(1);
  }, [tempSearchTerm, tempSelectedRole, tempSelectedBoardId]);

  const handleResetFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedRole("");
    setSelectedBoardId(null);
    setTempSearchTerm("");
    setTempSelectedRole("");
    setTempSelectedBoardId(null);
    setTempBoardSearchTerm("");
    setPage(1);
  }, []);

  const [modalMode, setModalMode] = useState<"add" | "edit" | "delete">("add");

  const handleAdd = () => {
    setModalMode("add");
    setModalMember(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: Record<string, any>) => {
    setModalMode("edit");
    setModalMember({
      id: item.id,
      firstName: item.name.split(" ")[0],
      lastName: item.name.split(" ")[1] || "",
      email: item.email,
      role: item.role.toLowerCase(),
      createdAt: "",
      updatedAt: "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = (item: Record<string, any>) => {
    setModalMode("delete");
    setModalMember({
      id: item.id,
      firstName: item.name.split(" ")[0],
      lastName: item.name.split(" ")[1] || "",
      email: item.email,
      role: item.role.toLowerCase(),
      createdAt: "",
      updatedAt: "",
    });
    setIsModalOpen(true);
  };

  const fetchData = useCallback(async () => {
    if (!activeWorkspaceId) return;
    const abortController = new AbortController();

    try {
      setLoading(true);
      let query = `${
        CONFIG.endpoint
      }?page=${page}&limit=${ITEMS_PER_PAGE}&workspaceId=${encodeURIComponent(
        activeWorkspaceId
      )}`;

      if (searchTerm.trim())
        query += `&search=${encodeURIComponent(searchTerm)}`;
      if (selectedRole) query += `&role=${encodeURIComponent(selectedRole)}`;
      if (selectedBoardId)
        query += `&boardId=${encodeURIComponent(selectedBoardId)}`;

      const response = await apiService.get<PaginatedResponse<Member>>(query, {
        signal: abortController.signal,
      });

      setData(CONFIG.transform(response.data || []));
      setTotalItems(response.meta?.total ?? 0);
      setTotalPages(response.meta?.totalPages ?? 1);
    } catch (error: any) {
      if (error.name !== "CanceledError") {
        console.error(`Error fetching ${CONFIG.title}:`, error);
        setData([]);
      }
    } finally {
      setLoading(false);
    }

    return () => abortController.abort();
  }, [
    page,
    searchTerm,
    selectedRole,
    selectedBoardId,
    activeWorkspaceId,
    CONFIG,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setTempSearchTerm(searchTerm);
    setTempSelectedRole(selectedRole);
    setTempSelectedBoardId(selectedBoardId);
  }, [searchTerm, selectedRole, selectedBoardId]);

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
    tempSearchTerm === searchTerm &&
    tempSelectedRole === selectedRole &&
    tempSelectedBoardId === selectedBoardId;

  const isAnyFilterActive =
    searchTerm !== "" || selectedRole !== "" || selectedBoardId !== null;

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

        <button
          type="button"
          className="flex justify-between items-center w-full mt-3 pt-3 border-t border-dark-600 cursor-pointer bg-transparent"
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
          <span className="p-1 text-text-secondary hover:bg-dark-700 rounded-full">
            {isFiltersVisible ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </span>
        </button>

        {isFiltersVisible && (
          <div className="mt-3 flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex flex-col w-full sm:w-48">
            <label
              htmlFor="general-search" 
              className="text-xs text-text-secondary font-medium mb-1"
            >                
            General Search
              </label>
              <input
                id="general-search"
                value={tempSearchTerm}
                onChange={(e) => setTempSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
                placeholder="Name or Email..."
                className="w-full px-3 py-1.5 bg-dark-600 text-text-primary rounded-lg 
                 border border-dark-600 focus:outline-none focus:border-limeyellow-500
                 transition-colors text-sm"
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
                onChange={(e) => setTempSelectedRole(e.target.value)}
                className="w-full px-3 py-1.5 bg-dark-600 text-text-primary rounded-lg 
                 border border-dark-600 focus:outline-none focus:border-limeyellow-500
                 transition-colors text-sm cursor-pointer"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
                Aplicar
              </button>
              <button
                onClick={handleResetFilters}
                disabled={!isAnyFilterActive}
                className="px-4 py-1.5 bg-dark-600 hover:bg-dark-700 text-text-secondary text-sm rounded-lg disabled:opacity-50"
              >
                Reiniciar
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
                        No data available.
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
                                    className="p-1 bg-dark-600 hover:bg-limeyellow-400 rounded-lg"
                                  >
                                    <EditIcon className="w-4 h-4 text-text-primary" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(row);
                                    }}
                                    className="p-1 bg-dark-600 hover:bg-limeyellow-400 rounded-lg"
                                  >
                                    <TrashIcon className="w-4 h-4 text-text-primary hover:text-red-500" />
                                  </button>
                                </div>
                              </td>
                            ) : (
                              <td key={key as string} className="px-4 py-3">
                                {row[key] || "-"}
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
                  Showing <strong>{ITEMS_PER_PAGE * (page - 1) + 1}</strong>
                  {" – "}
                  <strong>{Math.min(ITEMS_PER_PAGE * page, totalItems)}</strong>
                  {" of "}
                  <strong>{totalItems}</strong>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1 || loading}
                    className="p-2 rounded-full text-text-secondary hover:bg-dark-700 disabled:opacity-50"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>

                  {pageRange.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
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
                    className="p-2 rounded-full text-text-secondary hover:bg-dark-700 disabled:opacity-50"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <MembersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        member={modalMember}
        mode={modalMode}
      />
    </div>
  );
};

export default MembersManager;
