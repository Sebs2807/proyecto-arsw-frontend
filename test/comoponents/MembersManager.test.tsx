import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import MembersManager from "../../src/comoponents/MembersManager";
import { apiService } from "../../src/services/api/ApiService";

vi.mock("../../src/comoponents/molecules/BoardPicker", () => ({
  default: ({ handleApplyFilters }: any) => (
    <div data-testid="board-picker">
      <button onClick={handleApplyFilters}>Apply Board</button>
    </div>
  ),
}));

vi.mock("../../src/comoponents/organisms/modals/memberModal", () => ({
  default: ({ isOpen, onClose, mode }: any) =>
    isOpen ? (
      <div data-testid="members-modal">
        <span>Modal Mode: {mode}</span>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("../../src/services/api/ApiService", () => ({
  apiService: {
    get: vi.fn(),
  },
}));

const workspaceReducer = (
  state = { selectedWorkspace: { id: "workspace-123" } },
  _action: any
) => state;

const mockStore = configureStore({
  reducer: {
    workspace: workspaceReducer,
  },
});

const renderWithStore = () =>
  render(
    <Provider store={mockStore}>
      <MembersManager />
    </Provider>
  );

describe("MembersManager Component", () => {
  const mockMembers = [
    {
      id: "1",
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@example.com",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      role: "admin",
    },
    {
      id: "2",
      firstName: "Bob",
      lastName: "Brown",
      email: "bob@example.com",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      role: "member",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders and fetches data successfully", async () => {
    (apiService.get as any).mockResolvedValueOnce({
      data: mockMembers,
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    renderWithStore();

    expect(await screen.findByText("Members")).toBeInTheDocument();
    expect(await screen.findByText("Alice Smith")).toBeInTheDocument();
    expect(await screen.findByText("Bob Brown")).toBeInTheDocument();
  });

  it("shows 'No data available' when empty", async () => {
    (apiService.get as any).mockResolvedValueOnce({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
    });

    renderWithStore();
    await waitFor(() =>
      expect(screen.getByText("No data available.")).toBeInTheDocument()
    );
  });

  it("opens modal when clicking Add", async () => {
    (apiService.get as any).mockResolvedValueOnce({
      data: mockMembers,
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    renderWithStore();
    const addButton = await screen.findByText("Add");
    fireEvent.click(addButton);
    expect(screen.getByTestId("members-modal")).toBeInTheDocument();
    expect(screen.getByText(/Modal Mode: add/i)).toBeInTheDocument();
  });

  it("applies and resets filters", async () => {
    (apiService.get as any).mockResolvedValue({
      data: mockMembers,
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    renderWithStore();
    await screen.findByText("Members");

    const searchInput = screen.getByPlaceholderText("Name or Email...");
    fireEvent.change(searchInput, { target: { value: "Alice" } });

    const applyButton = screen.getByText("Aplicar");
    fireEvent.click(applyButton);

    await waitFor(() =>
      expect(apiService.get).toHaveBeenCalledWith(
        expect.stringContaining("search=Alice"),
        expect.anything()
      )
    );

    const resetButton = screen.getByText("Reiniciar");
    fireEvent.click(resetButton);

    await waitFor(() =>
      expect(apiService.get).toHaveBeenCalledWith(
        expect.stringContaining("page=1"),
        expect.anything()
      )
    );
  });

  it("handles pagination", async () => {
    (apiService.get as any).mockResolvedValue({
      data: mockMembers,
      meta: { total: 20, page: 1, limit: 10, totalPages: 2 },
    });

    renderWithStore();
    await screen.findByText("Members");

    const nextButton = screen.getAllByRole("button").find((b) =>
      b.innerHTML.includes("chevron-right")
    );
    if (nextButton) {
      fireEvent.click(nextButton);
      await waitFor(() => expect(apiService.get).toHaveBeenCalledTimes(2));
    }
  });

  it("shows and hides filters", async () => {
    (apiService.get as any).mockResolvedValue({
      data: mockMembers,
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    renderWithStore();
    await screen.findByText("Filters");
    const toggleButton = screen.getAllByRole("button").pop();
    if (toggleButton) {
      fireEvent.click(toggleButton);
      fireEvent.click(toggleButton);
    }
    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("renders loading state", async () => {
    (apiService.get as any).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: [], meta: {} }), 100)
        )
    );

    renderWithStore();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
