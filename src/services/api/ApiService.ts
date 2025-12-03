import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { io, Socket } from "socket.io-client";

// ──────────────────────────────────────────────
// Interfaces de Datos (Para ser autónomo)
// ──────────────────────────────────────────────

export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string; // Incluida para coincidir con la interfaz más completa del Board
  listId: string;
  // Campos adicionales del Board, si son necesarios para tipado, aunque no se usen en este servicio
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  industry?: string;
  priority?: "low" | "medium" | "high";
  dueDate?: string;
}

export interface List {
  id: string;
  title: string;
  description?: string;
  order: number;
  cards: Task[];
}

// ──────────────────────────────────────────────
// Tipos de callbacks para WebSocket
// ──────────────────────────────────────────────

type ListCreatedCallback = (list: List) => void;
type ListUpdatedCallback = (list: List) => void;
type ListDeletedCallback = (id: string) => void;

type CardCreatedCallback = (listId: string, card: Task) => void;
type CardUpdatedCallback = (listId: string, card: Task) => void;
type CardDeletedCallback = (listId: string, cardId: string) => void;
type CardMovedCallback = (
  sourceListId: string,
  destListId: string,
  card: Task
) => void;

// Drag & drop realtime callbacks
type CardDragStartCallback = (cardId: string, user: string) => void;
type CardDragUpdateCallback = (data: {
  boardId: string;
  cardId: string;
  destListId: string;
  destIndex: number;
  user: string;
}) => void;
type CardDragEndCallback = (data: {
  cardId: string;
  user: string;
  destListId?: string;
  destIndex?: number;
}) => void; // Unificado para dragEnd más limpio.

/**
 * Contenedor de todos los manejadores de eventos WebSocket.
 * Este patrón se prefiere sobre una larga lista de argumentos posicionales.
 */
interface SocketHandlers {
  onListCreated: ListCreatedCallback;
  onListUpdated: ListUpdatedCallback;
  onListDeleted: ListDeletedCallback;
  onCardCreated: CardCreatedCallback;
  onCardUpdated: CardUpdatedCallback;
  onCardDeleted: CardDeletedCallback;
  onCardMoved: CardMovedCallback;
  onCardDragStart?: CardDragStartCallback;
  onCardDragUpdate?: CardDragUpdateCallback;
  onCardDragEnd?: CardDragEndCallback;
  // Opcional: Callbacks para LiveKit (aunque se manejarían mejor en Board.tsx)
  // onCallStarted?: (data: { cardId: string, roomId: string, user: string }) => void;
  // onCallEnded?: (data: { cardId: string }) => void;
}

// ──────────────────────────────────────────────
// Clase principal ApiService
// ──────────────────────────────────────────────

class ApiService {
  private readonly axiosInstance: AxiosInstance;
  public socket: Socket | null = null;

