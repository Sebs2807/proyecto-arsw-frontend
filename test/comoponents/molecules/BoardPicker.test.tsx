import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "redux-mock-store";
import { vi } from "vitest";
import BoardPicker from "../../../src/comoponents/molecules/BoardPicker";
import { apiService } from "../../../src/services/api/ApiService";

vi.mock("../../../src/services/api/ApiService", () => ({
  apiService: {
    get: vi.fn(),
  },
}));

const mockStore = configureStore([]);
const store = mockStore({
  workspace: { selectedWorkspace: { id: "workspace-1" } },
});

describe("BoardPicker", () => {
  const mockSetSelectedBoardId = vi.fn();
  const mockSetBoardSearchTerm = vi.fn();
  const mockHandleApplyFilters = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = async (boardsResponse = []) => {
    (apiService.get as vi.Mock).mockResolvedValue({
      items: boardsResponse,
      limit: 5,
      page: 1,
      total: boardsResponse.length,
      totalPages: 1,
    });

    render(
      <Provider store={store}>
        <BoardPicker
          boardSearchTerm=""
          selectedBoardId={null}
          setSelectedBoardId={mockSetSelectedBoardId}
          setBoardSearchTerm={mockSetBoardSearchTerm}
          handleApplyFilters={mockHandleApplyFilters}
        />
      </Provider>
    );

    await waitFor(() => expect(apiService.get).toHaveBeenCalled());
  };

  it("renderiza correctamente el input y etiqueta", async () => {
    await setup();
    expect(screen.getByLabelText("Board")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Select board...")).toBeInTheDocument();
  });

  it("llama a la API con los parámetros correctos", async () => {
    await setup();
    expect(apiService.get).toHaveBeenCalledWith(
      expect.stringContaining("/v1/boards/paginated"),
      expect.objectContaining({ withCredentials: true })
    );
  });

  it("muestra los boards obtenidos del API", async () => {
    await setup([
      { id: "1", title: "Board A", description: "" },
      { id: "2", title: "Board B", description: "" },
    ]);

    const input = screen.getByPlaceholderText("Select board...");
    fireEvent.focus(input);

    expect(await screen.findByText("Board A")).toBeInTheDocument();
    expect(screen.getByText("Board B")).toBeInTheDocument();
  });

  it("permite seleccionar un board", async () => {
    await setup([{ id: "1", title: "Board A", description: "" }]);
    const input = screen.getByPlaceholderText("Select board...");
    fireEvent.focus(input);

    const boardOption = await screen.findByText("Board A");
    fireEvent.mouseDown(boardOption);

    expect(mockSetSelectedBoardId).toHaveBeenCalledWith("1");
    expect(mockSetBoardSearchTerm).toHaveBeenCalledWith("Board A");
    expect(mockHandleApplyFilters).toHaveBeenCalled();
  });

  it("permite seleccionar 'All Boards'", async () => {
    await setup([{ id: "1", title: "Board A", description: "" }]);
    const input = screen.getByPlaceholderText("Select board...");
    fireEvent.focus(input);

    const allOption = await screen.findByText("All Boards");
    fireEvent.mouseDown(allOption);

    expect(mockSetSelectedBoardId).toHaveBeenCalledWith(null);
    expect(mockSetBoardSearchTerm).toHaveBeenCalledWith("");
    expect(mockHandleApplyFilters).toHaveBeenCalled();
  });

  it("muestra mensaje cuando no hay boards", async () => {
    await setup([]);
    const input = screen.getByPlaceholderText("Select board...");
    fireEvent.focus(input);
    expect(await screen.findByText("No boards found")).toBeInTheDocument();
  });

  it("actualiza el término de búsqueda cuando el usuario escribe", async () => {
    await setup();
    const input = screen.getByPlaceholderText("Select board...");
    fireEvent.change(input, { target: { value: "Test" } });
    expect(mockSetBoardSearchTerm).toHaveBeenCalledWith("Test");
  });

  it("cierra el dropdown al hacer clic fuera", async () => {
    await setup([{ id: "1", title: "Board A", description: "" }]);
    const input = screen.getByPlaceholderText("Select board...");
    fireEvent.focus(input);

    expect(await screen.findByText("Board A")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    await waitFor(() => {
      expect(screen.queryByText("Board A")).not.toBeInTheDocument();
    });
  });
});
