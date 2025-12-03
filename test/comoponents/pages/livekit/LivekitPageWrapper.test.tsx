import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import LivekitPageWrapper from "../../../../src/comoponents/pages/livekit/LivekitPageWrapper";

const mockLivekitPage = vi.fn((props: any) => <div data-testid="mock-livekit-page" />);
vi.mock("../../../../src/comoponents/pages/livekit/LivekitPage", () => ({
  default: (props: any) => {
    mockLivekitPage(props);
    return <div data-testid="mock-livekit-page" />;
  },
}));

describe("LivekitPageWrapper", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza mensaje de error cuando faltan room o token", () => {
    render(
      <MemoryRouter initialEntries={["/livekit"]}>
        <Routes>
          <Route path="/livekit" element={<LivekitPageWrapper />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Token o room inválido")).toBeInTheDocument();
    expect(mockLivekitPage).not.toHaveBeenCalled();
  });

  it("renderiza LivekitPage cuando room y token existen", () => {
    render(
      <MemoryRouter initialEntries={["/livekit/sala123/token123"]}>
        <Routes>
          <Route path="/livekit/:room/:token" element={<LivekitPageWrapper />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("mock-livekit-page")).toBeInTheDocument();

    expect(mockLivekitPage).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "token123",
        url: "ws://localhost:7880",
      })
    );
  });


  it("no renderiza LivekitPage si solo hay uno de los parámetros", () => {
    render(
      <MemoryRouter initialEntries={["/livekit/sala123"]}>
        <Routes>
          <Route path="/livekit/:room" element={<LivekitPageWrapper />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Token o room inválido")).toBeInTheDocument();
    expect(mockLivekitPage).not.toHaveBeenCalled();
  });
});
