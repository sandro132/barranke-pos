import { apiRequest } from "./api";

export interface MovimientoCajaDTO {
  id: string;
  tipo: "APERTURA" | "CIERRE" | "INGRESO" | "GASTO" | "VENTA";
  monto: number;
  metodoPago: string | null;
  descripcion: string | null;
  fecha: string;
  usuario: { id: string; nombre: string };
}

export interface VentaDTO {
  id: string;
  total: number;
  metodoPago: string;
  fecha: string;
  cuenta: { id: string; nombre: string; espacio: { nombre: string } | null };
}

export interface ResumenCajaDTO {
  cajaId: string;
  montoInicial: number;
  fechaApertura: string;
  ingresos: number;
  ingresosPorMetodo: Record<string, number>;
  gastos: number;
  gastosPorMetodo: Record<string, number>;
  totalVentas: number;
  ventasPorMetodo: Record<string, number>;
  ventasEfectivo: number;
  montoEsperadoEfectivo: number;
  movimientos: MovimientoCajaDTO[];
  ventas: VentaDTO[];
  abierta?: boolean;
}

export interface CajaHistorialDTO {
  id: string;
  fechaApertura: string;
  fechaCierre: string | null;
  montoInicial: number;
  montoFinal: number | null;
  abierta: boolean;
}

export interface CierreCajaResultadoDTO extends ResumenCajaDTO {
  montoContado: number;
  diferencia: number;
}

export interface CajaDetalleDTO extends ResumenCajaDTO {
  abierta: boolean;
  fechaCierre: string | null;
  montoFinal: number | null;
}

export function obtenerCajaActual() {
  return apiRequest<ResumenCajaDTO | null>("/caja/actual");
}

export function abrirCaja(montoInicial: number) {
  return apiRequest("/caja/abrir", { method: "POST", body: { montoInicial } });
}

export function registrarMovimiento(
  tipo: "INGRESO" | "GASTO",
  monto: number,
  metodoPago: string,
  descripcion: string
) {
  return apiRequest("/caja/movimientos", {
    method: "POST",
    body: { tipo, monto, metodoPago, descripcion },
  });
}

export function actualizarMovimiento(
  id: string,
  data: { monto?: number; metodoPago?: string; descripcion?: string }
) {
  return apiRequest<MovimientoCajaDTO>(`/caja/movimientos/${id}`, { method: "PATCH", body: data });
}

export function eliminarMovimiento(id: string) {
  return apiRequest(`/caja/movimientos/${id}`, { method: "DELETE" });
}

export function cerrarCaja(montoContado: number) {
  return apiRequest<CierreCajaResultadoDTO>("/caja/cerrar", {
    method: "POST",
    body: { montoContado },
  });
}

export function listarHistorialCaja() {
  return apiRequest<CajaHistorialDTO[]>("/caja/historial");
}

export function obtenerDetalleCaja(id: string) {
  return apiRequest<CajaDetalleDTO>(`/caja/${id}`);
}
