import { apiRequest } from "./api";
import { EspacioDTO } from "./espacioService";

export interface CuentaDTO {
  id: string;
  nombre: string;
  estado: "ABIERTA" | "CERRADA";
  horaApertura: string;
  descripcion: string | null;
  espacioId: string | null;
  espacio: EspacioDTO | null;
  cuentaPadreId: string | null;
  totalConsumido: number;
  tiempoAbiertaMinutos: number;
  unidaA: string | null;
  cuentasUnidas: string[];
}

export interface PagoDividido {
  metodoPago: string;
  monto: number;
  clienteId?: string;
}

export interface PrecuentaDTO {
  cuenta: string;
  cuentasUnidas: string[];
  items: { nombre: string; cantidad: number; precioUnitario: number; subtotal: number }[];
  total: number;
}

export function listarCuentas() {
  return apiRequest<CuentaDTO[]>("/cuentas");
}

export function obtenerCuenta(id: string) {
  return apiRequest<CuentaDTO>(`/cuentas/${id}`);
}

export function abrirCuenta(nombre: string, espacioId?: string, descripcion?: string) {
  return apiRequest<CuentaDTO>("/cuentas", {
    method: "POST",
    body: { nombre, espacioId, descripcion },
  });
}

export function actualizarCuenta(
  id: string,
  data: { nombre?: string; espacioId?: string | null; descripcion?: string | null }
) {
  return apiRequest<CuentaDTO>(`/cuentas/${id}`, { method: "PATCH", body: data });
}

export function cerrarCuenta(
  id: string,
  metodoPago?: string,
  pagos?: PagoDividido[],
  clienteId?: string,
  descuento?: number
) {
  return apiRequest<{ cuenta: CuentaDTO; venta: { id: string; total: number } | null }>(
    `/cuentas/${id}/cerrar`,
    { method: "POST", body: { metodoPago, pagos, clienteId, descuento } }
  );
}

export function unirCuentas(padreId: string, hijoIds: string[]) {
  return apiRequest<CuentaDTO>(`/cuentas/${padreId}/unir`, {
    method: "POST",
    body: { hijoIds },
  });
}

export function separarCuenta(id: string) {
  return apiRequest<CuentaDTO>(`/cuentas/${id}/separar`, { method: "POST" });
}

export function obtenerPrecuenta(id: string) {
  return apiRequest<PrecuentaDTO>(`/cuentas/${id}/precuenta`);
}
