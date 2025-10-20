import React from "react";
import {
  startOfWeek,
  addDays,
  format,
  setHours,
  setMinutes,
  isSameDay,
} from "date-fns";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color?: string;
}

const WeeklyCalendar: React.FC = () => {
  const [currentWeek, setCurrentWeek] = React.useState<Date>(new Date());
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 }); // Domingo
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7am - 6pm

  React.useEffect(() => {
    // Fechas absolutas hardcodeadas:
    const mockEvents: CalendarEvent[] = [
      {
        id: "1",
        title: "Reunión de equipo",
        start: new Date("2025-10-19T09:00:00"), // Domingo 19 Oct 2025, 9am
        end: new Date("2025-10-19T10:00:00"),
        color: "bg-limeyellow-400",
      },
      {
        id: "2",
        title: "Llamada cliente",
        start: new Date("2025-10-21T14:00:00"), // Martes 21 Oct 2025, 2pm
        end: new Date("2025-10-21T15:00:00"),
        color: "bg-indigo-400",
      },
      {
        id: "3",
        title: "Planificación semanal",
        start: new Date("2025-10-20T10:00:00"), // Lunes 20 Oct 2025, 10am
        end: new Date("2025-10-20T11:00:00"),
        color: "bg-rose-400",
      },
      {
        id: "4",
        title: "Code Review",
        start: new Date("2025-10-23T16:00:00"), // Jueves 23 Oct 2025, 4pm
        end: new Date("2025-10-23T17:00:00"),
        color: "bg-cyan-400",
      },
      {
        id: "5",
        title: "Presentación al cliente",
        start: new Date("2025-10-24T11:00:00"), // Viernes 24 Oct 2025, 11am
        end: new Date("2025-10-24T12:00:00"),
        color: "bg-yellow-400",
      },
      {
        id: "6",
        title: "Reunión planificación Q4",
        start: new Date("2025-11-02T09:00:00"), // Domingo 2 Nov 2025, 9am (otra semana)
        end: new Date("2025-11-02T10:00:00"),
        color: "bg-purple-400",
      },
    ];

    setEvents(mockEvents);
  }, []);

  const goToPreviousWeek = () => {
    setCurrentWeek((prev) => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeek((prev) => addDays(prev, 7));
  };

  return (
    <div className="bg-dark-900 min-h-screen p-6 text-text-primary font-poppins">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={goToPreviousWeek}
          className="px-3 py-1 bg-dark-700 rounded hover:bg-dark-600"
        >
          ← Semana anterior
        </button>
        <h2 className="text-xl font-semibold text-text-secondary">
          Semana del {format(weekStart, "dd MMM yyyy")}
        </h2>
        <button
          onClick={goToNextWeek}
          className="px-3 py-1 bg-dark-700 rounded hover:bg-dark-600"
        >
          Semana siguiente →
        </button>
      </div>

      <div className="grid grid-cols-[80px_repeat(7,1fr)] border-t border-l border-dark-600 text-sm max-h-[600px] overflow-y-auto scrollbar-hide">
        {/* Encabezado */}
        <div className="bg-dark-800 border-r border-dark-600 p-2 text-text-muted text-center font-semibold">
          Hora
        </div>
        {daysOfWeek.map((day, i) => (
          <div
            key={i}
            className="bg-dark-800 border-r border-dark-600 p-2 text-center font-semibold text-text-muted"
          >
            {format(day, "EEE dd")}
          </div>
        ))}

        {/* Celdas */}
        {hours.map((hour) => (
          <React.Fragment key={hour}>
            {/* Columna hora */}
            <div className="bg-dark-900 border-r border-t border-dark-600 text-text-muted p-2 text-right pr-4">
              {format(setHours(new Date(), hour), "h a")}
            </div>

            {/* Celdas por día */}
            {daysOfWeek.map((day, i) => {
              const event = events.find(
                (e) =>
                  isSameDay(e.start, day) && e.start.getHours() === hour
              );

              return (
                <div
                  key={`${i}-${hour}`}
                  className="relative border-r border-t border-dark-700 h-16 bg-dark-800 hover:bg-dark-700 transition"
                >
                {event && (
                  <div
                    className={`absolute inset-1 text-sm font-medium rounded p-1 shadow-md text-dark-900 ${event.color || "bg-limeyellow-400"}`}
                  >
                    {event.title}
                  </div>
                )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default WeeklyCalendar;