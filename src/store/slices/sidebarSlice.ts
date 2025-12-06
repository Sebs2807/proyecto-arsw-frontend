// src/store/slices/sidebarSlice.ts
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
export interface SidebarState {
  isOpen: boolean;
  section: string;
  activeItem: string;
}

const defaultItems: Record<string, string> = {
  home: "members",
  columns: "boards",
  bot: "assistant-knowledge",
};

const initialState: SidebarState = {
  isOpen: true,
  section: "home",
  activeItem: defaultItems["home"],
};

const sidebarSlice = createSlice({
  name: "sidebar",
  initialState,
  reducers: {
    setSection: (state, action: PayloadAction<string>) => {
      state.section = action.payload;
      state.activeItem = defaultItems[action.payload] || "";
    },
    setActiveItem: (state, action: PayloadAction<string>) => {
      state.activeItem = action.payload;
    },
  },
});

export const { setSection, setActiveItem } = sidebarSlice.actions;
export default sidebarSlice.reducer;
