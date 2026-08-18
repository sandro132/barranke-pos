import { apiRequest } from "./api";

export interface UsuarioDTO {
  id: string;
  nombre: string;
  email: string;
  rol: "ADMIN" | "MESERO" | "COCINA" | "BAR";
  activo: boolean;
  createdAt: string;
}

export interface CrearUsuarioInput {
  nombre: string;
  email: string;
  password: string;
  rol: string;
}

export function listarUsuarios() {
  return apiRequest<UsuarioDTO[]>("/usuarios");
}

export function crearUsuario(data: CrearUsuarioInput) {
  return apiRequest<UsuarioDTO>("/usuarios", { method: "POST", body: data });
}

export function actualizarUsuario(id: string, data: { nombre?: string; rol?: string; activo?: boolean }) {
  return apiRequest<UsuarioDTO>(`/usuarios/${id}`, { method: "PATCH", body: data });
}

export function resetearPasswordUsuario(id: string, passwordNueva: string) {
  return apiRequest<void>(`/usuarios/${id}/resetear-password`, {
    method: "POST",
    body: { passwordNueva },
  });
}
