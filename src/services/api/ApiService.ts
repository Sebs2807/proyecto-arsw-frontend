import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { io, Socket } from "socket.io-client";

export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  listId: string;
}

export interface List {
  id: string;
  title: string;
  description?: string;
  order: number;
  cards: Task[];
}

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

class ApiService {
  private axiosInstance: AxiosInstance;
  private socket: Socket | null = null;

  constructor(baseURL: string) {
    this.axiosInstance = axios.create({
      baseURL,
      withCredentials: true,
    });

    // 🔐 Interceptores
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
            await this.axiosInstance.post("/v1/auth/refresh-token");
            return this.axiosInstance(originalRequest);
          } catch (refreshError) {
            console.error("⚠️ Refresh token inválido o expirado", refreshError);
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // 🧭 Métodos HTTP base
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

  // ⚡ WebSocket
  initSocket(
    onListCreated: ListCreatedCallback,
    onListUpdated: ListUpdatedCallback,
    onListDeleted: ListDeletedCallback,
    onCardCreated: CardCreatedCallback,
    onCardUpdated: CardUpdatedCallback,
    onCardDeleted: CardDeletedCallback,
    onCardMoved: CardMovedCallback,
    boardId: string
  ) {
    if (this.socket && this.socket.connected) {
      console.log("🔁 WebSocket ya conectado");
      return;
    }

    const baseURL =
      this.axiosInstance.defaults.baseURL || window.location.origin;

    this.socket = io(baseURL, {
      transports: ["websocket"],
      secure: baseURL.startsWith("https"),
      rejectUnauthorized: false,
      query: { boardId },
    });

    this.socket.on("connect", () =>
      console.log(`🟢 Conectado a WebSocket (board: ${boardId})`)
    );

    this.socket.on("disconnect", (reason) =>
      console.log(`🔴 Desconectado (${reason})`)
    );

    this.socket.on("connect_error", (err) =>
      console.error("❌ Error de conexión WS:", err.message)
    );

    // --- Eventos del servidor ---
    this.socket.on("list:created", onListCreated);
    this.socket.on("list:updated", onListUpdated);
    this.socket.on("list:deleted", ({ id }) => onListDeleted(id));

    this.socket.on("card:created", ({ listId, card }) =>
      onCardCreated(listId, card)
    );
    this.socket.on("card:updated", ({ listId, card }) =>
      onCardUpdated(listId, card)
    );
    this.socket.on("card:deleted", ({ listId, cardId }) =>
      onCardDeleted(listId, cardId)
    );
    this.socket.on("card:moved", ({ sourceListId, destListId, card }) =>
      onCardMoved(sourceListId, destListId, card)
    );
  }

  disconnectSocket() {
    if (this.socket) {
      console.log("🧹 Cerrando conexión WebSocket...");
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const apiService = new ApiService(import.meta.env.VITE_API_URL);
