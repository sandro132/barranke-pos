import { apiRequest } from "./api";

// Espacio ahora es solo el catálogo físico del local (Mesa 1, Barra 2...) —
// ya no maneja ocupación ni consumo. Eso lo maneja cuentaService.ts.
export interface EspacioDTO {
  id: string;
  nombre: string;
  tipo: "MESA" | "BARRA";
  capacidad: number | null;
}

export function listarEspacios() {
  return apiRequest<EspacioDTO[]>("/espacios");
}

export function crearEspacio(nombre: string, tipo: "MESA" | "BARRA", capacidad?: number) {
  return apiRequest<EspacioDTO>("/espacios", {
    method: "POST",
    body: { nombre, tipo, capacidad },
  });
}

export function actualizarEspacio(id: string, nombre: string, capacidad?: number | null) {
  return apiRequest<EspacioDTO>(`/espacios/${id}`, {
    method: "PATCH",
    body: { nombre, capacidad },
  });
}
