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

import WeeklyCalendar from "../../../../src/comoponents/pages/calendar/Calendar";

import { apiService } from "../../../../src/services/api/ApiService";

describe("WeeklyCalendar Component", () => {
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
    (apiService.get as any).mockResolvedValueOnce([
      { id: 1, title: "Reunión de equipo", start: "2025-11-03T09:00:00", end: "2025-11-03T10:00:00" },
      { id: 2, title: "Llamada cliente", start: "2025-11-04T11:00:00", end: "2025-11-04T12:00:00" },
    ]);

    render(<WeeklyCalendar />);

    expect(await screen.findByText("Reunión de equipo")).toBeInTheDocument();
    expect(screen.getByText("Llamada cliente")).toBeInTheDocument();
  });

it("permite navegar a la semana siguiente y muestra los eventos correctos", async () => {
  (apiService.get as any).mockImplementation((url: string) => {
    if (typeof url === "string" && (url.includes("2025-11-10") || url.includes("2025-11-09"))) {
      return Promise.resolve([
        {
          id: 3,
          title: "Reunión planificación Q4",
          start: "2025-11-10T09:00:00",
          end: "2025-11-10T10:00:00",
        },
      ]);
    }
    return Promise.resolve([]);
  });

  render(<WeeklyCalendar />);

  const nextButton = await screen.findByText(/Semana siguiente/i);

  fireEvent.click(nextButton);

  await screen.findByText(/09 Nov 2025/i);

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
