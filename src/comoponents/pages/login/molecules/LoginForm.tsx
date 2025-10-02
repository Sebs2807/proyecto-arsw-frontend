import React, { useState } from "react";
import { InputWithIcon } from "../../../atoms/InputWithIcon";
import { Button } from "../../../atoms/Button";
import { ButtonWithIcon } from "../../../atoms/ButtonWithIcon";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../../store/index";
import { loginEmailThunk, loginGoogleThunk } from "../../../../store/authSlice";

import GoogleIcon from "../../../../assets/google.svg?react";
import UserIcon from "../../../../assets/user-round.svg?react";
import LockIcon from "../../../../assets/lock.svg?react";

export const LoginForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { loading, error } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(loginEmailThunk({ email, password }));

    if (loginEmailThunk.fulfilled.match(result)) {
      navigate("/dashboard");
    }
  };

  const handleGoogleLogin = async () => {
    const result = await dispatch(loginGoogleThunk());
    if (loginGoogleThunk.fulfilled.match(result)) {
      navigate("/dashboard");
    }
  };

  return (
    <form onSubmit={handleEmailLogin} className="flex flex-col gap-4 w-full">
      <InputWithIcon
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        leftIcon={<UserIcon className="w-5 h-5" />}
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

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Cargando..." : "Iniciar sesión"}
      </Button>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex items-center gap-2">
        <hr className="grow border-dark-600" />
        <span className="text-text-muted text-sm">o</span>
        <hr className="grow border-dark-600" />
      </div>

      <ButtonWithIcon
        icon={<GoogleIcon className="w-5 h-5" />}
        label="Iniciar con Google"
        onClick={handleGoogleLogin}
        className="w-full"
        disabled={loading}
      />
    </form>
  );
};
