import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import axios from "axios";
import { io } from "socket.io-client";
import { apiService as ApiService } from "../../../src/services/api/ApiService";

// ✅ Mock de axios (incluyendo export default)
vi.mock("axios", () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: { response: { use: vi.fn() } },
  };
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
    create: vi.fn(() => mockAxiosInstance),
  };
});

// ✅ Mock del socket
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
    connected: true,
  })),
}));

describe("ApiService", () => {
  let mockAxiosInstance: any;
  let mockSocket: any;

  beforeEach(() => {
    mockAxiosInstance = (axios as any).create();
    mockSocket = io();

    // @ts-ignore
    ApiService["axiosInstance"] = mockAxiosInstance;
    // @ts-ignore
    ApiService["socket"] = mockSocket;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("debería hacer una petición GET correctamente", async () => {
    mockAxiosInstance.get.mockResolvedValue({
      data: { data: { message: "ok" } },
    });
    const response = await ApiService.get("/test");
    expect(response).toEqual({ message: "ok" });
  });

  it("debería hacer una petición POST correctamente", async () => {
    mockAxiosInstance.post.mockResolvedValue({
      data: { data: { created: true } },
    });
    const response = await ApiService.post("/create", { name: "test" });
    expect(response).toEqual({ created: true });
  });

  it("debería hacer una petición PUT correctamente", async () => {
    mockAxiosInstance.put.mockResolvedValue({
      data: { data: { updated: true } },
    });
    const response = await ApiService.put("/update", { id: 1 });
    expect(response).toEqual({ updated: true });
  });

  it("debería hacer una petición PATCH correctamente", async () => {
    mockAxiosInstance.patch.mockResolvedValue({
      data: { data: { patched: true } },
    });
    const response = await ApiService.patch("/patch", { id: 1 });
    expect(response).toEqual({ patched: true });
  });

  it("debería hacer una petición DELETE correctamente", async () => {
    mockAxiosInstance.delete.mockResolvedValue({
      data: { data: { deleted: true } },
    });
    const response = await ApiService.delete("/delete");
    expect(response).toEqual({ deleted: true });
  });

  it("emitSocketEvent debería emitir evento si está conectado", () => {
    ApiService.emitSocketEvent("test-event", { data: 123 });
    expect(mockSocket.emit).toHaveBeenCalledWith("test-event", { data: 123 });
  });

  it("emitSocketEvent debería advertir si no hay conexión", () => {
    // @ts-ignore
    ApiService["socket"] = { connected: false };
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    ApiService.emitSocketEvent("test-event", { data: 123 });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("disconnectSocket debería cerrar correctamente la conexión", () => {
    ApiService.disconnectSocket();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
