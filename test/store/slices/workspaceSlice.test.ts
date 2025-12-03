// test/store/workspaceSlice.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import reducer, {
  fetchWorkspaces,
  setWorkspaces,
  setSelectedWorkspace,
  setSelectedBoard,
  clearSelectedBoard,
  type Workspace,
  type Board,
} from "../../../src/store/slices/workspaceSlice";

vi.mock("../../../src/services/api/ApiService", () => ({
  apiService: {
    get: vi.fn(),
  },
}));

import { apiService } from "../../../src/services/api/ApiService";

describe("workspaceSlice", () => {
  const mockWorkspaces: Workspace[] = [
    { id: "1", name: "Workspace 1" },
    { id: "2", name: "Workspace 2" },
  ];

  const mockBoard: Board = {
    id: "b1",
    title: "Tablero principal",
    workspaceId: "1",
  };

  const initialState = {
    workspaces: [] as Workspace[],
    selectedWorkspace: null,
    selectedBoard: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("setWorkspaces debería actualizar workspaces y asignar selectedWorkspace si no existe", () => {
    const newState = reducer(initialState, setWorkspaces(mockWorkspaces));
    expect(newState.workspaces).toEqual(mockWorkspaces);
    expect(newState.selectedWorkspace).toEqual(mockWorkspaces[0]);
  });

  it("setWorkspaces no debería sobrescribir selectedWorkspace si ya existe", () => {
    const stateWithSelection = {
      ...initialState,
      selectedWorkspace: mockWorkspaces[1],
    };
    const newState = reducer(stateWithSelection, setWorkspaces(mockWorkspaces));
    expect(newState.selectedWorkspace).toEqual(mockWorkspaces[1]);
  });

  it("setSelectedWorkspace debería cambiar el workspace seleccionado y limpiar el board", () => {
    const prevState = { ...initialState, selectedBoard: mockBoard };
    const newState = reducer(prevState, setSelectedWorkspace(mockWorkspaces[1]));
    expect(newState.selectedWorkspace).toEqual(mockWorkspaces[1]);
    expect(newState.selectedBoard).toBeNull();
  });

  it("setSelectedBoard debería asignar el board seleccionado", () => {
    const newState = reducer(initialState, setSelectedBoard(mockBoard));
    expect(newState.selectedBoard).toEqual(mockBoard);
  });

  it("clearSelectedBoard debería dejar selectedBoard como null", () => {
    const stateWithBoard = { ...initialState, selectedBoard: mockBoard };
    const newState = reducer(stateWithBoard, clearSelectedBoard());
    expect(newState.selectedBoard).toBeNull();
  });

  it("fetchWorkspaces.fulfilled debería llenar workspaces y seleccionar el primero si no hay uno previo", () => {
    const action = { type: fetchWorkspaces.fulfilled.type, payload: mockWorkspaces };
    const newState = reducer(initialState, action);
    expect(newState.workspaces).toEqual(mockWorkspaces);
    expect(newState.selectedWorkspace).toEqual(mockWorkspaces[0]);
  });

  it("fetchWorkspaces.fulfilled no debería sobrescribir selectedWorkspace existente", () => {
    const prevState = { ...initialState, selectedWorkspace: mockWorkspaces[1] };
    const action = { type: fetchWorkspaces.fulfilled.type, payload: mockWorkspaces };
    const newState = reducer(prevState, action);
    expect(newState.selectedWorkspace).toEqual(mockWorkspaces[1]);
  });

  it("debería ejecutar fetchWorkspaces correctamente cuando la API responde bien", async () => {
    (apiService.get as any).mockResolvedValueOnce(mockWorkspaces);

    const dispatch = vi.fn();
    const thunk = fetchWorkspaces();
    const result = await thunk(dispatch, () => ({}), undefined);

    expect(apiService.get).toHaveBeenCalledWith("/v1/workspaces", { withCredentials: true });
    expect(result.type).toBe("workspace/fetchWorkspaces/fulfilled");
    expect(result.payload).toEqual(mockWorkspaces);
  });

  it("debería manejar errores correctamente cuando la API falla", async () => {
    (apiService.get as any).mockRejectedValueOnce({ message: "Error API" });

    const dispatch = vi.fn();
    const thunk = fetchWorkspaces();
    const result = await thunk(dispatch, () => ({}), undefined);

    expect(result.type).toBe("workspace/fetchWorkspaces/rejected");
    expect(result.payload).toBe("Error API");
  });
});
