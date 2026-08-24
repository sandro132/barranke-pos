import { apiRequest } from "./api";

export interface ClienteDTO {
  id: string;
  nombre: string;
  telefono: string | null;
  cumpleanos: string | null;
  saldo: number;
}

export interface ClienteInput {
  nombre: string;
  telefono?: string;
  cumpleanos?: string;
}

export interface MovimientoCuentaDTO {
  id: string;
  tipo: "CARGO" | "ABONO";
  monto: number;
  descripcion: string | null;
  fecha: string;
  ventaId: string | null;
}

export interface CuentaClienteDTO {
  saldo: number;
  movimientos: MovimientoCuentaDTO[];
}

export function listarClientes() {
  return apiRequest<ClienteDTO[]>("/clientes");
}

export function crearCliente(data: ClienteInput) {
  return apiRequest<ClienteDTO>("/clientes", { method: "POST", body: data });
}

export function actualizarCliente(id: string, data: Partial<ClienteInput>) {
  return apiRequest<ClienteDTO>(`/clientes/${id}`, { method: "PATCH", body: data });
}

export function eliminarCliente(id: string) {
  return apiRequest(`/clientes/${id}`, { method: "DELETE" });
}

export function obtenerCuentaCliente(id: string) {
  return apiRequest<CuentaClienteDTO>(`/clientes/${id}/cuenta`);
}

export function registrarAbono(id: string, monto: number, metodoPago: string, descripcion?: string) {
  return apiRequest<CuentaClienteDTO>(`/clientes/${id}/abonos`, {
    method: "POST",
    body: { monto, metodoPago, descripcion },
  });
}
