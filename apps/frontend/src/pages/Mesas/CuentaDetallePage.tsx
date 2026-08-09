import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import {
  cerrarCuenta,
  obtenerCuenta,
  PagoDividido,
  separarCuenta,
} from "../../services/cuentaService";
import { cancelarItem, listarPorCuenta, repetirUltimaRonda } from "../../services/pedidoService";
import { listarClientes } from "../../services/clienteService";
import { formatoMoneda } from "../../utils/format";
import { UnirCuentasModal } from "./UnirCuentasModal";

// TARJETA queda preparada en el backend pero no se ofrece todavía como opción
// (según el pedido original: "preparado para tarjetas en el futuro").
const METODOS_PAGO = [
  { valor: "EFECTIVO", etiqueta: "Efectivo" },
  { valor: "TRANSFERENCIA_BANCOLOMBIA", etiqueta: "Transferencia Bancolombia" },
  { valor: "NEQUI", etiqueta: "Nequi" },
  { valor: "DAVIPLATA", etiqueta: "Daviplata" },
  { valor: "OTRO", etiqueta: "Otro" },
  { valor: "FIADO", etiqueta: "Fiado" },
];

function dividirEnPartesIguales(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const partes = Array(n).fill(base);
  // La última parte se lleva el residuo del redondeo, para que la suma cuadre exacto.
  partes[n - 1] = total - base * (n - 1);
  return partes;
}

interface ParteDividida {
  monto: string;
  metodoPago: string;
  clienteId: string;
}

