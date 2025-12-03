import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import workspaceReducer from "../../../../src/store/slices/workspaceSlice";
import BoardsSidebar from "../../../../src/comoponents/organisms/sidebar/BoardsSidebar";
import { vi } from "vitest";

vi.mock("../../../../src/services/api/ApiService", () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiService } from "../../../../src/services/api/ApiService";

beforeAll(() => {
  global.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

const renderWithStore = (ui: React.ReactNode, { preloadedState } = {}) => {
  const store = configureStore({
    reducer: { workspace: workspaceReducer },
    preloadedState,
  });
  return render(<Provider store={store}>{ui}</Provider>);
};

const preloadedState = {
  workspace: {
    selectedWorkspace: { id: "ws1", name: "Workspace Test" },
    selectedBoard: null,
    workspaces: [],
  },
};

describe("BoardsSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza el buscador correctamente", () => {
    renderWithStore(<BoardsSidebar />, { preloadedState });
    expect(
      screen.getByPlaceholderText("Buscar por título...")
    ).toBeInTheDocument();
  });

  it("muestra mensaje de error si la API falla", async () => {
    (apiService.get as any).mockRejectedValueOnce(new Error("API Error"));

    renderWithStore(<BoardsSidebar />, { preloadedState });

    await waitFor(() => {
      expect(
        screen.getByText("No se pudieron cargar los tableros")
      ).toBeInTheDocument();
    });
  });

  it("muestra mensaje cuando no hay tableros", async () => {
    (apiService.get as any).mockResolvedValueOnce({ items: [] });

    renderWithStore(<BoardsSidebar />, { preloadedState });

    await waitFor(() => {
      expect(
        screen.getByText("No se encontraron tableros.")
      ).toBeInTheDocument();
    });
  });

  it("renderiza correctamente cuando hay tableros", async () => {
    (apiService.get as any).mockResolvedValueOnce({
      items: [
        { id: "1", title: "Tablero A" },
        { id: "2", title: "Tablero B" },
      ],
    });

    renderWithStore(<BoardsSidebar />, { preloadedState });

    await waitFor(() => {
      expect(screen.getByText("Tablero A")).toBeInTheDocument();
      expect(screen.getByText("Tablero B")).toBeInTheDocument();
    });
  });

  it("permite buscar un tablero existente", async () => {
    (apiService.get as any).mockResolvedValueOnce({
      items: [
        { id: "1", title: "Proyecto Alfa" },
        { id: "2", title: "Proyecto Beta" },
      ],
    });

    renderWithStore(<BoardsSidebar />, { preloadedState });

    await waitFor(() => {
      expect(screen.getByText("Proyecto Alfa")).toBeInTheDocument();
      expect(screen.getByText("Proyecto Beta")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Buscar por título...");
    searchInput.focus();
    await waitFor(() => {
      expect(searchInput).toHaveFocus();
    });
  });
});
