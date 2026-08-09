import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { formatoMoneda } from "../utils/format";
import { ApiError } from "../services/api";
import { cambiarMetodoPago } from "../services/ventaService";
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
  const [error, setError] = useState<string | null>(null);

  const clientesQuery = useQuery({
    queryKey: ["clientes"],
    queryFn: listarClientes,
    enabled: !!venta && metodoPago === "FIADO",
  });

  function cerrar() {
    setError(null);
    setClienteId("");
    onClose();
  }

  const mutation = useMutation({
    mutationFn: () => cambiarMetodoPago(venta!.id, metodoPago, metodoPago === "FIADO" ? clienteId : undefined),
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

  const faltaCliente = metodoPago === "FIADO" && !clienteId;

  return (
    <Modal open={!!venta} onClose={cerrar} title={`Corregir método de pago — ${venta?.cuentaNombre ?? ""}`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          Total de la venta: <span className="text-ink font-medium">{formatoMoneda(venta?.total ?? 0)}</span>
        </p>

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

        {error && <p className="text-sm text-rock-bright">{error}</p>}

        <Button
          fullWidth
          disabled={mutation.isPending || faltaCliente || metodoPago === venta?.metodoPagoActual}
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
