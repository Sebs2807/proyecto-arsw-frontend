import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import MainLayout from "../../../src/comoponents/layouts/MainLayout";
import { configureStore } from "@reduxjs/toolkit";
import workspaceReducer, {
  fetchWorkspaces,
  setWorkspaces,
  setSelectedWorkspace,
} from "../../../src/store/slices/workspaceSlice";

// 🔧 Mock de dependencias externas
vi.mock("../../../src/comoponents/organisms/Navbar", () => ({
  default: ({ onCreateWorkspace }: { onCreateWorkspace: () => void }) => (
    <button onClick={onCreateWorkspace}>Crear workspace</button>
  ),
}));

vi.mock("../../../src/comoponents/organisms/sidebar/Sidebar", () => ({
  default: () => <div>Sidebar Component</div>,
}));

// Mock del thunk fetchWorkspaces
vi.mock("../../../src/store/slices/workspaceSlice", async () => {
  const actual = await vi.importActual<
    typeof import("../../../src/store/slices/workspaceSlice")
  >("../../../src/store/slices/workspaceSlice");
  return {
    ...actual,
    fetchWorkspaces: vi.fn(() => ({ type: "workspace/fetchWorkspaces" })),
  };
});

describe("MainLayout Component", () => {
  const createTestStore = () =>
    configureStore({
      reducer: { workspace: workspaceReducer },
    });

  const renderWithProviders = (store = createTestStore()) =>
    render(
      <Provider store={store}>
        <MemoryRouter>
          <MainLayout />
        </MemoryRouter>
      </Provider>
    );

  it("debe despachar fetchWorkspaces al montar", () => {
    const store = createTestStore();
    renderWithProviders(store);

    expect(fetchWorkspaces).toHaveBeenCalledTimes(1);
  });

  it("debe renderizar Navbar y Sidebar", () => {
    renderWithProviders();
    expect(screen.getByText("Crear workspace")).toBeInTheDocument();
    expect(screen.getByText("Sidebar Component")).toBeInTheDocument();
  });

  it("debe abrir el modal al hacer clic en 'Crear workspace'", () => {
    renderWithProviders();

    fireEvent.click(screen.getByText("Crear workspace"));
    expect(
      screen.getByText("Crear nuevo workspace")
    ).toBeInTheDocument();
  });

  it("debe guardar un nuevo workspace correctamente", async () => {
    const store = createTestStore();
    renderWithProviders(store);

    fireEvent.click(screen.getByText("Crear workspace"));

    const input = screen.getByPlaceholderText("Nombre del workspace");
    fireEvent.change(input, { target: { value: "Workspace Test" } });

    fireEvent.click(screen.getByText("Guardar"));

    await waitFor(() => {
      const state = store.getState().workspace;
      expect(state.workspaces.some((ws) => ws.name === "Workspace Test")).toBe(
        true
      );
      expect(state.selectedWorkspace?.name).toBe("Workspace Test");
    });
  });

  it("no debe guardar si el nombre está vacío", async () => {
    const store = createTestStore();
    renderWithProviders(store);

    fireEvent.click(screen.getByText("Crear workspace"));
    fireEvent.click(screen.getByText("Guardar"));

    await waitFor(() => {
      const state = store.getState().workspace;
      expect(state.workspaces.length).toBe(0);
    });
  });
});
