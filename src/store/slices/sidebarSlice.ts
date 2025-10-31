// src/store/slices/sidebarSlice.ts
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface SidebarState {
  isOpen: boolean;
  section: string;
  activeItem: string;
}

const initialState: SidebarState = {
  isOpen: true,
  section: "home",
  activeItem: "members",
};

const sidebarSlice = createSlice({
  name: "sidebar",
  initialState,
  reducers: {
    setSection: (state, action: PayloadAction<string>) => {
      state.section = action.payload;
    },
    setActiveItem: (state, action: PayloadAction<string>) => {
      state.activeItem = action.payload;
    },
  },
});

export const { setSection, setActiveItem } = sidebarSlice.actions;
export default sidebarSlice.reducer;
