import { LoginRequestDTO, LoginResponseDTO } from "@barranke/shared";
import { apiRequest } from "./api";

export function login(data: LoginRequestDTO) {
  return apiRequest<LoginResponseDTO>("/auth/login", { method: "POST", body: data });
}
