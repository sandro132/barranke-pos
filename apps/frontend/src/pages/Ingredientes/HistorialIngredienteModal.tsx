import { useQuery } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import { IngredienteDTO, obtenerMovimientosIngrediente } from "../../services/ingredienteService";

export function HistorialIngredienteModal({
  ingrediente,
  onClose,
}: {
  ingrediente: IngredienteDTO | null;
  onClose: () => void;
}) {
  const { data: movimientos, isLoading } = useQuery({
    queryKey: ["ingredientes", "movimientos", ingrediente?.id],
    queryFn: () => obtenerMovimientosIngrediente(ingrediente!.id),
    enabled: !!ingrediente,
  });

  return (
    <Modal open={!!ingrediente} onClose={onClose} title={`Historial — ${ingrediente?.nombre ?? ""}`}>
      {isLoading ? (
        <p className="text-sm text-ink-muted">Cargando...</p>
      ) : movimientos?.length === 0 ? (
        <p className="text-sm text-ink-muted">Sin movimientos registrados todavía.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {movimientos?.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
              <div>
                <Badge estado={m.tipo} />
                <p className="text-xs text-ink-muted mt-1">{m.motivo}</p>
                <p className="text-xs text-ink-muted/70">
                  {new Date(m.fecha).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                </p>
              </div>
              <span className="text-ink">
                {m.tipo === "SALIDA" || m.tipo === "VENTA" ? "-" : "+"}
                {m.cantidad} {ingrediente?.unidad.toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
