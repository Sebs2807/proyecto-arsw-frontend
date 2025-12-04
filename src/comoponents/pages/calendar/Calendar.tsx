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

import ModalBase from "../../atoms/ModalBase";

const WeeklyCalendar: React.FC = () => {
  const [currentWeek, setCurrentWeek] = React.useState<Date>(new Date());
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [newStartLocal, setNewStartLocal] = React.useState<string>("");
  const [newEndLocal, setNewEndLocal] = React.useState<string>("");
  const [newTitle, setNewTitle] = React.useState<string>("");
  const cacheRef = React.useRef<Record<string, CalendarEvent[]>>({});
  // Local overrides for fields the backend may not accept/update (e.g. title)
  const editsRef = React.useRef<Record<string, Partial<CalendarEvent>>>({});

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
          return isNaN(dt.getTime()) ? null : dt;
        }
        if (d.dateTime) {
          const dt = new Date(d.dateTime);
          return isNaN(dt.getTime()) ? null : dt;
        }
        if (d.date) {
          const dt = new Date(d.date);
          return isNaN(dt.getTime()) ? null : dt;
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
  
 const invalidateWeekCache = (d: Date) => {
   try {
     const key = getWeekKey(d);
     if (cacheRef.current[key]) delete cacheRef.current[key];
   } catch (e) {
     console.warn('Failed to invalidate week cache', e);
   }
 };

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

  const toDatetimeLocalValue = (d: Date) => {
    const tzOffset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - tzOffset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const handleEventClick = (ev: CalendarEvent) => {
    setSelectedEvent(ev);
    setNewStartLocal(toDatetimeLocalValue(ev.start));
    setNewEndLocal(toDatetimeLocalValue(ev.end));
    setNewTitle(ev.title || "");
    // description removed from UI
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    setActionLoading(true);
    try {
      console.log("Deleting event id:", selectedEvent.id);
      const deletedId = selectedEvent.id;
      // Use apiService (axios) so baseURL and withCredentials are respected
      const result = await apiService.delete(`/v1/calendar/google-events/${deletedId}`);
      console.log("Delete result:", result);

      // Resultado esperado del backend: { ok: true } o similar
      setModalOpen(false);
      setSelectedEvent(null);

      // Update local state immediately so UI reflects deletion without waiting
      setEvents((prev) => prev.filter((e) => e.id !== deletedId));

      // Remove any local overrides for the deleted event
      try { delete editsRef.current[deletedId]; } catch (e) {}

      // Invalidate cache for the current week so loadWeek will refetch
      invalidateWeekCache(currentWeek);
      await loadWeek(currentWeek);
      try {
        window.dispatchEvent(new CustomEvent('calendar:updated'));
      } catch (e) {}
    } catch (err) {
      console.error("Error deleting event:", err);
      // Mostrar mensaje más descriptivo
      // Si es un error de autorización probablemente sea 401/403: informar al usuario
      if ((err as any)?.response?.status === 401) {
        alert("No autorizado. Por favor inicia sesión de nuevo.");
      } else if ((err as any)?.response?.status === 403) {
        alert("Acceso denegado para eliminar este evento.");
      } else {
        alert("No se pudo eliminar el evento. Revisa la consola para más detalles.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedEvent) return;
    if (!newStartLocal || !newEndLocal) {
      alert("Por favor selecciona fecha y hora de inicio y fin");
      return;
    }

    setActionLoading(true);
    try {
      const isoStart = new Date(newStartLocal).toISOString();
      const isoEnd = new Date(newEndLocal).toISOString();

      // The backend RescheduleEventDto expects top-level startDateTime/endDateTime
      const payload: any = {
        startDateTime: isoStart,
        endDateTime: isoEnd,
      };

      // Note: the current backend controller shown only uses these fields
      // to reschedule. If you need to update title/description, the
      // backend must accept those fields (or provide a separate endpoint).
      await apiService.patch(`/v1/calendar/google-events/${selectedEvent.id}`, payload);
      // Optimistically update local event so UI updates immediately
      const updatedId = selectedEvent.id;
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === updatedId
            ? { ...ev, start: new Date(isoStart), end: new Date(isoEnd), title: newTitle || ev.title }
            : ev
        )
      );

      // If the user changed the title locally, keep it as an override
      try {
        if (newTitle && newTitle.trim() && newTitle !== selectedEvent.title) {
          editsRef.current[updatedId] = { title: newTitle };
        }
      } catch (e) {}

      setModalOpen(false);
      setSelectedEvent(null);
      // Invalidate cache for the current week so loadWeek will refetch updated data
      invalidateWeekCache(currentWeek);
      await loadWeek(currentWeek);
      try {
        window.dispatchEvent(new CustomEvent('calendar:updated'));
      } catch (e) {}
    } catch (err) {
      console.error("Error rescheduling event:", err);
      alert("No se pudo reagendar el evento");
    } finally {
      setActionLoading(false);
    }
  };

  const loadWeek = async (anyDateInWeek: Date) => {
    const weekStart = startOfWeek(anyDateInWeek, { weekStartsOn: 0 });
    const key = weekStart.toISOString();

    if (cacheRef.current[key]) {
      // Apply any local overrides to cached events
      const cached = cacheRef.current[key];
      const mergedCached = cached.map((ev) => {
        const o = editsRef.current[ev.id];
        return o ? { ...ev, ...o } : ev;
      });
      setEvents(mergedCached);
      prefetchWeek(addDays(weekStart, -7));
      prefetchWeek(addDays(weekStart, 7));
      return;
    }

    const start = weekStart;
    const end = addDays(start, 7);
    const mapped = await fetchEventsForWeek(start, end);
    cacheRef.current[key] = mapped;
    // Apply any local overrides stored for events
    const merged = mapped.map((ev) => {
      const o = editsRef.current[ev.id];
      return o ? { ...ev, ...o } : ev;
    });
    setEvents(merged);

    prefetchWeek(addDays(start, -7));
    prefetchWeek(addDays(start, 7));
  };

  React.useEffect(() => {
    loadWeek(currentWeek);
  }, [currentWeek]);

  // Listen for global calendar updates (created/edited/deleted elsewhere)
  React.useEffect(() => {
    const onCalendarUpdated = () => {
      try {
        loadWeek(currentWeek);
      } catch (e) {
        console.warn('calendar:updated handler failed', e);
      }
    };

    window.addEventListener('calendar:updated', onCalendarUpdated as EventListener);
    return () => window.removeEventListener('calendar:updated', onCalendarUpdated as EventListener);
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
        {daysOfWeek.map((day, i) => (
          <div
            key={i}
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
                        <button
                          key={ev.id}
                          onClick={() => handleEventClick(ev)}
                          className={`text-xs text-left w-full font-medium rounded px-1 py-0.5 shadow-md truncate text-dark-900 ${
                            ev.color || "bg-limeyellow-400"
                          }`}
                          title={ev.title}
                        >
                          {ev.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* Modal para acciones sobre el evento (eliminar / reagendar) */}
      <ModalBase
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedEvent(null);
        }}
        title={selectedEvent ? selectedEvent.title : "Acciones"}
      >
        {!selectedEvent && <p>Sin evento seleccionado</p>}

        {selectedEvent && (
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm text-text-secondary">Inicio:</p>
              <p className="text-sm">{selectedEvent.start.toString()}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Fin:</p>
              <p className="text-sm">{selectedEvent.end.toString()}</p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-text-secondary">Título</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-dark-800 border border-dark-600 px-2 py-1 rounded text-sm"
              />


              <label className="text-xs text-text-secondary">Nueva fecha/hora inicio</label>
              <input
                type="datetime-local"
                value={newStartLocal}
                onChange={(e) => setNewStartLocal(e.target.value)}
                className="w-full bg-dark-800 border border-dark-600 px-2 py-1 rounded text-sm"
              />

              <label className="text-xs text-text-secondary">Nueva fecha/hora fin</label>
              <input
                type="datetime-local"
                value={newEndLocal}
                onChange={(e) => setNewEndLocal(e.target.value)}
                className="w-full bg-dark-800 border border-dark-600 px-2 py-1 rounded text-sm"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                disabled={actionLoading}
                onClick={async () => await handleReschedule()}
                className="px-3 py-2 bg-dark-700 rounded text-sm hover:bg-dark-600 disabled:opacity-50"
              >
                {actionLoading ? "Guardando..." : "Guardar cambios"}
              </button>

              <button
                disabled={actionLoading}
                onClick={async () => await handleDelete()}
                className="px-3 py-2 bg-red-600 rounded text-sm hover:opacity-90 disabled:opacity-50"
              >
                {actionLoading ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        )}
      </ModalBase>
    </div>
  );
};

export default WeeklyCalendar;
