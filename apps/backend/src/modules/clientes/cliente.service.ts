import { prisma } from "../../lib/prisma";
import { AppError } from "../../middlewares/errorHandler";
import { TipoMovimientoCuentaCliente } from "@barranke/shared";
import {
  ActualizarClienteInput,
  CrearClienteInput,
  RegistrarAbonoInput,
} from "./cliente.schema";

/**
 * El "fiado" ahora sí está conectado al flujo real: cerrar una mesa con
 * método FIADO genera un CARGO aquí (ver cuenta.service.ts). Este módulo
 * expone el saldo resultante y permite registrar abonos para saldarlo.
 * El resto (nombre, teléfono, cumpleaños) sigue siendo CRUD simple.
 */
export async function listarClientes() {
  const clientes = await prisma.cliente.findMany({ orderBy: { nombre: "asc" } });
  const movimientos = await prisma.movimientoCuentaCliente.findMany();

  const saldos = new Map<string, number>();
  for (const m of movimientos) {
    const actual = saldos.get(m.clienteId) ?? 0;
    const signo = m.tipo === TipoMovimientoCuentaCliente.CARGO ? 1 : -1;
    saldos.set(m.clienteId, actual + signo * Number(m.monto));
  }

  return clientes.map((c) => ({ ...c, saldo: saldos.get(c.id) ?? 0 }));
}

export async function obtenerCliente(id: string) {
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) {
    throw new AppError("Cliente no encontrado", 404);
  }
  return cliente;
}

export async function crearCliente(data: CrearClienteInput) {
  return prisma.cliente.create({
    data: {
      nombre: data.nombre,
      telefono: data.telefono,
      cumpleanos: data.cumpleanos ? new Date(`${data.cumpleanos}T00:00:00`) : undefined,
    },
  });
}

export async function actualizarCliente(id: string, data: ActualizarClienteInput) {
  await obtenerCliente(id);
  return prisma.cliente.update({
    where: { id },
    data: {
      nombre: data.nombre,
      telefono: data.telefono,
      cumpleanos: data.cumpleanos ? new Date(`${data.cumpleanos}T00:00:00`) : undefined,
    },
  });
}

export async function eliminarCliente(id: string) {
  await obtenerCliente(id);
  await prisma.cliente.delete({ where: { id } });
}

/**
 * Saldo actual = suma de CARGO - suma de ABONO. Nunca se guarda como un
 * número aparte: siempre se calcula del historial, para que jamás se
 * desincronice de la realidad.
 */
export async function obtenerCuenta(clienteId: string) {
  await obtenerCliente(clienteId);

  const movimientos = await prisma.movimientoCuentaCliente.findMany({
    where: { clienteId },
    orderBy: { fecha: "desc" },
  });

  const saldo = movimientos.reduce((total, m) => {
    const signo = m.tipo === TipoMovimientoCuentaCliente.CARGO ? 1 : -1;
    return total + signo * Number(m.monto);
  }, 0);

  return { saldo, movimientos };
}

/**
 * Registra un pago del cliente para bajar su deuda. Si hay una caja abierta,
 * también entra como ingreso real a la caja del día (el dinero sí llega
 * físicamente en el momento del abono, a diferencia del cargo original).
 */
export async function registrarAbono(clienteId: string, usuarioId: string, data: RegistrarAbonoInput) {
  const cliente = await obtenerCliente(clienteId);

  return prisma.$transaction(async (tx) => {
    await tx.movimientoCuentaCliente.create({
      data: {
        clienteId,
        tipo: TipoMovimientoCuentaCliente.ABONO,
        monto: data.monto,
        descripcion: data.descripcion ?? `Abono de ${cliente.nombre}`,
      },
    });

    const cajaAbierta = await tx.caja.findFirst({ where: { abierta: true } });
    if (cajaAbierta) {
      await tx.movimientoCaja.create({
        data: {
          cajaId: cajaAbierta.id,
          tipo: "INGRESO",
          monto: data.monto,
          descripcion: `Abono de ${cliente.nombre}`,
          usuarioId,
        },
      });
    }

    return obtenerCuenta(clienteId);
  });
}
