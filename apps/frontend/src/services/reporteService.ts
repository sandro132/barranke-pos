import { apiRequest } from "./api";

export interface VentaPeriodoDTO {
  periodo: string;
  total: number;
  cantidad: number;
}

export interface ProductoReporteDTO {
  nombre: string;
  categoria: string;
  cantidad: number;
  ingresos: number;
}

export interface ProductosReporteDTO {
  masVendidos: ProductoReporteDTO[];
  menosVendidos: ProductoReporteDTO[];
}

export interface GananciasDTO {
  ingresos: number;
  costos: number;
  gananciaBruta: number;
  margenBruto: number;
  gastosOperativos: number;
  gastosPorCategoria: { categoria: string; monto: number }[];
  gananciaNeta: number;
  margenNeto: number;
  // Compatibilidad: equivalen a gananciaBruta/margenBruto
  ganancia: number;
  margen: number;
}

export interface MetodoPagoReporteDTO {
  metodo: string;
  total: number;
}

export interface CategoriaReporteDTO {
  categoria: string;
  cantidad: number;
  total: number;
}

export interface StockBajoReporteDTO {
  id: string;
  tipo: "producto" | "ingrediente";
  nombre: string;
  stock: number;
  stockMinimo: number;
  unidad: string;
}

export interface InventarioReporteDTO {
  valorTotal: number;
  valorProductos: number;
  valorIngredientes: number;
  stockBajo: StockBajoReporteDTO[];
}

export interface ConsumoInternoReporteDTO {
  totalCosto: number;
  totalMovimientos: number;
  porUsuario: { nombre: string; costo: number; cantidad: number }[];
  porItem: { nombre: string; costo: number; cantidad: number }[];
}

export interface ComprasReporteDTO {
  totalGastado: number;
  totalCompras: number;
  porProveedor: { nombre: string; total: number; cantidadCompras: number }[];
  porItem: { nombre: string; cantidad: number; total: number }[];
}

function query(desde?: string, hasta?: string, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  if (desde) params.set("desde", desde);
  if (hasta) params.set("hasta", hasta);
  if (extra) Object.entries(extra).forEach(([k, v]) => params.set(k, v));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function obtenerVentasPorPeriodo(
  desde?: string,
  hasta?: string,
  agrupacion: "dia" | "mes" | "anio" = "dia"
) {
  return apiRequest<VentaPeriodoDTO[]>(`/reportes/ventas${query(desde, hasta, { agrupacion })}`);
}

export function obtenerProductosReporte(desde?: string, hasta?: string) {
  return apiRequest<ProductosReporteDTO>(`/reportes/productos${query(desde, hasta)}`);
}

export function obtenerGanancias(desde?: string, hasta?: string) {
  return apiRequest<GananciasDTO>(`/reportes/ganancias${query(desde, hasta)}`);
}

export function obtenerMetodosPagoReporte(desde?: string, hasta?: string) {
  return apiRequest<MetodoPagoReporteDTO[]>(`/reportes/metodos-pago${query(desde, hasta)}`);
}

export function obtenerCategoriasReporte(desde?: string, hasta?: string) {
  return apiRequest<CategoriaReporteDTO[]>(`/reportes/categorias${query(desde, hasta)}`);
}

export function obtenerInventarioReporte() {
  return apiRequest<InventarioReporteDTO>(`/reportes/inventario`);
}

export function obtenerConsumoInternoReporte(desde?: string, hasta?: string) {
  return apiRequest<ConsumoInternoReporteDTO>(`/reportes/consumo-interno${query(desde, hasta)}`);
}

export function obtenerComprasReporte(desde?: string, hasta?: string) {
  return apiRequest<ComprasReporteDTO>(`/reportes/compras${query(desde, hasta)}`);
}

/**
 * Descarga el Excel completo de reportes. No usa apiRequest (que asume
 * JSON) — hace el fetch directo con el token, arma un archivo a partir de
 * la respuesta binaria, y dispara la descarga en el navegador.
 */
export async function descargarExcelReportes(desde?: string, hasta?: string) {
  const API_URL = import.meta.env.VITE_API_URL || "/api";
  const token = localStorage.getItem("barranke_token");

  const respuesta = await fetch(`${API_URL}/reportes/excel${query(desde, hasta)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!respuesta.ok) {
    throw new Error("No se pudo generar el Excel");
  }

  const blob = await respuesta.blob();
  const nombreArchivo =
    respuesta.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
    "reporte-barranke.xlsx";

  const url = window.URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.URL.revokeObjectURL(url);
}

/** Igual que descargarExcelReportes, pero para el inventario actual (sin rango de fechas). */
export async function descargarExcelInventario() {
  const API_URL = import.meta.env.VITE_API_URL || "/api";
  const token = localStorage.getItem("barranke_token");

  const respuesta = await fetch(`${API_URL}/reportes/inventario/excel`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!respuesta.ok) {
    throw new Error("No se pudo generar el Excel");
  }

  const blob = await respuesta.blob();
  const nombreArchivo =
    respuesta.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
    "inventario-barranke.xlsx";

  const url = window.URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.URL.revokeObjectURL(url);
}
