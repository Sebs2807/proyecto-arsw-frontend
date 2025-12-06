// test/store/sidebarSlice.test.ts
import { describe, it, expect } from "vitest";
import reducer, {
  setSection,
  setActiveItem,
  type SidebarState,
} from "../../../src/store/slices/sidebarSlice";

describe("sidebarSlice", () => {
  const initialState: SidebarState = {
    isOpen: true,
    section: "home",
    activeItem: "members",
  };

  it("debería retornar el estado inicial por defecto", () => {
    const state = reducer(undefined, { type: "unknown" });
    expect(state).toEqual(initialState);
  });

  it("debería cambiar la sección correctamente con setSection", () => {
    const newState = reducer(initialState, setSection("settings"));
    expect(newState.section).toBe("settings");
    expect(newState.activeItem).toBe("");
  });

  it("debería cambiar el elemento activo correctamente con setActiveItem", () => {
    const newState = reducer(initialState, setActiveItem("dashboard"));
    expect(newState.activeItem).toBe("dashboard");
    expect(newState.section).toBe("home");
  });

  it("no debería mutar el estado original (inmutabilidad)", () => {
    const prevState = { ...initialState };
    reducer(prevState, setSection("reports"));
    expect(prevState).toEqual(initialState);
  });
});
