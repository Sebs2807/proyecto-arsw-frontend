import React from "react";
import { LoginForm } from "../molecules/LoginForm";
import { Link } from "react-router-dom";

export const LoginCard: React.FC = () => (
  <div className="rounded-xl p-8 w-full max-w-md flex flex-col gap-3">
    {/* Aquí usamos la molécula */}
    <LoginForm />

    <p className="text-center text-sm text-text-muted">
      ¿No tienes cuenta?{" "}
      <Link
        to="/register"
        className="text-limeyellow-500 hover:underline hover:text-limeyellow-700"
      >
        Regístrate aquí
      </Link>
    </p>
  </div>
);
