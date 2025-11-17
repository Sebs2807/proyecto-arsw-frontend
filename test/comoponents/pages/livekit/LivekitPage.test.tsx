import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import LivekitPage from "../../../../src/comoponents/pages/livekit/LivekitPage";

const mockLiveKitRoom = vi.fn();
const mockVideoConference = vi.fn();

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
  VideoConference: () => {
    mockVideoConference();
    return <div data-testid="mock-video-conference" />;
  },
}));

describe("LivekitPage", () => {
  const mockToken = "fake-token";
  const mockUrl = "wss://test.livekit.io";
  const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza el contenedor principal con clases de Tailwind", () => {
    const { container } = render(<LivekitPage token={mockToken} url={mockUrl} />);
    const mainDiv = container.querySelector(".w-screen.h-screen.bg-dark-900");
    expect(mainDiv).toBeInTheDocument();
  });

  it("renderiza LiveKitRoom y VideoConference", () => {
    render(<LivekitPage token={mockToken} url={mockUrl} />);

    expect(screen.getByTestId("mock-livekit-room")).toBeInTheDocument();
    expect(screen.getByTestId("mock-video-conference")).toBeInTheDocument();
  });

  it("pasa correctamente las props a LiveKitRoom", () => {
    render(<LivekitPage token={mockToken} url={mockUrl} />);

    expect(mockLiveKitRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        token: mockToken,
        serverUrl: mockUrl,
        connect: true,
        onError: expect.any(Function),
      })
    );
  });

  it("llama a console.error si LiveKit lanza un error", () => {
    render(<LivekitPage token={mockToken} url={mockUrl} />);

    const trigger = screen.getByText("TriggerError");
    trigger.click();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "LiveKit error:",
      expect.any(Error)
    );
  });
});
