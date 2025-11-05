// test/comoponents/ProtectedRoute.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../../src/store/slices/authSlice";
import { ProtectedRoute } from "../../src/comoponents/ProtectedRoute";

// Helper para renderizar con un estado custom
const renderWithStore = (preloadedState: any, ui: React.ReactNode) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState,
  });

  return render(
    <Provider store={store}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>
  );
};

describe("ProtectedRoute", () => {
  it("muestra mensaje de carga si la sesión aún no ha sido verificada", () => {
    renderWithStore(
      { auth: { user: null, isAuthChecked: false } },
      <ProtectedRoute>
        <div>Contenido protegido</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Cargando sesión...")).toBeInTheDocument();
  });

  it("redirige al login si no hay usuario autenticado", () => {
    renderWithStore(
      { auth: { user: null, isAuthChecked: true } },
      <ProtectedRoute>
        <div>Contenido protegido</div>
      </ProtectedRoute>
    );

    // Como Navigate no renderiza texto, comprobamos que no aparece el contenido
    expect(screen.queryByText("Contenido protegido")).not.toBeInTheDocument();
  });

  it("renderiza los children si el usuario está autenticado", () => {
    renderWithStore(
      { auth: { user: { name: "Camilo" }, isAuthChecked: true } },
      <ProtectedRoute>
        <div>Contenido protegido</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
  });
});
