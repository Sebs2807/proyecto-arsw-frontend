// src/services/authService.ts
import { apiService } from "./api/ApiService";

export interface AuthResponse {
  id: string;
  email: string;
  name: string;
  token: string;
  roles: string[];
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthResponse | null> {
  try {
    return await apiService.post<AuthResponse>("/v1/auth/login", {
      email,
      password,
    });
  } catch (err: any) {
    console.error(
      "Error en loginWithEmail:",
      err.response?.data || err.message
    );
    return null;
  }
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse | null> {
  try {
    return await apiService.post<AuthResponse>("/v1/auth/register", {
      name,
      email,
      password,
    });
  } catch (err: any) {
    console.error(
      "Error en registerWithEmail:",
      err.response?.data || err.message
    );
    return null;
  }
}

export async function loginWithGoogle(): Promise<AuthResponse | null> {
  try {
    return await apiService.get<AuthResponse>("/v1/auth/google");
  } catch (err: any) {
    console.error(
      "Error en loginWithGoogle:",
      err.response?.data || err.message
    );
    return null;
  }
}

export async function registerWithGoogle(): Promise<AuthResponse | null> {
  try {
    return await apiService.get<AuthResponse>("/v1/auth/google");
  } catch (err: any) {
    console.error(
      "Error en registerWithGoogle:",
      err.response?.data || err.message
    );
    return null;
  }
}

export async function checkSession(): Promise<AuthResponse | null> {
  try {
    return await apiService.get<AuthResponse>("/v1/auth/profile", {
      withCredentials: true,
    });
  } catch (err: any) {
    console.error("Error en checkSession:", err.response?.data || err.message);
    return null;
  }
}
