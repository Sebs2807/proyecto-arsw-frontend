import React from "react";
import { LoginForm } from "../molecules/LoginForm";

export const LoginCard: React.FC = () => (
  <div className="rounded-xl p-6 w-full max-w-md flex flex-col gap-3">
    {/* Aquí usamos la molécula */}
    <LoginForm />
  </div>
);