export function CuentaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [modalCierreAbierto, setModalCierreAbierto] = useState(false);
  const [modalUnirAbierto, setModalUnirAbierto] = useState(false);
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");
  const [clienteIdFiado, setClienteIdFiado] = useState("");
  const [dividiendo, setDividiendo] = useState(false);
  const [partes, setPartes] = useState<ParteDividida[]>([]);

  const cuentaQuery = useQuery({
    queryKey: ["cuenta", id],
    queryFn: () => obtenerCuenta(id!),
    enabled: !!id,
    refetchInterval: 30_000, // refresca el tiempo abierta cada 30s
  });

  const pedidosQuery = useQuery({
    queryKey: ["pedidos", "cuenta", id],
    queryFn: () => listarPorCuenta(id!),
    enabled: !!id,
  });

  const clientesQuery = useQuery({
    queryKey: ["clientes"],
    queryFn: listarClientes,
    enabled: modalCierreAbierto,
  });

  function invalidarTodo() {
    queryClient.invalidateQueries({ queryKey: ["cuentas"] });
    queryClient.invalidateQueries({ queryKey: ["cuenta", id] });
    queryClient.invalidateQueries({ queryKey: ["pedidos", "cuenta", id] });
    queryClient.invalidateQueries({ queryKey: ["caja", "actual"] });
    queryClient.invalidateQueries({ queryKey: ["clientes"] });
  }

  const cerrarMutation = useMutation({
    mutationFn: (vars: { metodo?: string; pagos?: PagoDividido[]; clienteId?: string }) =>
      cerrarCuenta(id!, vars.metodo, vars.pagos, vars.clienteId),
    onSuccess: () => {
      invalidarTodo();
      navigate("/cuentas");
    },
  });

  const repetirMutation = useMutation({
    mutationFn: () => repetirUltimaRonda(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos", "cuenta", id] });
      queryClient.invalidateQueries({ queryKey: ["cuenta", id] });
    },
  });

  const cancelarItemMutation = useMutation({
    mutationFn: (itemId: string) => cancelarItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos", "cuenta", id] });
      queryClient.invalidateQueries({ queryKey: ["cuenta", id] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "productos" });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "ingredientes" });
    },
  });

  const separarMutation = useMutation({
    mutationFn: () => separarCuenta(id!),
    onSuccess: invalidarTodo,
  });

  if (cuentaQuery.isLoading) {
    return <div className="p-8 text-ink-muted text-sm">Cargando...</div>;
  }

  const cuenta = cuentaQuery.data;
  if (!cuenta) {
    return <div className="p-8 text-ink-muted text-sm">Cuenta no encontrada.</div>;
  }

  function activarDivision() {
    const iguales = dividirEnPartesIguales(cuenta!.totalConsumido, 2);
    setPartes(iguales.map((monto) => ({ monto: String(monto), metodoPago: "EFECTIVO", clienteId: "" })));
    setDividiendo(true);
  }

  function cambiarNumeroPartes(n: number) {
    const iguales = dividirEnPartesIguales(cuenta!.totalConsumido, n);
    setPartes(
      iguales.map((monto, i) => ({
        monto: String(monto),
        metodoPago: partes[i]?.metodoPago ?? "EFECTIVO",
        clienteId: partes[i]?.clienteId ?? "",
      }))
    );
  }

  const sumaPartes = partes.reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const diferenciaPartes = cuenta.totalConsumido - sumaPartes;

  const faltaClienteUnico = metodoPago === "FIADO" && !clienteIdFiado;
  const faltaClienteDividido = dividiendo && partes.some((p) => p.metodoPago === "FIADO" && !p.clienteId);

  function confirmarCierre() {
    if (dividiendo) {
      cerrarMutation.mutate({
        pagos: partes.map((p) => ({
          metodoPago: p.metodoPago,
          monto: Number(p.monto),
          clienteId: p.metodoPago === "FIADO" ? p.clienteId : undefined,
        })),
      });
    } else {
      cerrarMutation.mutate({
        metodo: metodoPago,
        clienteId: metodoPago === "FIADO" ? clienteIdFiado : undefined,
      });
    }
  }

  // Vista reducida: esta cuenta está unida a otra, todo se maneja desde ahí.
  if (cuenta.unidaA) {
    return (
      <div className="p-8">
        <button onClick={() => navigate("/cuentas")} className="text-sm text-ink-muted hover:text-ink mb-4">
          ← Volver a Cuentas
        </button>
        <Card className="max-w-md">
          <h1 className="font-display uppercase text-xl font-bold text-ink mb-2">{cuenta.nombre}</h1>
          <p className="text-ink-muted text-sm mb-4">
            Esta cuenta está unida a <strong className="text-ink">{cuenta.unidaA}</strong>. El consumo,
            los pedidos y el cierre se manejan desde ahí.
          </p>
          <Button
            variant="secondary"
            onClick={() => separarMutation.mutate()}
            disabled={separarMutation.isPending}
          >
            {separarMutation.isPending ? "Separando..." : "Separar de esa cuenta"}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <button
        onClick={() => navigate("/cuentas")}
        className="text-sm text-ink-muted hover:text-ink mb-4"
      >
        ← Volver a Cuentas
      </button>

      <header className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">
            {cuenta.nombre}
          </h1>
          <p className="text-ink-muted text-sm mt-1">
            {cuenta.espacio ? `${cuenta.espacio.nombre} · ` : ""}
            Abierta hace {cuenta.tiempoAbiertaMinutos} min
            {cuenta.descripcion ? ` · ${cuenta.descripcion}` : ""}
          </p>
          {cuenta.cuentasUnidas.length > 0 && (
            <p className="text-xs text-rock-bright mt-1">
              Unida con: {cuenta.cuentasUnidas.join(", ")}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-muted uppercase tracking-wide">Total consumido</p>
          <p className="font-display text-3xl font-bold text-ink">
            {formatoMoneda(cuenta.totalConsumido)}
          </p>
        </div>
      </header>

      <div className="flex gap-3 mb-8 flex-wrap">
        <Button
          variant="secondary"
          onClick={() => repetirMutation.mutate()}
          disabled={repetirMutation.isPending || pedidosQuery.data?.length === 0}
        >
          {repetirMutation.isPending ? "Repitiendo..." : "Repetir última ronda"}
        </Button>
        <Button variant="secondary" onClick={() => setModalUnirAbierto(true)}>
          Unir cuenta
        </Button>
        <Button
          variant="secondary"
          onClick={() => window.open(`/cuentas/${id}/precuenta`, "_blank")}
          disabled={cuenta.totalConsumido === 0}
        >
          Precuenta
        </Button>
        <Button
          variant="secondary"
          className="border-rock text-rock-bright hover:bg-rock-dim/20"
          onClick={() => {
            setDividiendo(false);
            setMetodoPago("EFECTIVO");
            setClienteIdFiado("");
            if (cuenta.totalConsumido === 0) {
              cerrarMutation.mutate({});
            } else {
              setModalCierreAbierto(true);
            }
          }}
          disabled={cerrarMutation.isPending}
        >
          {cerrarMutation.isPending ? "Cerrando..." : "Cerrar cuenta"}
        </Button>
        <Button onClick={() => navigate(`/cuentas/${id}/pedido`)}>+ Agregar productos</Button>
      </div>

      <Card>
        <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-4">
          Pedidos de esta cuenta
        </h2>

        {pedidosQuery.isLoading && <p className="text-sm text-ink-muted">Cargando pedidos...</p>}

        {pedidosQuery.data?.length === 0 && (
          <p className="text-sm text-ink-muted">Todavía no se ha enviado ningún pedido a esta cuenta.</p>
        )}

        <div className="flex flex-col gap-4">
          {pedidosQuery.data?.map((pedido) => (
            <div key={pedido.id} className="border border-border rounded-md p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-ink-muted">
                  {new Date(pedido.createdAt).toLocaleTimeString("es-CO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <Badge estado={pedido.estado} />
              </div>
              <ul className="flex flex-col gap-1.5">
                {pedido.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <span className={item.estado === "CANCELADO" ? "text-ink-muted line-through" : "text-ink"}>
                      {item.cantidad}× {item.producto.nombre}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-ink-muted">
                        {formatoMoneda(item.precioUnitario * item.cantidad)}
                      </span>
                      <Badge estado={item.estado} />
                      {item.estado !== "CANCELADO" && (
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Cancelar ${item.cantidad}× ${item.producto.nombre}?`)) {
                              cancelarItemMutation.mutate(item.id);
                            }
                          }}
                          disabled={cancelarItemMutation.isPending}
                          className="text-xs text-ink-muted hover:text-rock-bright underline"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={modalCierreAbierto}
        onClose={() => setModalCierreAbierto(false)}
        title="Cerrar cuenta"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-ink-muted text-sm">Total a cobrar</span>
            <span className="font-display text-2xl font-bold text-ink">
              {formatoMoneda(cuenta.totalConsumido)}
            </span>
          </div>

          <button
            onClick={() => (dividiendo ? setDividiendo(false) : activarDivision())}
            className="text-sm text-ink-muted hover:text-ink underline text-left"
          >
            {dividiendo ? "← Volver a un solo pago" : "Dividir cuenta en varios pagos"}
          </button>

          {!dividiendo ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-ink-muted">Método de pago</label>
              {METODOS_PAGO.map((m) => (
                <button
                  key={m.valor}
                  onClick={() => setMetodoPago(m.valor)}
                  className={`text-left px-4 py-2.5 rounded-md text-sm font-medium border transition-colors ${
                    metodoPago === m.valor
                      ? "border-rock bg-rock-dim/20 text-ink"
                      : "border-border text-ink-muted hover:text-ink"
                  }`}
                >
                  {m.etiqueta}
                </button>
              ))}

              {metodoPago === "FIADO" && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <label className="text-sm font-medium text-ink-muted">¿A quién se le fía?</label>
                  <select
                    value={clienteIdFiado}
                    onChange={(e) => setClienteIdFiado(e.target.value)}
                    className="bg-surface border border-border rounded-md px-4 py-3 text-ink focus:border-rock transition-colors"
                  >
                    <option value="">Selecciona un cliente...</option>
                    {clientesQuery.data?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} {c.saldo > 0 ? `(debe ${formatoMoneda(c.saldo)})` : ""}
                      </option>
                    ))}
                  </select>
                  {clientesQuery.data?.length === 0 && (
                    <p className="text-xs text-rock-bright">
                      No hay clientes creados. Ve a "Clientes" en el menú para crear uno primero.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink-muted">Número de pagos:</span>
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => cambiarNumeroPartes(n)}
                    className={`w-9 h-9 rounded-md text-sm font-medium ${
                      partes.length === n ? "bg-rock text-ink" : "bg-surface-raised text-ink-muted"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              {partes.map((parte, idx) => (
                <div key={idx} className="border border-border rounded-md p-3 flex flex-col gap-2">
                  <p className="text-xs text-ink-muted">Pago {idx + 1}</p>
                  <Input
                    type="number"
                    min={0}
                    label="Monto"
                    value={parte.monto}
                    onChange={(e) => {
                      const nuevas = [...partes];
                      nuevas[idx] = { ...nuevas[idx], monto: e.target.value };
                      setPartes(nuevas);
                    }}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {METODOS_PAGO.map((m) => (
                      <button
                        key={m.valor}
                        onClick={() => {
                          const nuevas = [...partes];
                          nuevas[idx] = { ...nuevas[idx], metodoPago: m.valor };
                          setPartes(nuevas);
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-medium ${
                          parte.metodoPago === m.valor
                            ? "bg-rock text-ink"
                            : "bg-surface-raised text-ink-muted"
                        }`}
                      >
                        {m.etiqueta}
                      </button>
                    ))}
                  </div>
                  {parte.metodoPago === "FIADO" && (
                    <select
                      value={parte.clienteId}
                      onChange={(e) => {
                        const nuevas = [...partes];
                        nuevas[idx] = { ...nuevas[idx], clienteId: e.target.value };
                        setPartes(nuevas);
                      }}
                      className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-ink focus:border-rock transition-colors"
                    >
                      <option value="">Selecciona un cliente...</option>
                      {clientesQuery.data?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}

              <div className={`text-sm ${diferenciaPartes === 0 ? "text-ink-muted" : "text-rock-bright"}`}>
                {diferenciaPartes === 0
                  ? "Los pagos suman el total exacto."
                  : `Diferencia: ${formatoMoneda(diferenciaPartes)} (ajusta los montos)`}
              </div>
            </div>
          )}

          {cerrarMutation.isError && (
            <p className="text-sm text-rock-bright">No se pudo cerrar la cuenta. Intenta de nuevo.</p>
          )}

          <Button
            fullWidth
            disabled={
              cerrarMutation.isPending ||
              (dividiendo && (diferenciaPartes !== 0 || faltaClienteDividido)) ||
              (!dividiendo && faltaClienteUnico)
            }
            onClick={confirmarCierre}
          >
            {cerrarMutation.isPending ? "Cerrando..." : "Confirmar cierre"}
          </Button>
        </div>
      </Modal>

      <UnirCuentasModal
        cuenta={cuenta}
        open={modalUnirAbierto}
        onClose={() => setModalUnirAbierto(false)}
      />
    </div>
  );
}
