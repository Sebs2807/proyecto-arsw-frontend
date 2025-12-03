import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { vi } from "vitest";
import Board from "../../../../src/comoponents/pages/dashboard/Board";
import { MemoryRouter } from "react-router-dom";
import { apiService } from "../../../../src/services/api/ApiService";
import { store } from "../../../../src/store";

vi.mock("../../../../src/services/api/ApiService", () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    initSocket: vi.fn(),
    disconnectSocket: vi.fn(),
    socket: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
  },
}));

// 🧪 Mock de store de Redux
const mockStore = (state: any) => ({
  getState: () => state,
  subscribe: () => {},
  dispatch: vi.fn(),
});

const renderWithProviders = (ui: React.ReactElement) => {
  return render(<Provider store={store}>{ui}</Provider>);
};

describe("Board Component", () => {

  test("muestra mensaje cuando no hay tablero seleccionado", () => {
    const store = mockStore({
      workspace: { selectedBoard: null },
      auth: { user: { email: "test@example.com" } },
    });

    render(
      <Provider store={store as any}>
        <MemoryRouter>
          <Board />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText("No hay tablero seleccionado.")).toBeInTheDocument();
  });

  test("muestra mensaje de carga cuando se está cargando el tablero", async () => {
    const store = mockStore({
      workspace: { selectedBoard: { id: "123", title: "Mi tablero" } },
      auth: { user: { email: "user@test.com" } },
    });

    render(
      <Provider store={store as any}>
        <MemoryRouter>
          <Board />
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText("Cargando tablero...")).toBeInTheDocument();
  });

  test("renderiza listas y tareas correctamente", async () => {
    const mockLists = [
      {
        id: "list1",
        title: "Pendientes",
        order: 0,
        cards: [
          { id: "task1", title: "Tarea 1", description: "Desc 1", listId: "list1" },
        ],
      },
    ];

    (apiService.get as vi.Mock).mockResolvedValueOnce(mockLists);

    const store = mockStore({
      workspace: { selectedBoard: { id: "board1", title: "Tablero Principal" } },
      auth: { user: { email: "user@test.com" } },
    });

    render(
      <Provider store={store as any}>
        <MemoryRouter>
          <Board />
        </MemoryRouter>
      </Provider>
    );

    expect(await screen.findByText("Pendientes (1)")).toBeInTheDocument();
    expect(await screen.findByText("Tarea 1")).toBeInTheDocument();
  });

  test("muestra correctamente la vista vacía cuando no hay listas en el tablero", async () => {
    (apiService.get as vi.Mock).mockResolvedValueOnce([]);

    const store = mockStore({
      workspace: { selectedBoard: { id: "board2", title: "Tablero Vacío" } },
      auth: { user: { email: "user@test.com" } },
    });

    render(
      <Provider store={store as any}>
        <MemoryRouter>
          <Board />
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText("Tablero Vacío")).toBeInTheDocument();
      expect(screen.getByText("+ Añadir lista")).toBeInTheDocument();
    });
  });

  test("muestra mensaje de error si falla la carga de listas", async () => {
    (apiService.get as vi.Mock).mockRejectedValueOnce(
      new Error("Error al obtener las listas")
    );

    const store = mockStore({
      workspace: { selectedBoard: { id: "boardError", title: "Tablero con error" } },
      auth: { user: { email: "user@test.com" } },
    });

    render(
      <Provider store={store as any}>
        <MemoryRouter>
          <Board />
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(
        screen.getByText(/No se pudieron cargar las listas del tablero/i)
      ).toBeInTheDocument();
    });
  });

  // ✅ Renderiza correctamente los nombres de las listas
  it("renderiza los nombres de las listas correctamente", async () => {
    const mockLists = [
      { id: "1", title: "Pendientes", cards: [] },
      { id: "2", title: "En progreso", cards: [] },
    ];

    (apiService.get as vi.Mock).mockResolvedValue(mockLists);

    const store = mockStore({
      workspace: { selectedBoard: { id: "board1", title: "Tablero de prueba" } },
      auth: { user: { email: "user@test.com" } },
    });

    render(
      <Provider store={store as any}>
        <MemoryRouter>
          <Board />
        </MemoryRouter>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Pendientes/i)).toBeInTheDocument();
      expect(screen.getByText(/En progreso/i)).toBeInTheDocument();
    });
  });

test("abre y cierra el modal al crear una nueva lista", async () => {
  (apiService.get as vi.Mock).mockResolvedValueOnce([]);

  const store = mockStore({
    workspace: { selectedBoard: { id: "board3", title: "Tablero Modal" } },
    auth: { user: { email: "user@test.com" } },
  });

  await act(async () => {
    render(
      <Provider store={store as any}>
        <MemoryRouter>
          <Board />
        </MemoryRouter>
      </Provider>
    );
  });

  await waitFor(() => {
    expect(screen.getByText("+ Añadir lista")).toBeInTheDocument();
  });

  await act(async () => {
    fireEvent.click(screen.getByText("+ Añadir lista"));
  });

  expect(await screen.findByPlaceholderText("Título de la lista")).toBeInTheDocument();
  expect(screen.getByText("Crear lista")).toBeInTheDocument();
  expect(screen.getByText("Cancelar")).toBeInTheDocument();

  await act(async () => {
    fireEvent.click(screen.getByText("Cancelar"));
  });

  await waitFor(() => {
    expect(screen.queryByPlaceholderText("Título de la lista")).not.toBeInTheDocument();
  });
});

});
