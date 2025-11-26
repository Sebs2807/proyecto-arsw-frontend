import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { apiService } from "../../services/api/ApiService";

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  picture: string;
  roles?: string[];
};

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthChecked: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  isAuthChecked: false,
  error: null,
};

// ---- THUNK: CHECK SESSION ----
export const checkAuth = createAsyncThunk<User | null>(
  "auth/checkAuth",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<User>("/v1/auth/profile", {
        withCredentials: true,
      });
      console.log("checkAuth response:", response);
      return response;
    } catch (err: any) {
      console.error("❌ Error en checkAuth:", err);

      return rejectWithValue(err.response?.data ?? null);
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.isAuthChecked = true;
      state.error = null;
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
        state.isAuthChecked = false;
        state.error = null;
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
