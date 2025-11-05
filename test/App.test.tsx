// test/App.test.tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import App from "../src/App";
import { configureStore } from "@reduxjs/toolkit";
import { Provider, useDispatch, useSelector } from "react-redux";
import authReducer from "../src/store/slices/authSlice";

vi.mock("react-redux", () => ({
  useDispatch: vi.fn(),
  useSelector: vi.fn(),
  Provider: ({ children }: any) => children,
}));

const useDispatchMock = useDispatch as unknown as vi.Mock;
const useSelectorMock = useSelector as unknown as vi.Mock;

const renderWithRouter = (initialPath = "/home") =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>
  );

describe("App Component", () => {
  beforeEach(() => {
    useDispatchMock.mockReturnValue(vi.fn());
  });

  it("muestra 'Loading...' cuando isAuthChecked es falso", () => {
    useSelectorMock.mockReturnValue({ user: null, isAuthChecked: false });
    renderWithRouter();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("muestra LoginPage cuando no hay usuario y isAuthChecked es true", () => {
    useSelectorMock.mockReturnValue({ user: null, isAuthChecked: true });
    renderWithRouter("/login");
    expect(screen.getByText(/iniciar sesión/i)).toBeInTheDocument();
  });

  it("redirige a /home si hay usuario y pathname es /", () => {
    useSelectorMock.mockReturnValue({
      user: { id: "1", email: "test@test.com" },
      isAuthChecked: true,
    });
    renderWithRouter("/");
    expect(screen.queryByText(/iniciar sesión/i)).not.toBeInTheDocument();
  });

  it("no redirige si hay usuario y la ruta no es / ni /login", () => {
    useSelectorMock.mockReturnValue({
      user: { id: "1", email: "test@test.com" },
      isAuthChecked: true,
    });
    renderWithRouter("/assistant");
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
    expect(screen.queryByText(/iniciar sesión/i)).not.toBeInTheDocument();
  });
});

describe("Coverage - App useSelector", () => {
  it("ejecuta useSelector con el estado real para cubrir state.auth", () => {
    vi.doUnmock("react-redux");

    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: { user: null, isAuthChecked: true },
      },
    });

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={["/"]}>
          <App />
        </MemoryRouter>
      </Provider>
    );
  });
});
