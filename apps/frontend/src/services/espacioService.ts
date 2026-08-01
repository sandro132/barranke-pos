import { apiRequest } from "./api";

export interface EspacioDTO {
  id: string;
  nombre: string;
  tipo: "MESA" | "BARRA";
  estado: "LIBRE" | "OCUPADA" | "RESERVADA";
  capacidad: number | null;
  horaApertura: string | null;
  descripcion: string | null;
  espacioPadreId: string | null;
  totalConsumido: number;
  tiempoAbiertaMinutos: number;
  unidaA: string | null;
  mesasUnidas: string[];
}

export interface PagoDividido {
  metodoPago: string;
  monto: number;
}

export interface PrecuentaDTO {
  espacio: string;
  mesasUnidas: string[];
  items: { nombre: string; cantidad: number; precioUnitario: number; subtotal: number }[];
  total: number;
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

export function cerrarEspacio(id: string, metodoPago?: string, pagos?: PagoDividido[]) {
  return apiRequest<{ espacio: EspacioDTO; venta: { id: string; total: number } | null }>(
    `/espacios/${id}/cerrar`,
    { method: "POST", body: { metodoPago, pagos } }
  );
}

export function unirEspacios(padreId: string, hijoIds: string[]) {
  return apiRequest<EspacioDTO>(`/espacios/${padreId}/unir`, {
    method: "POST",
    body: { hijoIds },
  });
}

export function separarEspacio(id: string) {
  return apiRequest<EspacioDTO>(`/espacios/${id}/separar`, { method: "POST" });
}

export function obtenerPrecuenta(id: string) {
  return apiRequest<PrecuentaDTO>(`/espacios/${id}/precuenta`);
}
