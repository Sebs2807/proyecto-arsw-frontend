import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import WeeklyCalendar from "../../../../src/comoponents/pages/calendar/Calendar";
import { apiService } from "../../../../src/services/api/ApiService";
import React from "react";

vi.mock("../../../../src/services/api/ApiService", () => ({
  apiService: {
    get: vi.fn(),
  },
}));

beforeAll(() => {
  vi.setSystemTime(new Date("2025-10-19T09:00:00"));
  // Mock api responses for the calendar weeks used in tests
  (apiService.get as any).mockImplementation((url: string) => {
    if (url.includes("2025-10-19")) {
      return Promise.resolve({
        items: [
          {
            id: "1",
            summary: "Reunión de equipo",
            start: { dateTime: "2025-10-20T09:00:00.000Z" },
            end: { dateTime: "2025-10-20T10:00:00.000Z" },
          },
          {
            id: "2",
            summary: "Llamada cliente",
            start: { dateTime: "2025-10-21T11:00:00.000Z" },
            end: { dateTime: "2025-10-21T12:00:00.000Z" },
          },
          {
            id: "3",
            summary: "Planificación semanal",
            start: { dateTime: "2025-10-22T14:00:00.000Z" },
            end: { dateTime: "2025-10-22T15:00:00.000Z" },
          },
          {
            id: "4",
            summary: "Code Review",
            start: { dateTime: "2025-10-23T10:00:00.000Z" },
            end: { dateTime: "2025-10-23T11:00:00.000Z" },
          },
          {
            id: "5",
            summary: "Presentación al cliente",
            start: { dateTime: "2025-10-24T16:00:00.000Z" },
            end: { dateTime: "2025-10-24T17:00:00.000Z" },
          },
        ],
      });
    }

    if (url.includes("2025-11-02")) {
      return Promise.resolve({
        items: [
          {
            id: "6",
            summary: "Reunión planificación Q4",
            start: { dateTime: "2025-11-04T09:00:00.000Z" },
            end: { dateTime: "2025-11-04T10:00:00.000Z" },
          },
        ],
      });
    }

    return Promise.resolve({ items: [] });
  });
});

describe("WeeklyCalendar Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza correctamente los encabezados de la semana", async () => {
    (apiService.get as any).mockResolvedValueOnce([]);
    render(<WeeklyCalendar />);

    expect(await screen.findByText(/Semana del/i)).toBeInTheDocument();

    expect(screen.getByText(/Sun/i)).toBeInTheDocument();
    expect(screen.getByText(/Mon/i)).toBeInTheDocument();
    expect(screen.getByText(/Tue/i)).toBeInTheDocument();
  });

  it("muestra los eventos correspondientes a la semana actual", async () => {
    // Use the default mocked responses from the top-level beforeAll
    render(<WeeklyCalendar />);

    expect(await screen.findByText("Reunión de equipo")).toBeInTheDocument();
    expect(screen.getByText("Llamada cliente")).toBeInTheDocument();
  });

it("permite navegar a la semana siguiente y muestra los eventos correctos", async () => {
  // Render and navigate forward until the target week appears
  render(<WeeklyCalendar />);

  const nextButton = await screen.findByText(/Semana siguiente/i);

  // advance 2 weeks to reach the Nov 2, 2025 week from Oct 19, 2025
  fireEvent.click(nextButton);
  fireEvent.click(nextButton);

  await screen.findByText(/02 Nov 2025/i);

  await waitFor(() => {
    const eventNode = screen.queryByText(/Reunión planificación Q4/i);
    expect(eventNode).toBeInTheDocument();
  });
});

  it("permite volver a la semana anterior", async () => {
    (apiService.get as any).mockResolvedValueOnce([]);
    render(<WeeklyCalendar />);

    const prevButton = await screen.findByText(/Semana anterior/i);
    expect(prevButton).toBeInTheDocument();
    fireEvent.click(prevButton);

    await waitFor(() => {
      expect(screen.getByText(/Semana del/i)).toBeInTheDocument();
    });
  });

  it("muestra correctamente las horas del calendario (7am - 6pm)", async () => {
    (apiService.get as any).mockResolvedValueOnce([]);
    render(<WeeklyCalendar />);

    await waitFor(() => {
      expect(screen.getByText(/7 AM/i)).toBeInTheDocument();
      expect(screen.getByText(/6 PM/i)).toBeInTheDocument();
    });
  });
});
