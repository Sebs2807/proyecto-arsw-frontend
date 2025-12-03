import { apiService } from "./api/ApiService";
import { AxiosError } from "axios";

export interface AuthResponse {
  id: string;
  email: string;
  firstName: string;
  lastName?: string;
  token: string;
  roles: string[];
}

export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    return await apiService.post<AuthResponse>("/v1/auth/login", {
      email,
      password,
    });
  } catch (err) {
    const errorMessage =
      (err as AxiosError)?.response?.data || (err as Error).message;
    console.error("Error en loginWithEmail:", errorMessage);
    throw err;
  }
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    return await apiService.post<AuthResponse>("/v1/auth/register", {
      name,
      email,
      password,
    });
  } catch (err) {
    const errorMessage =
      (err as AxiosError)?.response?.data || (err as Error).message;
    console.error("Error en registerWithEmail:", errorMessage);
    throw err;
  }
}

export async function loginWithGoogle(): Promise<AuthResponse> {
  try {
    return await apiService.get<AuthResponse>("/v1/auth/google/login");
  } catch (err) {
    const errorMessage =
      (err as AxiosError)?.response?.data || (err as Error).message;
    console.error("Error en loginWithGoogle:", errorMessage);
    throw err;
  }
}

export async function registerWithGoogle(): Promise<AuthResponse> {
  try {
    return await apiService.get<AuthResponse>("/v1/auth/google/register");
  } catch (err) {
    const errorMessage =
      (err as AxiosError)?.response?.data || (err as Error).message;
    console.error("Error en registerWithGoogle:", errorMessage);
    throw err;
  }
}

export async function checkSession(): Promise<AuthResponse> {
  try {
    return await apiService.get<AuthResponse>("/v1/auth/profile", {
      withCredentials: true,
    });
  } catch (err) {
    const errorMessage =
      (err as AxiosError)?.response?.data || (err as Error).message;
    console.error("Error en checkSession:", errorMessage);
    throw err;
  }
}
