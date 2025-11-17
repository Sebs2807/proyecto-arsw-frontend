import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import * as dateFns from "date-fns";

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

  afterAll(() => {
    vi.useRealTimers();
  });

  it("renderiza correctamente los encabezados de la semana", () => {
    render(<WeeklyCalendar />);

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    days.forEach((day) => {
      expect(screen.getByText(new RegExp(day, "i"))).toBeInTheDocument();
    });

    expect(screen.getByText(/Semana del/i)).toBeInTheDocument();
  });

  it("muestra los eventos correspondientes a la semana actual", async () => {
    render(<WeeklyCalendar />);

    await waitFor(() => {
      expect(screen.getByText("Reunión de equipo")).toBeInTheDocument();
      expect(screen.getByText("Llamada cliente")).toBeInTheDocument();
      expect(screen.getByText("Planificación semanal")).toBeInTheDocument();
      expect(screen.getByText("Code Review")).toBeInTheDocument();
      expect(screen.getByText("Presentación al cliente")).toBeInTheDocument();
    });

    expect(screen.queryByText("Reunión planificación Q4")).not.toBeInTheDocument();
  });

it("permite navegar a la semana siguiente y muestra los eventos correctos", async () => {
  render(<WeeklyCalendar />);

  const nextButton = screen.getByRole("button", { name: /Semana siguiente/i });

  fireEvent.click(nextButton);
  fireEvent.click(nextButton);

  await waitFor(() => {
    expect(screen.getByText(/Semana del/i)).toHaveTextContent("02 Nov");
  });

  await waitFor(() => {
    expect(screen.getByText("Reunión planificación Q4")).toBeInTheDocument();
  });
});


  it("permite volver a la semana anterior", async () => {
    render(<WeeklyCalendar />);

    const prevButton = screen.getByRole("button", { name: /Semana anterior/i });
    fireEvent.click(prevButton);

    await waitFor(() => {
      const header = screen.getByText(/Semana del/i);
      expect(header).toHaveTextContent("12 Oct");
    });
  });

  it("muestra correctamente las horas del calendario (7am - 6pm)", () => {
    render(<WeeklyCalendar />);

    const hours = [
      "7 AM", "8 AM", "9 AM", "10 AM", "11 AM",
      "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM",
    ];

    hours.forEach((hour) => {
      expect(screen.getByText(hour)).toBeInTheDocument();
    });
  });
});