  constructor(baseURL: string) {
    this.axiosInstance = axios.create({
      baseURL,
      withCredentials: true,
    });

    // Interceptor de tokens (renovación automática)
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError & { config?: any }) => {
        const originalRequest = error.config;
        if (
          error.response?.status === 401 &&
          originalRequest &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;
          try {
            // Intenta renovar el token
            await this.axiosInstance.post("/v1/auth/refresh-token");
            // Reintenta la petición original
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            console.error(
              "⚠️ Refresh token inválido o expirado. Redirigiendo o fallando.",
              refreshError
            );
            // Propaga el error de refresh
            throw refreshError;
          }
        }
        // Si no es un 401, o si es la petición de refresh, propaga el error original
        throw error;
      }
    );
  }

  // ──────────────────────────────────────────────
  // Métodos HTTP base (usando Promise<T>)
  // ──────────────────────────────────────────────

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> =
      await this.axiosInstance.get(url, config);
    return response.data.data;
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> =
      await this.axiosInstance.post(url, data, config);
    return response.data.data;
  }

  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> =
      await this.axiosInstance.put(url, data, config);
    return response.data.data;
  }

  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> =
      await this.axiosInstance.patch(url, data, config);
    return response.data.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> =
      await this.axiosInstance.delete(url, config);
    return response.data.data;
  }

  // ──────────────────────────────────────────────
  // WebSocket (Socket.IO)
  // ──────────────────────────────────────────────

  /**
   * Inicializa la conexión WebSocket y configura todos los listeners.
   * Utiliza un patrón de handlers de opciones para mayor claridad.
   * @param boardId ID del tablero al que unirse.
   * @param handlers Objeto con las funciones de callback para cada evento.
   */
  initSocket(boardId: string, handlers: SocketHandlers) {
    const {
      onListCreated,
      onListUpdated,
      onListDeleted,
      onCardCreated,
      onCardUpdated,
      onCardDeleted,
      onCardMoved,
      onCardDragStart,
      onCardDragUpdate,
      onCardDragEnd,
    } = handlers;
    // Evita reconexiones si ya está activo
    if (this.socket?.connected) {
      console.log("🔁 WebSocket ya conectado. Ignorando init.");
      return;
    }

    // Determina la URL base para el socket
    const baseURL =
      this.axiosInstance.defaults.baseURL || globalThis.location.origin;

    this.socket = io(baseURL, {
      transports: ["websocket"],
      secure: baseURL.startsWith("https"),
      rejectUnauthorized: false,
      query: { boardId }, // Envía el boardId en la query
    });

    // ─── Eventos de conexión/desconexión ─────────
    this.socket.on("connect", () => {
      console.log(`🟢 Conectado a WebSocket (board: ${boardId})`);
      this.socket?.emit("joinBoard", boardId); // Únete al canal del tablero
    });

    this.socket.on("disconnect", (reason) =>
      console.log(`🔴 Desconectado (${reason})`)
    );

    this.socket.on("connect_error", (err) =>
      console.error("❌ Error de conexión WS:", err.message)
    );

    // ─── Eventos de listas (Listeners) ───────────
    this.socket.on("list:created", onListCreated);
    this.socket.on("list:updated", onListUpdated);
    this.socket.on("list:deleted", ({ id }) => onListDeleted(id));

    // ─── Eventos de tarjetas (Listeners) ─────────
    this.socket.on("card:created", ({ listId, card }) =>
      onCardCreated(listId, card)
    );
    this.socket.on("card:updated", ({ listId, card }) =>
      onCardUpdated(listId, card)
    );
    this.socket.on("card:deleted", ({ listId, cardId }) =>
      onCardDeleted(listId, cardId)
    );
    this.socket.on("card:moved", ({ sourceListId, destListId, card }) => {
      console.log("📥 Evento 'card:moved' recibido desde servidor.");
      onCardMoved(sourceListId, destListId, card);
    });

    // ─── Eventos de drag en tiempo real (Listeners)
    // Usamos la estructura de los helpers del primer bloque para tipar los callbacks
    this.socket.on("card:dragStart", ({ cardId, user }) => {
      console.log(`✋ ${user} está arrastrando la card ${cardId}`);
      onCardDragStart?.(cardId, user);
    });

    this.socket.on("card:dragUpdate", (data) => {
      onCardDragUpdate?.(data);
    });

    this.socket.on("card:dragEnd", (data) => {
      const { cardId, user } = data;
      console.log(`✅ ${user} soltó la card ${cardId}`);
      // Se pasa el objeto completo para tener acceso a destListId y destIndex
      onCardDragEnd?.(data);
    });

    // Es una buena práctica retornar el socket
    return this.socket;
  }

  // ──────────────────────────────────────────────
  // Emisión de eventos (Helpers)
  // ──────────────────────────────────────────────

  /**
   * Emite un evento WebSocket si el socket está conectado.
   */
  emitSocketEvent(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      console.log(`📤 Emitiendo evento: ${event}`, data);
    } else {
      console.warn(`⚠️ No hay socket conectado para emitir: ${event}`);
    }
  }

  // Helpers específicos para drag realtime
  emitDragStart(boardId: string, cardId: string, user: string) {
    this.emitSocketEvent("card:dragStart", { boardId, cardId, user });
  }

  emitDragUpdate(
    boardId: string,
    cardId: string,
    destListId: string,
    destIndex: number,
    user: string
  ) {
    this.emitSocketEvent("card:dragUpdate", {
      boardId,
      cardId,
      destListId,
      destIndex,
      user,
    });
  }

  emitDragEnd(
    boardId: string,
    cardId: string,
    user: string,
    destListId?: string,
    destIndex?: number
  ) {
    this.emitSocketEvent("card:dragEnd", {
      boardId,
      cardId,
      user,
      destListId,
      destIndex,
    });
  }

  // ──────────────────────────────────────────────
  // Cerrar conexión
  // ──────────────────────────────────────────────

  /**
   * Cierra la conexión WebSocket y limpia los listeners.
   */
  disconnectSocket() {
    if (this.socket) {
      console.log("🧹 Cerrando conexión WebSocket...");
      this.socket.removeAllListeners(); // Importante para evitar fugas de memoria
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// ──────────────────────────────────────────────
// Exportar Instancia
// ──────────────────────────────────────────────

// Exporta una instancia singleton de la clase
export const apiService = new ApiService(import.meta.env.VITE_API_URL);
