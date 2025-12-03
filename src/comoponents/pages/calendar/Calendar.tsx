import React from "react";
import {
  startOfWeek,
  addDays,
  format,
  setHours,
  setMinutes,
} from "date-fns";
import { apiService } from "../../../services/api/ApiService";

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
  const cacheRef = React.useRef<Record<string, CalendarEvent[]>>({});

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 7);
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const fetchEventsForWeek = async (start: Date, end: Date): Promise<CalendarEvent[]> => {
    try {
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      });
      const relativeUrl = `/v1/calendar/google-events?${params.toString()}`;

      const data = await apiService.get<any>(relativeUrl);
      const apiEvents: any[] = data?.events || data?.items || data || [];

      const parseDate = (d: any): Date | null => {
        if (!d) return null;
        if (typeof d === "string") {
          const dt = new Date(d);
          return Number.isNaN(dt.getTime()) ? null : dt;
        }
        if (d.dateTime) {
          const dt = new Date(d.dateTime);
          return Number.isNaN(dt.getTime()) ? null : dt;
        }
        if (d.date) {
          const dt = new Date(d.date);
          return Number.isNaN(dt.getTime()) ? null : dt;
        }
        return null;
      };

      const mapped: CalendarEvent[] = (apiEvents || [])
        .map((ev: any, idx: number) => {
          const id = ev.id || ev.eventId || `evt-${idx}`;
          const title = ev.summary || ev.title || ev.name || "Sin título";

          const start = parseDate(
            ev.start || ev.startDate || ev.start_time || ev.startDateTime
          );
          const end =
            parseDate(
              ev.end || ev.endDate || ev.end_time || ev.endDateTime
            ) ||
            (start
              ? new Date(start.getTime() + 60 * 60 * 1000)
              : null);

          const color =
            ev.color || (ev.colorId ? `color-${ev.colorId}` : undefined);

          if (!start || !end) return null;

          return { id, title, start, end, color };
        })
        .filter(Boolean) as CalendarEvent[];

      return mapped;
    } catch (error) {
      console.error("Error fetching weekly events:", error);
      return [];
    }
  };

  const getWeekKey = (d: Date) => startOfWeek(d, { weekStartsOn: 0 }).toISOString();

  const prefetchWeek = async (weekStartDate: Date) => {
    const key = getWeekKey(weekStartDate);
    if (cacheRef.current[key]) return;
    const start = startOfWeek(weekStartDate, { weekStartsOn: 0 });
    const end = addDays(start, 7);
    try {
      const mapped = await fetchEventsForWeek(start, end);
      cacheRef.current[key] = mapped;
    } catch (err) {
      console.warn("Prefetch failed for", key, err);
    }
  };

  const loadWeek = async (anyDateInWeek: Date) => {
    const weekStart = startOfWeek(anyDateInWeek, { weekStartsOn: 0 });
    const key = weekStart.toISOString();

    if (cacheRef.current[key]) {
      setEvents(cacheRef.current[key]);
      prefetchWeek(addDays(weekStart, -7));
      prefetchWeek(addDays(weekStart, 7));
      return;
    }

    const start = weekStart;
    const end = addDays(start, 7);
    const mapped = await fetchEventsForWeek(start, end);
    cacheRef.current[key] = mapped;
    setEvents(mapped);

    prefetchWeek(addDays(start, -7));
    prefetchWeek(addDays(start, 7));
  };

  React.useEffect(() => {
    loadWeek(currentWeek);
  }, [currentWeek]);

  const goToPreviousWeek = () => setCurrentWeek((prev) => addDays(prev, -7));
  const goToNextWeek = () => setCurrentWeek((prev) => addDays(prev, 7));

  const eventsForWeek = events.filter(
    (e) => e.start < weekEnd && e.end > weekStart
  );

  const minHour =
    eventsForWeek.length > 0
      ? Math.max(0, Math.min(...eventsForWeek.map((e) => e.start.getHours())))
      : 0;

  const maxHour =
    eventsForWeek.length > 0
      ? Math.min(23, Math.max(...eventsForWeek.map((e) => e.end.getHours())))
      : 23;

  const visibleHours = Array.from(
    { length: maxHour - minHour + 1 },
    (_, i) => i + minHour
  );

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
        <div className="bg-dark-800 border-r border-dark-600 p-2 text-text-muted text-center font-semibold">
          Hora
        </div>
        {daysOfWeek.map((day) => (
          <div
            key={day.toISOString()} 
            className="bg-dark-800 border-r border-dark-600 p-2 text-center font-semibold text-text-muted"
          >
            {format(day, "EEE dd")}
          </div>
        ))}

        {visibleHours.map((hour) => (
          <React.Fragment key={hour}>
            <div className="bg-dark-900 border-r border-t border-dark-600 text-text-muted p-2 text-right pr-4">
              {format(setHours(new Date(), hour), "h a")}
            </div>

            {daysOfWeek.map((day, i) => {
              const slotStart = setMinutes(setHours(day, hour), 0);
              const slotEnd = setMinutes(setHours(day, hour + 1), 0);

              const eventsInSlot = eventsForWeek.filter(
                (e) => e.start < slotEnd && e.end > slotStart
              );

              return (
                <div
                  key={`${i}-${hour}`}
                  className="relative border-r border-t border-dark-700 h-16 bg-dark-800 hover:bg-dark-700 transition"
                >
                  {eventsInSlot.length > 0 && (
                    <div className="absolute inset-1 flex flex-col gap-1 overflow-auto max-h-full">
                      {eventsInSlot.map((ev) => (
                        <div
                          key={ev.id}
                          className={`text-xs font-medium rounded px-1 py-0.5 shadow-md truncate text-dark-900 ${
                            ev.color || "bg-limeyellow-400"
                          }`}
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      ))}
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
