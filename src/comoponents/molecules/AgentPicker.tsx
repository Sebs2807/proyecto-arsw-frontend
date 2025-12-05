import React, { useState, useEffect, useRef, useCallback } from "react";
import ChevronDownIcon from "../../assets/chevron-down.svg?react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../store";
import {
  setSelectedAgent,
  type Agent,
} from "../../store/slices/workspaceSlice";
import { apiService } from "../../services/api/ApiService";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

const ITEMS_PER_PAGE = 10;

const AgentPicker: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const workspaceId = useSelector(
    (state: RootState) => state.workspace.selectedWorkspace?.id
  );
  const selectedAgent = useSelector(
    (state: RootState) => state.workspace.selectedAgent
  );

  const [agents, setAgents] = useState<Agent[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Función para llamar al endpoint paginado
  const fetchAgents = useCallback(async () => {
    if (!workspaceId) return;

    setIsLoading(true);
    try {
      let query = `/v1/agents/paginated?workspaceId=${encodeURIComponent(
        workspaceId
      )}&page=${page}&limit=${ITEMS_PER_PAGE}`;

      if (searchTerm.trim()) {
        query += `&search=${encodeURIComponent(searchTerm.trim())}`;
      }

      const response = await apiService.get<PaginatedResponse<Agent>>(query, {
        withCredentials: true,
      });

      const agentsData = response.items || [];
      setAgents(agentsData);

      // Seleccionar automáticamente el primero si no hay selección
      if (agentsData.length > 0 && !selectedAgent) {
        dispatch(setSelectedAgent(agentsData[0]));
        setSearchTerm(agentsData[0].name);
      }
    } catch (err) {
      console.error("Error fetching agents:", err);
      setAgents([]);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, searchTerm, page, dispatch, selectedAgent]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredAgents = agents.filter((a) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAgent = (agent: Agent | null) => {
    dispatch(setSelectedAgent(agent));
    setSearchTerm(agent?.name || "");
    setIsDropdownOpen(false);
  };

  return (
    <div className="flex flex-col w-full relative">
      <div className="relative w-full">
        <input
          ref={inputRef}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1); // reiniciar página al buscar
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          placeholder="Selecciona un agente..."
          className="w-full px-3 py-1.5 bg-dark-800 text-text-primary rounded-lg border border-dark-600 focus:outline-none focus:border-limeyellow-500 transition-colors text-sm"
        />
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          aria-expanded={isDropdownOpen}
          aria-label="Mostrar opciones de agentes"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 p-0 bg-transparent border-0 cursor-pointer"
        >
          <ChevronDownIcon
            className={`w-full h-full text-text-secondary transition-transform ${isDropdownOpen ? "rotate-180" : ""
              }`}
          />
        </button>
      </div>

      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-1 left-0 w-full rounded-lg border border-dark-600 bg-dark-900 text-sm text-text-primary shadow-xl z-50 max-h-60 overflow-y-auto animate-fade-in"
        >
          {isLoading ? (
            <div className="px-3 py-2 text-text-secondary text-xs">
              Cargando...
            </div>
          ) : (
            <>
              {filteredAgents.length > 0 ? (
                filteredAgents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => handleSelectAgent(agent)}
                    className={`w-full px-3 py-2 cursor-pointer transition-colors text-sm text-left ${selectedAgent?.id === agent.id
                      ? "bg-limeyellow-500 text-white"
                      : "hover:bg-limeyellow-500 hover:text-white text-text-primary"
                      }`}
                  >
                    {agent.name}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-text-secondary text-xs">
                  No se encontraron agentes
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentPicker;
