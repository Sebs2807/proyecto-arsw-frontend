import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import MembersModal from "../../../../src/comoponents/organisms/modals/memberModal";
import workspaceReducer from "../../../../src/store/slices/workspaceSlice";

vi.mock("../../../../src/services/api/ApiService", () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../../../../src/assets/x.svg?react", () => ({
  __esModule: true,
  default: () => <svg data-testid="close-icon" />,
}));

const { apiService } = await import("../../../../src/services/api/ApiService");

const makeStore = (workspaceId = "ws-123") =>
  configureStore({
    reducer: { workspace: workspaceReducer },
    preloadedState: {
      workspace: { selectedWorkspace: { id: workspaceId } },
    },
  });

const renderModal = (props: any) =>
  render(
    <Provider store={makeStore()}>
      <MembersModal {...props} />
    </Provider>
  );

describe("MembersModal", () => {
  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    member: null,
    mode: "add" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no debe renderizar si isOpen es false", () => {
    renderModal({ ...baseProps, isOpen: false });
    expect(screen.queryByText(/Add Member/i)).not.toBeInTheDocument();
  });

  it("renderiza correctamente el modo Add", () => {
    renderModal(baseProps);
    expect(screen.getByText("Add Member")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Add")).toBeInTheDocument();
  });

  it("renderiza correctamente el modo Edit", () => {
    const member = {
      id: "1",
      firstName: "Juan",
      lastName: "Pérez",
      email: "juan@test.com",
      role: "member",
    };
    renderModal({ ...baseProps, mode: "edit", member });
    expect(screen.getByDisplayValue("Juan")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Pérez")).toBeInTheDocument();
    expect(screen.getByDisplayValue("juan@test.com")).toBeInTheDocument();
    expect(screen.getByText("Update")).toBeInTheDocument();
  });

  it("renderiza correctamente el modo Delete", () => {
    const member = {
      id: "1",
      firstName: "Ana",
      lastName: "López",
      email: "ana@test.com",
      role: "admin",
    };
    renderModal({ ...baseProps, mode: "delete", member });
    expect(screen.getByText(/Delete Member/i)).toBeInTheDocument();
    expect(screen.getByText(/¿Seguro que quieres eliminar al miembro/i)).toBeInTheDocument();
  });

it("llama a apiService.post cuando se agrega un miembro", async () => {
  (apiService.get as any).mockResolvedValueOnce({
    items: [
      {
        id: "user-1",
        email: "test@test.com",
        firstName: "Carlos",
        lastName: "Gómez",
      },
    ],
  });
  (apiService.post as any).mockResolvedValueOnce({});

  renderModal(baseProps);

  const emailInput = screen.getByRole("textbox");

  fireEvent.change(emailInput, { target: { name: "email", value: "te" } });

  await waitFor(() =>
    expect(apiService.get).toHaveBeenCalledWith(
      "/v1/users/autocomplete",
      expect.any(Object)
    )
  );

  const suggestionRow = await screen.findByText("Carlos Gómez");
  fireEvent.click(suggestionRow);

  const select = screen.getByRole("combobox");
  fireEvent.change(select, { target: { name: "role", value: "admin" } });

  const addButton = screen.getByText("Add");
  fireEvent.click(addButton);

  await waitFor(() => expect(apiService.post).toHaveBeenCalled());

  expect(apiService.post).toHaveBeenCalledWith("/v1/workspaces/users", {
    userId: "user-1",
    workspaceId: "ws-123",
    role: "admin",
  });
  expect(baseProps.onSuccess).toHaveBeenCalled();
  expect(baseProps.onClose).toHaveBeenCalled();
});


  it("llama a apiService.patch cuando se edita un miembro", async () => {
    const member = {
      id: "2",
      firstName: "Camila",
      lastName: "Ríos",
      email: "camila@test.com",
      role: "member",
    };
    renderModal({ ...baseProps, mode: "edit", member });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { name: "role", value: "admin" } });
    fireEvent.click(screen.getByText("Update"));

    await waitFor(() => expect(apiService.patch).toHaveBeenCalled());
    expect(baseProps.onSuccess).toHaveBeenCalled();
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it("llama a apiService.delete cuando se elimina un miembro", async () => {
    const member = {
      id: "3",
      firstName: "Pedro",
      lastName: "Gómez",
      email: "pedro@test.com",
      role: "guest",
    };
    renderModal({ ...baseProps, mode: "delete", member });
    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => expect(apiService.delete).toHaveBeenCalled());
    expect(baseProps.onSuccess).toHaveBeenCalled();
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it("deshabilita el botón Add si el formulario no es válido", () => {
    renderModal(baseProps);
    const addButton = screen.getByText("Add");
    expect(addButton).toBeDisabled();
  });
});
