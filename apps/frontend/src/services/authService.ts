import { LoginRequestDTO, LoginResponseDTO } from "@barranke/shared";
import { apiRequest } from "./api";

export function login(data: LoginRequestDTO) {
  return apiRequest<LoginResponseDTO>("/auth/login", { method: "POST", body: data });
}

export function cambiarPassword(passwordActual: string, passwordNueva: string) {
  return apiRequest<void>("/auth/password", {
    method: "PATCH",
    body: { passwordActual, passwordNueva },
  });
}
