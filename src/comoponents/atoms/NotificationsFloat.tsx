import React from "react";
import { apiService } from "../../services/api/ApiService";
import { useNavigate } from "react-router-dom";

const POLL_INTERVAL_MS = 60 * 1000; // 60s

const NotificationsFloat: React.FC = () => {
  const [count, setCount] = React.useState<number>(0);
  const [loading, setLoading] = React.useState<boolean>(false);
  const navigate = useNavigate();

  const fetchPending = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.get<{ events: any[] }>(
        "/v1/calendar/google-events?range=24h"
      );
      const events = data?.events ?? [];
      setCount(Array.isArray(events) ? events.length : 0);
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

  return (
    <button
      onClick={() => navigate("/calendar")}
      title={count > 0 ? `${count} reuniones en las próximas 24 horas` : "No hay reuniones próximas"}
      className="fixed right-6 bottom-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-limeyellow-500 text-dark-900 shadow-lg hover:scale-105 transform transition"
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
  );
};

export default NotificationsFloat;
