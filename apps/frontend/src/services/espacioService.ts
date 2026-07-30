import { apiRequest } from "./api";

export interface EspacioDTO {
  id: string;
  nombre: string;
  tipo: "MESA" | "BARRA";
  estado: "LIBRE" | "OCUPADA" | "RESERVADA";
  capacidad: number | null;
  horaApertura: string | null;
  personas: number | null;
  totalConsumido: number;
  tiempoAbiertaMinutos: number;
}

export function listarEspacios() {
  return apiRequest<EspacioDTO[]>("/espacios");
}

export function obtenerEspacio(id: string) {
  return apiRequest<EspacioDTO>(`/espacios/${id}`);
}

export function abrirEspacio(id: string, personas?: number) {
  return apiRequest<EspacioDTO>(`/espacios/${id}/abrir`, {
    method: "POST",
    body: { personas },
  });
}

export function cerrarEspacio(id: string) {
  return apiRequest<EspacioDTO>(`/espacios/${id}/cerrar`, { method: "POST" });
}
