// test/BoardsManager.test.tsx
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { vi } from "vitest";
import BoardsManager from "../../src/comoponents/BoardsManager";
import workspaceReducer from "../../src/store/slices/workspaceSlice";
import authReducer from "../../src/store/slices/authSlice";

vi.mock("../../src/services/api/ApiService", () => ({
  apiService: {
    get: vi.fn().mockResolvedValue({ items: [], total: 0, totalPages: 1 }),
  },
}));

vi.mock("../../src/components/organisms/modals/boardsModal", () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div>Nuevo tablero</div> : null,
}));

import { apiService } from "../../src/services/api/ApiService";

describe("BoardsManager Component", () => {
  const renderWithStore = (workspaceId: string | null = "workspace-1") => {
    const store = configureStore({
      reducer: {
        workspace: workspaceReducer,
        auth: authReducer,
      },
      preloadedState: {
        workspace: {
          selectedWorkspace: workspaceId ? { id: workspaceId, name: "WS" } : null,
        },
      },
    });

    return render(
      <Provider store={store}>
        <BoardsManager />
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el título y el botón Add", () => {
    renderWithStore();
    expect(screen.getByText("Boards")).toBeInTheDocument();
    expect(screen.getByText("Add")).toBeInTheDocument();
  });

  it("muestra 'Loading...' mientras se cargan los datos", async () => {
    (apiService.get as any).mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      totalPages: 1,
    });

    renderWithStore();
    expect(await screen.findByText("Loading...")).toBeInTheDocument();
  });

  it("muestra 'No data available.' si no hay resultados", async () => {
    (apiService.get as any).mockResolvedValueOnce({
      items: [],
      total: 0,
      totalPages: 1,
    });

    renderWithStore();
    await waitFor(() =>
      expect(screen.getByText("No data available.")).toBeInTheDocument()
    );
  });

  it("muestra filas con datos cuando la API devuelve boards", async () => {
    (apiService.get as any).mockResolvedValueOnce({
      items: [
        {
          id: "1",
          title: "Board Test",
          description: "Descripción",
          color: "#00ff00",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          members: [],
        },
      ],
      total: 1,
      totalPages: 1,
    });

    renderWithStore();
    await waitFor(() => {
      expect(screen.getByText("Board Test")).toBeInTheDocument();
      expect(screen.getByText("Descripción")).toBeInTheDocument();
    });
  });

    it("abre el modal al hacer clic en Add", async () => {
    await act(async () => {
        renderWithStore();
    });

    const addButton = screen.getByText("Add");
    expect(addButton).toBeInTheDocument();

    await act(async () => {
        fireEvent.click(addButton);
    });

    await waitFor(() => {
        expect(screen.getByText("Crear tablero")).toBeInTheDocument();
    });
    });



  it("aplica y reinicia filtros", async () => {
    (apiService.get as any).mockResolvedValueOnce({
      items: [],
      total: 0,
      totalPages: 1,
    });

    await act(async () => {
      renderWithStore();
    });

    const input = screen.getByPlaceholderText("Search by title...");
    await act(async () => {
      fireEvent.change(input, { target: { value: "Test" } });
    });

    const applyBtn = screen.getByText("Aplicar");
    await act(async () => {
      fireEvent.click(applyBtn);
    });

    await waitFor(() => expect(apiService.get).toHaveBeenCalledTimes(2));

    const resetBtn = screen.getByText("Reiniciar");
    await act(async () => {
      fireEvent.click(resetBtn);
    });

    expect(input).toHaveValue("");
  });

  it("maneja correctamente la paginación", async () => {
    (apiService.get as any).mockResolvedValueOnce({
      items: Array.from({ length: 10 }).map((_, i) => ({
        id: `${i}`,
        title: `Board ${i}`,
        description: "desc",
        color: "#000",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        members: [],
      })),
      total: 20,
      totalPages: 2,
    });

    await act(async () => {
      renderWithStore();
    });

    await waitFor(() => screen.getByText("Board 0"));

    const buttons = screen.getAllByRole("button");
    const nextBtn = buttons[buttons.length - 1];

    await act(async () => {
      fireEvent.click(nextBtn);
    });

    await waitFor(() => {
      expect(apiService.get).toHaveBeenCalled();
    });
  });

    it("maneja correctamente un error en fetchData", async () => {
        (apiService.get as any).mockRejectedValueOnce(new Error("Error fetching data"));
        renderWithStore();
        await waitFor(() => {
        expect(screen.getByText("No data available.")).toBeInTheDocument();
        });
    });

    it("no intenta cargar datos si no hay workspace activo", async () => {
        renderWithStore(null);
        expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    });
});