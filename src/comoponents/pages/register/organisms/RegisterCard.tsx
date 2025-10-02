import React from "react";
import { RegisterForm } from "../molecules/RegisterForm";
import { Link } from "react-router-dom";

export const RegisterCard: React.FC = () => (
  <div className="rounded-xl p-8 w-full max-w-md flex flex-col gap-3">
    <RegisterForm />

    <p className="text-center text-sm text-text-muted">
      ¿Ya tienes cuenta?{" "}
      <Link
        to="/login"
        className="text-limeyellow-500 hover:underline hover:text-limeyellow-700"
      >
        Inicia sesión aquí
      </Link>
    </p>
  </div>
);
