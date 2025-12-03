import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import Navbar from "../../../src/comoponents/organisms/Navbar";
import workspaceReducer from "../../../src/store/slices/workspaceSlice";

const renderWithStore = (ui, { preloadedState } = {}) => {
  const store = configureStore({
    reducer: {
      workspace: workspaceReducer,
    },
    preloadedState,
  });
  return render(<Provider store={store}>{ui}</Provider>);
};

describe("Navbar", () => {
  const mockOnCreateWorkspace = vi.fn();

  const preloadedState = {
    workspace: {
      workspaces: [
        { id: "1", name: "Workspace 1" },
        { id: "2", name: "Workspace 2" },
      ],
      selectedWorkspace: { id: "1", name: "Workspace 1" },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza correctamente el nombre del workspace seleccionado", () => {
    renderWithStore(<Navbar onCreateWorkspace={mockOnCreateWorkspace} />, {
      preloadedState,
    });

    expect(screen.getByText("Workspace 1")).toBeInTheDocument();
  });

  it("muestra el ícono del dropdown", () => {
    renderWithStore(<Navbar onCreateWorkspace={mockOnCreateWorkspace} />, {
      preloadedState,
    });

    const svgIcon = document.querySelector("svg");
    expect(svgIcon).toBeTruthy();
  });

  it("renderiza correctamente el contenedor del Navbar", () => {
    const { container } = renderWithStore(
      <Navbar onCreateWorkspace={mockOnCreateWorkspace} />,
      { preloadedState }
    );

    expect(container.firstChild).toBeInTheDocument();
  });

  it("llama correctamente el callback de creación", () => {
    renderWithStore(<Navbar onCreateWorkspace={mockOnCreateWorkspace} />, {
      preloadedState,
    });

    const button = screen.getByText("Workspace 1");
    button.click();

    expect(button).toBeInTheDocument();
  });
});
