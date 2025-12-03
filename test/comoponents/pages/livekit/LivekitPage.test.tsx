import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import { Track } from "livekit-client";
import LivekitPage from "../../../../src/comoponents/pages/livekit/LivekitPage";

const mockLiveKitRoom = vi.fn();
const mockGridLayout = vi.fn();
const mockParticipantTile = vi.fn();
const mockControlBar = vi.fn();
const mockRoomAudioRenderer = vi.fn();
const mockUseTracks = vi.fn(() => []);
const mockUseRoomContext = vi.fn(() => ({ disconnect: vi.fn() }));

vi.mock("@livekit/components-react", () => ({
  LiveKitRoom: (props: any) => {
    mockLiveKitRoom(props);
    const { children, onError } = props;
    return (
      <div data-testid="mock-livekit-room">
        <button onClick={() => onError(new Error("mock error"))}>
          TriggerError
        </button>
        {children}
      </div>
    );
  },
  GridLayout: ({ tracks, children }: any) => {
    mockGridLayout(tracks);
    return (
      <div data-testid="mock-grid-layout">
        <span data-testid="tracks-count">{tracks?.length ?? 0}</span>
        {children}
      </div>
    );
  },
  ParticipantTile: (props: any) => {
    mockParticipantTile(props);
    return <div data-testid="mock-participant-tile" />;
  },
  ControlBar: (props: any) => {
    mockControlBar(props);
    return <div data-testid="mock-control-bar" />;
  },
  RoomAudioRenderer: () => {
    mockRoomAudioRenderer();
    return <div data-testid="mock-audio-renderer" />;
  },
  useTracks: (...args: any[]) => mockUseTracks(...args),
  useRoomContext: () => mockUseRoomContext(),
}));

vi.mock("../../../../src/services/api/ApiService", () => ({
  apiService: {
    socket: { emit: vi.fn(), on: vi.fn(), off: vi.fn(), connected: false },
    initSocket: vi.fn(),
    disconnectSocket: vi.fn(),
  },
}));

const mockStore = {
  getState: () => ({ auth: { user: { email: "test@example.com" } } }),
  subscribe: () => () => {},
  dispatch: vi.fn(),
};

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <Provider store={mockStore as any}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>
  );

describe("LivekitPage", () => {
  const mockToken = "fake-token";
  const mockUrl = "wss://test.livekit.io";
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy.mockClear();
    mockUseTracks.mockReturnValue([]);
  });

  it("renderiza el contenedor principal con clases de Tailwind", () => {
    const { container } = renderWithProviders(
      <LivekitPage token={mockToken} url={mockUrl} />
    );

    const mainDiv = container.querySelector(".min-h-screen.bg-dark-900");
    expect(mainDiv).toBeInTheDocument();
  });

  it("renderiza LiveKitRoom y el layout personalizado", () => {
    renderWithProviders(<LivekitPage token={mockToken} url={mockUrl} />);

    expect(screen.getByTestId("mock-livekit-room")).toBeInTheDocument();
    expect(screen.getByTestId("mock-grid-layout")).toBeInTheDocument();
    expect(screen.getByTestId("mock-control-bar")).toBeInTheDocument();
    expect(screen.getByTestId("mock-audio-renderer")).toBeInTheDocument();
    expect(screen.getByTestId("mock-participant-tile")).toBeInTheDocument();
  });

  it("pasa correctamente las props a LiveKitRoom", () => {
    renderWithProviders(<LivekitPage token={mockToken} url={mockUrl} />);

    expect(mockLiveKitRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        token: mockToken,
        serverUrl: mockUrl,
        connect: true,
        onDisconnected: expect.any(Function),
        onError: expect.any(Function),
      })
    );
  });

  it("solicita tracks con placeholder para la cámara", () => {
    renderWithProviders(<LivekitPage token={mockToken} url={mockUrl} />);

    expect(mockUseTracks).toHaveBeenCalledWith([
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ]);
  });

  it("llama a console.error si LiveKit lanza un error", () => {
    renderWithProviders(<LivekitPage token={mockToken} url={mockUrl} />);

    const trigger = screen.getByText("TriggerError");
    trigger.click();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "LiveKit error:",
      expect.any(Error)
    );
  });
});
