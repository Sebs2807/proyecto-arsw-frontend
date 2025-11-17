import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { Provider } from "react-redux";
import configureStore from "redux-mock-store";
import BoardsModal from "../../../../src/comoponents/organisms/modals/boardsModal";
import { apiService } from "../../../../src/services/api/ApiService";

vi.mock("../../../../src/services/api/ApiService", () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockStore = configureStore([]);
const store = mockStore({
  workspace: {
    selectedWorkspace: { id: "workspace-123" },
  },
});

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSuccess: vi.fn(),
  board: null,
  mode: "add" as const,
};

const renderModal = (props = {}) =>
  render(
    <Provider store={store}>
      <BoardsModal {...baseProps} {...props} />
    </Provider>
  );

describe("BoardsModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("no se renderiza cuando isOpen es false", () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText("Crear tablero")).not.toBeInTheDocument();
  });

  test("renderiza correctamente en modo add", () => {
    renderModal();
    expect(screen.getByText("Crear tablero")).toBeInTheDocument();
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
    expect(screen.getByText("Crear")).toBeDisabled();
  });

  test("renderiza correctamente en modo edit", () => {
    const board = {
      id: "b1",
      title: "Tablero 1",
      description: "Desc",
      color: "#000000",
      members: [],
    };
    renderModal({ mode: "edit", board });
    expect(screen.getByText("Editar tablero")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Tablero 1")).toBeInTheDocument();
  });

  test("renderiza correctamente en modo delete", () => {
    const board = { id: "b1", title: "Tarea X", color: "#ccc" };
    renderModal({ mode: "delete", board });
    expect(
      screen.getByText(/¿Seguro que quieres eliminar el tablero/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Eliminar")).toBeInTheDocument();
  });

    test("llama a apiService.post cuando se crea un tablero", async () => {
        (apiService.post as any).mockResolvedValueOnce({});

        renderModal();

        const textboxes = screen.getAllByRole("textbox");
        const titleInput = textboxes[0]; 
        fireEvent.change(titleInput, { target: { value: "Nuevo tablero" } });

        const createButton = screen.getByRole("button", { name: /Crear/i });
        expect(createButton).not.toBeDisabled();

        fireEvent.click(createButton);

        await waitFor(() => expect(apiService.post).toHaveBeenCalledTimes(1));
        expect(apiService.post).toHaveBeenCalledWith(
            "/v1/boards",
            expect.objectContaining({
            title: "Nuevo tablero",
            workspaceId: "workspace-123",
            })
        );
        expect(baseProps.onSuccess).toHaveBeenCalled();
        expect(baseProps.onClose).toHaveBeenCalled();
    });


  test("llama a apiService.patch cuando se edita un tablero", async () => {
    const board = {
      id: "b1",
      title: "Viejo tablero",
      description: "",
      color: "#123456",
    };
    (apiService.patch as any).mockResolvedValueOnce({});

    renderModal({ mode: "edit", board });

    const titleInput = screen.getByDisplayValue("Viejo tablero");
    fireEvent.change(titleInput, { target: { value: "Nuevo nombre" } });

    fireEvent.click(screen.getByText("Actualizar"));

    await waitFor(() => expect(apiService.patch).toHaveBeenCalledTimes(1));
    expect(apiService.patch).toHaveBeenCalledWith(
      `/v1/boards/${board.id}`,
      expect.objectContaining({
        title: "Nuevo nombre",
      })
    );
  });

  test("llama a apiService.delete cuando se elimina un tablero", async () => {
    const board = { id: "b1", title: "Eliminar este", color: "#fff" };
    (apiService.delete as any).mockResolvedValueOnce({});

    renderModal({ mode: "delete", board });

    fireEvent.click(screen.getByText("Eliminar"));

    await waitFor(() => expect(apiService.delete).toHaveBeenCalledTimes(1));
    expect(apiService.delete).toHaveBeenCalledWith(`/v1/boards/${board.id}`);
    expect(baseProps.onSuccess).toHaveBeenCalled();
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  test("deshabilita el botón Crear si el título está vacío", () => {
    renderModal();
    const button = screen.getByText("Crear");
    expect(button).toBeDisabled();
  });
});
