import { ItemPedidoDTO } from "../../services/pedidoService";
import { Button } from "../ui/Button";

const SIGUIENTE_ESTADO: Record<string, { estado: string; etiqueta: string } | null> = {
  PENDIENTE: { estado: "PREPARANDO", etiqueta: "Empezar a preparar" },
  PREPARANDO: { estado: "LISTO", etiqueta: "Marcar listo" },
  LISTO: { estado: "ENTREGADO", etiqueta: "Entregado ✓" },
};

function minutosTranscurridos(fechaIso: string) {
  return Math.floor((Date.now() - new Date(fechaIso).getTime()) / 60000);
}

export function ItemProduccionCard({
  item,
  onCambiarEstado,
  cambiandoEstado,
}: {
  item: ItemPedidoDTO;
  onCambiarEstado: (itemId: string, estado: string) => void;
  cambiandoEstado: boolean;
}) {
  const minutos = item.pedido ? minutosTranscurridos(item.pedido.createdAt) : 0;
  const urgente = item.estado === "PENDIENTE" && minutos >= 10;
  const siguiente = SIGUIENTE_ESTADO[item.estado];

  return (
    <div
      className={`rounded-lg border p-4 flex flex-col gap-2 ${
        urgente ? "border-rock bg-rock-dim/20" : "border-border bg-surface-raised"
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-display font-semibold text-ink text-lg leading-tight">
            {item.cantidad}× {item.producto.nombre}
          </p>
          <p className="text-xs text-ink-muted mt-1">{item.pedido?.espacio.nombre}</p>
        </div>
        <span className={`text-xs font-medium ${urgente ? "text-rock-bright" : "text-ink-muted"}`}>
          hace {minutos} min
        </span>
      </div>

      {item.notas && (
        <p className="text-xs text-ink bg-surface rounded px-2 py-1.5 border border-border">
          {item.notas}
        </p>
      )}

      {siguiente && (
        <Button
          className="mt-1"
          onClick={() => onCambiarEstado(item.id, siguiente.estado)}
          disabled={cambiandoEstado}
        >
          {siguiente.etiqueta}
        </Button>
      )}
    </div>
  );
}
