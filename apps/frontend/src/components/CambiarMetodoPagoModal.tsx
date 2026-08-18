import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { formatoMoneda } from "../utils/format";
import { ApiError } from "../services/api";
import { cambiarMetodoPago, dividirPagoVenta } from "../services/ventaService";
import { listarClientes } from "../services/clienteService";

const METODOS_PAGO = [
  { valor: "EFECTIVO", etiqueta: "Efectivo" },
  { valor: "TRANSFERENCIA_BANCOLOMBIA", etiqueta: "Transferencia Bancolombia" },
  { valor: "NEQUI", etiqueta: "Nequi" },
  { valor: "DAVIPLATA", etiqueta: "Daviplata" },
  { valor: "OTRO", etiqueta: "Otro" },
  { valor: "FIADO", etiqueta: "Fiado" },
];

export interface VentaParaCorregir {
  id: string;
  cuentaNombre: string;
  total: number;
  metodoPagoActual: string;
}

interface ParteDividida {
  monto: string;
  metodoPago: string;
  clienteId: string;
}

function dividirEnPartesIguales(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const partes = Array(n).fill(base);
  partes[n - 1] = total - base * (n - 1);
  return partes;
}

export function CambiarMetodoPagoModal({
  venta,
  onClose,
  onExito,
}: {
  venta: VentaParaCorregir | null;
  onClose: () => void;
  onExito?: () => void;
}) {
  const queryClient = useQueryClient();
  const [metodoPago, setMetodoPago] = useState(venta?.metodoPagoActual ?? "EFECTIVO");
  const [clienteId, setClienteId] = useState("");
  const [dividiendo, setDividiendo] = useState(false);
  const [partes, setPartes] = useState<ParteDividida[]>([]);
  const [error, setError] = useState<string | null>(null);

  const clientesQuery = useQuery({
    queryKey: ["clientes"],
    queryFn: listarClientes,
    enabled: !!venta && (metodoPago === "FIADO" || dividiendo),
  });

  function cerrar() {
    setError(null);
    setClienteId("");
    setDividiendo(false);
    setPartes([]);
    onClose();
  }

  function activarDivision() {
    const iguales = dividirEnPartesIguales(venta!.total, 2);
    setPartes(iguales.map((monto) => ({ monto: String(monto), metodoPago: "EFECTIVO", clienteId: "" })));
    setDividiendo(true);
  }

  function cambiarNumeroPartes(n: number) {
    const iguales = dividirEnPartesIguales(venta!.total, n);
    setPartes(
      iguales.map((monto, i) => ({
        monto: String(monto),
        metodoPago: partes[i]?.metodoPago ?? "EFECTIVO",
        clienteId: partes[i]?.clienteId ?? "",
      }))
    );
  }

  const sumaPartes = partes.reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const diferenciaPartes = (venta?.total ?? 0) - sumaPartes;
  const faltaClienteDividido = partes.some((p) => p.metodoPago === "FIADO" && !p.clienteId);

  const mutation = useMutation({
    mutationFn: () => {
      if (dividiendo) {
        return dividirPagoVenta(
          venta!.id,
          partes.map((p) => ({
            metodoPago: p.metodoPago,
            monto: Number(p.monto),
            clienteId: p.metodoPago === "FIADO" ? p.clienteId : undefined,
          }))
        );
      }
      return cambiarMetodoPago(venta!.id, metodoPago, metodoPago === "FIADO" ? clienteId : undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ventas"] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "caja" });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "reportes" });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "clientes" });
      onExito?.();
      cerrar();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo corregir"),
  });

  const faltaClienteUnico = !dividiendo && metodoPago === "FIADO" && !clienteId;
  const sinCambios = !dividiendo && metodoPago === venta?.metodoPagoActual;

  return (
    <Modal open={!!venta} onClose={cerrar} title={`Corregir pago — ${venta?.cuentaNombre ?? ""}`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          Total de la venta: <span className="text-ink font-medium">{formatoMoneda(venta?.total ?? 0)}</span>
        </p>

        <button
          onClick={() => (dividiendo ? setDividiendo(false) : activarDivision())}
          className="text-sm text-ink-muted hover:text-ink underline text-left"
        >
          {dividiendo ? "← Volver a un solo método" : "Dividir en varios pagos"}
        </button>

        {!dividiendo ? (
          <>
            <div className="flex flex-col gap-2">
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
            </div>

            {metodoPago === "FIADO" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-ink-muted">¿A quién se le fía?</label>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="bg-surface border border-border rounded-md px-4 py-3 text-ink focus:border-rock transition-colors"
                >
                  <option value="">Selecciona un cliente...</option>
                  {clientesQuery.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
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

        {error && <p className="text-sm text-rock-bright">{error}</p>}

        <Button
          fullWidth
          disabled={
            mutation.isPending ||
            sinCambios ||
            (!dividiendo && faltaClienteUnico) ||
            (dividiendo && (diferenciaPartes !== 0 || faltaClienteDividido))
          }
          onClick={() => {
            setError(null);
            mutation.mutate();
          }}
        >
          {mutation.isPending ? "Guardando..." : "Guardar corrección"}
        </Button>
      </div>
    </Modal>
  );
}
