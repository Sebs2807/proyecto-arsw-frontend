import React from "react";
import { ButtonWithIcon } from "../../../atoms/ButtonWithIcon";
import { useSelector } from "react-redux";
import type { RootState } from "../../../../store/index";

import GoogleIcon from "../../../../assets/google.svg?react";

export const LoginForm: React.FC = () => {
  const { loading } = useSelector((state: RootState) => state.auth);

  const handleGoogleLogin = () => {
    const url = import.meta.env.VITE_API_URL + "/v1/auth/google";
    console.log("Redirigiendo a:", url);
    globalThis.location.href = url;
  };

  return (
    <div className="flex flex-col gap-4">
      <ButtonWithIcon
        icon={<GoogleIcon className="w-5 h-5" />}
        label="Iniciar con Google"
        onClick={handleGoogleLogin}
        className="w-full"
        disabled={loading}
      />
    </div>
  );
};
