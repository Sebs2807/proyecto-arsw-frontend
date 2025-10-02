import React, { useState } from "react";
import { InputWithIcon } from "../../../atoms/InputWithIcon";
import { Button } from "../../../atoms/Button";
import { ButtonWithIcon } from "../../../atoms/ButtonWithIcon";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../../store/index";
import {
  registerEmailThunk,
  registerGoogleThunk,
} from "../../../../store/authSlice";

import GoogleIcon from "../../../../assets/google.svg?react";
import UserIcon from "../../../../assets/user-round.svg?react";
import LockIcon from "../../../../assets/lock.svg?react";
import MailIcon from "../../../../assets/mail.svg?react";
import { unwrapResult } from "@reduxjs/toolkit";

export const RegisterForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState("");

  const validatePassword = (pwd: string) => {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,}$/;
    return regex.test(pwd);
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setValidationError("Las contraseñas no coinciden");
      return;
    }

    if (!validatePassword(password)) {
      setValidationError(
        "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un caracter especial"
      );
      return;
    }

    setValidationError("");

    const result = await dispatch(
      registerEmailThunk({ name, email, password })
    );
    if (registerEmailThunk.fulfilled.match(result)) {
      navigate("/dashboard");
    }
  };

  const handleGoogleRegister = async () => {
    try {
      console.log("Iniciando registro con Google...");
      const actionResult = await dispatch(registerGoogleThunk());
      const data = unwrapResult(actionResult);
      console.log("✅ Google register success:", data);
      navigate("/dashboard");
    } catch (err) {
      console.error("❌ Google register error:", err);
    }
  };

  return (
    <form onSubmit={handleEmailRegister} className="flex flex-col gap-4 w-full">
      <InputWithIcon
        label="Nombre"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        leftIcon={<UserIcon className="w-5 h-5" />}
        required
      />
      <InputWithIcon
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        leftIcon={<MailIcon className="w-5 h-5" />}
        required
      />
      <InputWithIcon
        label="Contraseña"
        isPassword
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        leftIcon={<LockIcon className="w-5 h-5" />}
        required
      />
      <InputWithIcon
        label="Confirmar Contraseña"
        isPassword
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        leftIcon={<LockIcon className="w-5 h-5" />}
        required
      />

      {(validationError || error) && (
        <p className="text-red-500 text-sm">{validationError || error}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Cargando..." : "Registrarse"}
      </Button>

      <div className="flex items-center gap-2">
        <hr className="grow border-dark-600" />
        <span className="text-text-muted text-sm">o</span>
        <hr className="grow border-dark-600" />
      </div>

      <ButtonWithIcon
        icon={<GoogleIcon className="w-5 h-5" />}
        label="Registrarse con Google"
        onClick={handleGoogleRegister}
        className="w-full"
        disabled={loading}
      />
    </form>
  );
};
