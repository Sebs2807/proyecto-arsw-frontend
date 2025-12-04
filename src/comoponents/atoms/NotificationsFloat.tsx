import React from "react";
import { apiService } from "../../services/api/ApiService";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

const POLL_INTERVAL_MS = 60 * 1000; // 60s

const NotificationsFloat: React.FC = () => {
  const [events, setEvents] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [open, setOpen] = React.useState<boolean>(false);
  const navigate = useNavigate();

  const fetchPending = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.get<{ events: any[] }>(
        "/v1/calendar/google-events?range=24h"
      );
      const list = data?.events ?? [];
      setEvents(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn("NotificationsFloat: failed to fetch events", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPending();
    const id = setInterval(fetchPending, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchPending]);

  // Listen for global updates (other parts of the app can dispatch 'calendar:updated')
  React.useEffect(() => {
    const onUpdate = () => fetchPending();
    window.addEventListener("calendar:updated", onUpdate as EventListener);
    return () => window.removeEventListener("calendar:updated", onUpdate as EventListener);
  }, [fetchPending]);

  // Close on outside click
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open) return;
      if (!rootRef.current) return;
      if (e.target && rootRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const count = events.length;

  return (
    <div ref={rootRef} className="fixed right-6 bottom-6 z-50">
      <button
        onClick={() => setOpen((s) => !s)}
        aria-expanded={open}
        title={count > 0 ? `${count} reuniones en las próximas 24 horas` : "No hay reuniones próximas"}
        className="flex items-center justify-center w-14 h-14 rounded-full bg-limeyellow-500 text-dark-900 shadow-lg hover:scale-105 transform transition"
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.158c0 .538-.214 1.055-.595 1.437L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>

          {count > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full">
              {count}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="mt-3 w-80 max-h-96 overflow-auto bg-dark-800 border border-dark-600 rounded-lg shadow-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-text-primary">Próximas reuniones</h4>
            <button onClick={() => setOpen(false)} className="text-sm text-text-secondary">Cerrar</button>
          </div>

          {loading && <p className="text-sm text-text-secondary">Cargando...</p>}

          {!loading && events.length === 0 && (
            <p className="text-sm text-text-secondary">No hay reuniones en las próximas 24 horas.</p>
          )}

          <ul className="flex flex-col gap-2">
            {events.map((ev: any) => {
              const start = ev.start?.dateTime ?? ev.start?.date ?? ev.start;
              let label = String(start || "");
              try {
                label = format(new Date(label), "Pp");
              } catch {}

              return (
                <li key={ev.id}>
                  <button
                    onClick={() => {
                      setOpen(false);
                      navigate('/calendar');
                    }}
                    className="w-full text-left p-2 rounded hover:bg-dark-700"
                  >
                    <div className="text-sm font-medium text-text-primary truncate">{ev.summary ?? ev.title ?? '(Sin título)'}</div>
                    <div className="text-xs text-text-secondary">{label}</div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex justify-end">
            <button onClick={() => { setOpen(false); navigate('/calendar'); }} className="px-3 py-1 rounded bg-dark-700 text-sm">Ver calendario</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsFloat;
