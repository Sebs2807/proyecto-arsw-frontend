import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import {
  checkSession,
  loginWithEmail,
  registerWithEmail,
} from "../services/authService";

type User = {
  id: string;
  email: string;
  roles: string[];
  token: string;
};

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthChecked: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: JSON.parse(localStorage.getItem("user") || "null"),
  loading: false,
  isAuthChecked: false,
  error: null,
};

// ---- THUNKS ----
export const loginEmailThunk = createAsyncThunk<
  User | null,
  { email: string; password: string },
  { rejectValue: string }
>("auth/loginEmail", async ({ email, password }, { rejectWithValue }) => {
  try {
    const user = await loginWithEmail(email, password);
    return user;
  } catch (err: any) {
    return rejectWithValue(
      err.response?.data?.message || "Error al iniciar sesión"
    );
  }
});

export const registerEmailThunk = createAsyncThunk<
  User | null,
  { name: string; email: string; password: string },
  { rejectValue: string }
>(
  "auth/registerEmail",
  async ({ name, email, password }, { rejectWithValue }) => {
    try {
      const user = await registerWithEmail(name, email, password);
      return user;
    } catch (err: any) {
      return rejectWithValue(
        err.response?.data?.message || "Error al registrarse"
      );
    }
  }
);

export const loginGoogleThunk = createAsyncThunk(
  "auth/loginGoogle",
  async () => {
    window.location.href = import.meta.env.VITE_API_URL + "/v1/auth/google";
  }
);

export const registerGoogleThunk = createAsyncThunk(
  "auth/registerGoogle",
  async () => {
    window.location.href = import.meta.env.VITE_API_URL + "/v1/auth/google";
  }
);

export const checkAuth = createAsyncThunk(
  "auth/checkAuth",
  async (_, thunkAPI) => {
    try {
      const user = await checkSession();
      if (!user) throw new Error("No session");
      return user;
    } catch {
      return thunkAPI.rejectWithValue(null);
    }
  }
);

// ---- SLICE ----
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      localStorage.removeItem("user");
    },
    // Si quieres setear el usuario después del callback de Google
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      localStorage.setItem("user", JSON.stringify(action.payload));
    },
  },
  extraReducers: (builder) => {
    builder
      // LOGIN EMAIL
      .addCase(loginEmailThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginEmailThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        if (action.payload) {
          localStorage.setItem("user", JSON.stringify(action.payload));
        }
      })
      .addCase(loginEmailThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Error desconocido";
      })
      // REGISTER EMAIL
      .addCase(registerEmailThunk.fulfilled, (state, action) => {
        state.user = action.payload;
        if (action.payload) {
          localStorage.setItem("user", JSON.stringify(action.payload));
        }
      })
      // CHECK AUTH
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
        state.isAuthChecked = false;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthChecked = true;
        state.user = action.payload;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.loading = false;
        state.isAuthChecked = true;
        state.user = null;
      });
  },
});

export const { logout, setUser } = authSlice.actions;
export default authSlice.reducer;
