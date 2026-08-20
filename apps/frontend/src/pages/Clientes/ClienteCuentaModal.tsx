import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { formatoMoneda } from "../../utils/format";
import { ApiError } from "../../services/api";
import { ClienteDTO, obtenerCuentaCliente, registrarAbono } from "../../services/clienteService";

const METODOS_ABONO = [
  { valor: "EFECTIVO", etiqueta: "Efectivo" },
  { valor: "TRANSFERENCIA_BANCOLOMBIA", etiqueta: "Transferencia Bancolombia" },
  { valor: "NEQUI", etiqueta: "Nequi" },
  { valor: "DAVIPLATA", etiqueta: "Daviplata" },
  { valor: "OTRO", etiqueta: "Otro" },
];

export function ClienteCuentaModal({
  cliente,
  onClose,
}: {
  cliente: ClienteDTO | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cuentaQuery = useQuery({
    queryKey: ["cliente", "cuenta", cliente?.id],
    queryFn: () => obtenerCuentaCliente(cliente!.id),
    enabled: !!cliente,
  });

  const abonoMutation = useMutation({
    mutationFn: () => registrarAbono(cliente!.id, Number(monto), metodoPago, descripcion || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cliente", "cuenta", cliente?.id] });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      queryClient.invalidateQueries({ queryKey: ["caja", "actual"] });
      setMonto("");
      setMetodoPago("EFECTIVO");
      setDescripcion("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo registrar el abono"),
  });

  return (
    <Modal open={!!cliente} onClose={onClose} title={`Cuenta — ${cliente?.nombre ?? ""}`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-ink-muted text-sm">Saldo pendiente</span>
          <span
            className={`font-display text-2xl font-bold ${
              (cuentaQuery.data?.saldo ?? 0) > 0 ? "text-rock-bright" : "text-ink"
            }`}
          >
            {formatoMoneda(cuentaQuery.data?.saldo ?? 0)}
          </span>
        </div>

        <div className="border-t border-border pt-3 flex flex-col gap-3">
          <p className="text-sm font-medium text-ink-muted">Registrar abono</p>
          <Input
            type="number"
            min={0}
            label="Monto"
            placeholder="20000"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-muted">¿Con qué pagó?</label>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="bg-surface border border-border rounded-md px-4 py-3 text-ink focus:border-rock transition-colors"
            >
              {METODOS_ABONO.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Descripción (opcional)"
            placeholder="Ej: pago parcial"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
          {error && <p className="text-sm text-rock-bright">{error}</p>}
          <Button
            fullWidth
            variant="secondary"
            disabled={!monto || Number(monto) <= 0 || abonoMutation.isPending}
            onClick={() => {
              setError(null);
              abonoMutation.mutate();
            }}
          >
            {abonoMutation.isPending ? "Registrando..." : "Registrar abono"}
          </Button>
        </div>

        <div className="border-t border-border pt-3">
          <p className="text-sm font-medium text-ink-muted mb-2">Historial</p>
          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
            {cuentaQuery.data?.movimientos.length === 0 && (
              <p className="text-sm text-ink-muted">Sin movimientos todavía.</p>
            )}
            {cuentaQuery.data?.movimientos.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <div>
                  <Badge estado={m.tipo} />
                  <p className="text-xs text-ink-muted mt-0.5">
                    {m.descripcion} ·{" "}
                    {new Date(m.fecha).toLocaleDateString("es-CO", { dateStyle: "short" })}
                  </p>
                </div>
                <span className={m.tipo === "CARGO" ? "text-ink" : "text-green-400"}>
                  {m.tipo === "CARGO" ? "+" : "-"}
                  {formatoMoneda(m.monto)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
