import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { apiService } from "../../services/api/ApiService";

export interface Workspace {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

interface WorkspaceState {
  workspaces: Workspace[];
  selectedWorkspace: Workspace | null;
}

const initialState: WorkspaceState = {
  workspaces: [],
  selectedWorkspace: null,
};

export const fetchWorkspaces = createAsyncThunk<Workspace[], void>(
  "workspace/fetchWorkspaces",
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<Workspace[]>("/v1/workspaces", {
        withCredentials: true,
      });

      console.log(response);
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

export const { setWorkspaces, setSelectedWorkspace } = workspaceSlice.actions;
export default workspaceSlice.reducer;
