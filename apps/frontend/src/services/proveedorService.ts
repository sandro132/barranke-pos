import { apiRequest } from "./api";

export interface ProveedorDTO {
  id: string;
  nombre: string;
  telefono: string | null;
  contacto: string | null;
  notas: string | null;
  _count: { compras: number };
}

export interface ProveedorInput {
  nombre: string;
  telefono?: string;
  contacto?: string;
  notas?: string;
}

export function listarProveedores() {
  return apiRequest<ProveedorDTO[]>("/proveedores");
}

export function crearProveedor(data: ProveedorInput) {
  return apiRequest<ProveedorDTO>("/proveedores", { method: "POST", body: data });
}

export function actualizarProveedor(id: string, data: Partial<ProveedorInput>) {
  return apiRequest<ProveedorDTO>(`/proveedores/${id}`, { method: "PATCH", body: data });
}

export function eliminarProveedor(id: string) {
  return apiRequest(`/proveedores/${id}`, { method: "DELETE" });
}
