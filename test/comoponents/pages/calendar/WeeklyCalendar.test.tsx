import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import WeeklyCalendar from "../../../../src/comoponents/pages/calendar/Calendar";
import { vi } from "vitest";
import * as dateFns from "date-fns";

describe("WeeklyCalendar Component", () => {
  beforeAll(() => {
    vi.setSystemTime(new Date("2025-10-19T09:00:00"));
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
