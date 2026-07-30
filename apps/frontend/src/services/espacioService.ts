import { apiRequest } from "./api";

export interface EspacioDTO {
  id: string;
  nombre: string;
  tipo: "MESA" | "BARRA";
  estado: "LIBRE" | "OCUPADA" | "RESERVADA";
  capacidad: number | null;
  horaApertura: string | null;
  descripcion: string | null;
  totalConsumido: number;
  tiempoAbiertaMinutos: number;
}

export function listarEspacios() {
  return apiRequest<EspacioDTO[]>("/espacios");
}

export function obtenerEspacio(id: string) {
  return apiRequest<EspacioDTO>(`/espacios/${id}`);
}

export function abrirEspacio(id: string, descripcion?: string) {
  return apiRequest<EspacioDTO>(`/espacios/${id}/abrir`, {
    method: "POST",
    body: { descripcion },
  });
}

export function cerrarEspacio(id: string, metodoPago?: string) {
  return apiRequest<{ espacio: EspacioDTO; venta: { id: string; total: number } | null }>(
    `/espacios/${id}/cerrar`,
    { method: "POST", body: { metodoPago } }
  );
}
