// test/store/authSlice.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import reducer, {
  checkAuth,
  logout,
  setUser,
  type User,
} from "../../../src/store/slices/authSlice";
import { apiService } from "../../../src/services/api/ApiService";

vi.mock("../../../src/services/api/ApiService");

const mockUser: User = {
  id: "1",
  email: "test@example.com",
  firstName: "Camilo",
  lastName: "Fernandez",
  picture: "avatar.png",
  roles: ["USER"],
};

describe("authSlice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const initialState = {
    user: null,
    loading: false,
    isAuthChecked: false,
    error: null,
  };

  it("debería manejar setUser correctamente", () => {
    const newState = reducer(initialState, setUser(mockUser));
    expect(newState.user).toEqual(mockUser);
    expect(newState.isAuthChecked).toBe(false);
  });

  it("debería manejar logout correctamente", () => {
    const loggedInState = { ...initialState, user: mockUser };
    const newState = reducer(loggedInState, logout());
    expect(newState.user).toBeNull();
    expect(newState.isAuthChecked).toBe(true);
    expect(newState.error).toBeNull();
  });

  it("debería manejar checkAuth.pending", () => {
    const action = { type: checkAuth.pending.type };
    const state = reducer(initialState, action);
    expect(state.loading).toBe(true);
    expect(state.isAuthChecked).toBe(false);
  });

  it("debería manejar checkAuth.fulfilled con usuario", () => {
    const action = { type: checkAuth.fulfilled.type, payload: mockUser };
    const state = reducer(initialState, action);
    expect(state.loading).toBe(false);
    expect(state.isAuthChecked).toBe(true);
    expect(state.user).toEqual(mockUser);
  });

  it("debería manejar checkAuth.rejected", () => {
    const action = { type: checkAuth.rejected.type };
    const state = reducer(initialState, action);
    expect(state.loading).toBe(false);
    expect(state.isAuthChecked).toBe(true);
    expect(state.user).toBeNull();
  });

  it("ejecuta checkAuth correctamente cuando la API responde bien", async () => {
    (apiService.get as any).mockResolvedValueOnce(mockUser);

    const dispatch = vi.fn();
    const thunk = checkAuth();
    const result = await thunk(dispatch, () => ({}), undefined);

    expect(apiService.get).toHaveBeenCalledWith("/v1/auth/profile", {
      withCredentials: true,
    });
    expect(result.type).toBe("auth/checkAuth/fulfilled");
    expect(result.payload).toEqual(mockUser);
  });

  it("ejecuta checkAuth y maneja error cuando la API falla", async () => {
    (apiService.get as any).mockRejectedValueOnce(new Error("Error API"));

    const dispatch = vi.fn();
    const thunk = checkAuth();
    const result = await thunk(dispatch, () => ({}), undefined);

    expect(result.type).toBe("auth/checkAuth/rejected");
    expect(result.payload).toBeNull();
  });
});
