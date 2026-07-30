import { apiRequest } from "./api";

export interface MovimientoCajaDTO {
  id: string;
  tipo: "APERTURA" | "CIERRE" | "INGRESO" | "GASTO" | "VENTA";
  monto: number;
  descripcion: string | null;
  fecha: string;
  usuario: { id: string; nombre: string };
}

export interface VentaDTO {
  id: string;
  total: number;
  metodoPago: string;
  fecha: string;
  espacio: { id: string; nombre: string };
}

export interface ResumenCajaDTO {
  cajaId: string;
  montoInicial: number;
  fechaApertura: string;
  ingresos: number;
  gastos: number;
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

export function obtenerCajaActual() {
  return apiRequest<ResumenCajaDTO | null>("/caja/actual");
}

export function abrirCaja(montoInicial: number) {
  return apiRequest("/caja/abrir", { method: "POST", body: { montoInicial } });
}

export function registrarMovimiento(tipo: "INGRESO" | "GASTO", monto: number, descripcion: string) {
  return apiRequest("/caja/movimientos", { method: "POST", body: { tipo, monto, descripcion } });
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
  return apiRequest<CierreCajaResultadoDTO>(`/caja/${id}`);
}
