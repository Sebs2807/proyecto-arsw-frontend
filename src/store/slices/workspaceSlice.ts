import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { apiService } from "../../services/api/ApiService";

// 🧩 Interfaces
export interface Workspace {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Board {
  id: string;
  title: string;
  description?: string | null;
  color?: string;
  workspaceId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 🧠 Estado global
interface WorkspaceState {
  workspaces: Workspace[];
  selectedWorkspace: Workspace | null;
  selectedBoard: Board | null; // <--- Nuevo
}

const initialState: WorkspaceState = {
  workspaces: [],
  selectedWorkspace: null,
  selectedBoard: null,
};

// 🚀 Thunk para cargar workspaces
export const fetchWorkspaces = createAsyncThunk<Workspace[], void>(
  "workspace/fetchWorkspaces",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<Workspace[]>("/v1/workspaces", {
        withCredentials: true,
      });
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    setWorkspaces(state, action: PayloadAction<Workspace[]>) {
      state.workspaces = action.payload;
      if (!state.selectedWorkspace && action.payload.length > 0) {
        state.selectedWorkspace = action.payload[0];
      }
    },
    setSelectedWorkspace(state, action: PayloadAction<Workspace>) {
      state.selectedWorkspace = action.payload;
      state.selectedBoard = null;
    },
    setSelectedBoard(state, action: PayloadAction<Board>) {
      state.selectedBoard = action.payload;
    },
    clearSelectedBoard(state) {
      state.selectedBoard = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchWorkspaces.fulfilled, (state, action) => {
      state.workspaces = action.payload;
      if (!state.selectedWorkspace && action.payload.length > 0) {
        state.selectedWorkspace = action.payload[0];
      }
    });
  },
});

export const {
  setWorkspaces,
  setSelectedWorkspace,
  setSelectedBoard,
  clearSelectedBoard,
} = workspaceSlice.actions;

export default workspaceSlice.reducer;
