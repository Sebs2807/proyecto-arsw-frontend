import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import HomeSidebar from "../../../../src/comoponents/organisms/sidebar/HomeSidebar";
import { setActiveItem } from "../../../../src/store/slices/sidebarSlice";
import { vi } from "vitest";

const mockStore = configureStore([]);
vi.mock("../../../../src/store/slices/sidebarSlice", () => ({
  setActiveItem: vi.fn((id: string) => ({ type: "sidebar/setActiveItem", payload: id })),
}));

describe("🧩 HomeSidebar", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("no renderiza nada si no hay workspace seleccionado", () => {
    const store = mockStore({
      workspace: { selectedWorkspace: null },
      sidebar: { activeItem: "" },
    });

    const { container } = render(
      <Provider store={store}>
        <HomeSidebar />
      </Provider>
    );

    expect(container.firstChild).toBeNull();
  });

  it("renderiza los botones correctamente cuando hay workspace", () => {
    const store = mockStore({
      workspace: { selectedWorkspace: { id: "1", name: "Workspace Test" } },
      sidebar: { activeItem: "" },
    });

    render(
      <Provider store={store}>
        <HomeSidebar />
      </Provider>
    );

    expect(screen.getByText("Gestión de miembros")).toBeInTheDocument();
    expect(screen.getByText("Gestión de tableros")).toBeInTheDocument();
    expect(screen.getByText("Agentes de IA")).toBeInTheDocument();
  });

  it("despacha setActiveItem al hacer clic en 'Gestión de tableros'", () => {
    const store = mockStore({
      workspace: { selectedWorkspace: { id: "1", name: "Workspace Test" } },
      sidebar: { activeItem: "" },
    });
    store.dispatch = vi.fn();

    render(
      <Provider store={store}>
        <HomeSidebar />
      </Provider>
    );

    const button = screen.getByText("Gestión de tableros");
    fireEvent.click(button);

    expect(setActiveItem).toHaveBeenCalledWith("boards");
    expect(store.dispatch).toHaveBeenCalledWith({
      type: "sidebar/setActiveItem",
      payload: "boards",
    });
  });
});
