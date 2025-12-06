import React, { useEffect, useState } from "react";
import { apiService } from "../../../services/api/ApiService";
import { format } from "date-fns";

type EventItem = {
  id?: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

const CalendarSidebar: React.FC = () => {
  const [range, setRange] = useState<"24h" | "7d">("24h");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async (r: "24h" | "7d") => {
    try {
      setLoading(true);
      setError(null);
      const q = `?range=${r}`;
      const data = await apiService.get<{ events: EventItem[] }>(
        `/v1/calendar/google-events${q}`
      );
      setEvents(data.events ?? []);
    } catch (err) {
      console.error("Error fetching calendar events:", err);
      setError("No se pudieron cargar las reuniones");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents(range);
  }, [range]);

  // Refresh when other parts of the app dispatch a calendar update
  React.useEffect(() => {
    const onCalendarUpdated = () => {
      try {
        fetchEvents(range);
      } catch (e) {
        console.warn('CalendarSidebar: failed to refresh on calendar:updated', e);
      }
    };

    window.addEventListener('calendar:updated', onCalendarUpdated as EventListener);
    return () => window.removeEventListener('calendar:updated', onCalendarUpdated as EventListener);
  }, [range]);

  const renderDate = (ev: EventItem) => {
    const dt = ev.start?.dateTime ?? ev.start?.date;
    if (!dt) return "-";
    try {
      const d = new Date(dt);
      return format(d, "Pp");
    } catch {
      return dt;
    }
  };

  return (
    <div className="flex flex-col rounded-md m-1 p-2 h-full max-h-screen">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold">Filtros</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setRange("24h")}
            className={`px-2 py-1 text-xs rounded ${range === "24h" ? "bg-limeyellow-500 text-black" : "bg-dark-700 text-text-secondary"}`}
          >
            24 horas
          </button>
          <button
            onClick={() => setRange("7d")}
            className={`px-2 py-1 text-xs rounded ${range === "7d" ? "bg-limeyellow-500 text-black" : "bg-dark-700 text-text-secondary"}`}
          >
            7 días
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-1">
        {loading && <p className="text-sm text-text-secondary">Cargando reuniones...</p>}
        {!loading && events.length === 0 && (
          <p className="text-sm text-text-secondary">No hay reuniones en este rango.</p>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <ul className="flex flex-col gap-2">
          {events.map((ev, idx) => (
            <li
              key={ev.id ?? idx}
              className="p-2 rounded-md bg-dark-700 border border-dark-600"
            >
              <div className="text-sm font-medium text-text-primary">
                {ev.summary ?? "(Sin título)"}
              </div>
              <div className="text-xs text-text-secondary">{renderDate(ev)}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CalendarSidebar;
