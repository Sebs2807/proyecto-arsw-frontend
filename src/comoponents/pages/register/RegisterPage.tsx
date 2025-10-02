import React from "react";
import Brain from "../../../assets/brain.svg?react";
import { RegisterCard } from "./organisms/RegisterCard";

const RegisterPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 p-4 relative overflow-hidden">
      {/* Glow / Blur de fondo */}
      <div className="absolute inset-0 "></div>
      {/* Card de registro */}
      <div className="relative bg-dark-800 shadow-lg rounded-xl p-8 w-full max-w-md">
        {/* Logo + título */}
        <div className="flex items-center justify-center mb-4">
          <Brain className="h-8 w-8 text-limeyellow-500 mr-2" />
          <h1 className="text-2xl font-bold text-text-primary">Synapse CRM</h1>
        </div>

        <h2 className="text-xl font-semibold text-center mb-2 text-text-primary">
          Crear cuenta
        </h2>
        <p className="text-text-muted text-center text-sm mb-3">
          Regístrate para empezar a usar la plataforma
        </p>

        {/* Aquí consumimos el RegisterCard */}
        <RegisterCard />
      </div>
    </div>
  );
};

export default RegisterPage;
