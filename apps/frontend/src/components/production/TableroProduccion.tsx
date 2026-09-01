import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ItemPedidoDTO, actualizarEstadoItem } from "../../services/pedidoService";
import { usePedidoRealtime } from "../../hooks/usePedidoRealtime";
import { useAlertaProduccion } from "../../hooks/useAlertaProduccion";
import { Button } from "../ui/Button";
import { ItemProduccionCard } from "./ItemProduccionCard";

const COLUMNAS = [
  { estado: "PENDIENTE", titulo: "Pendiente" },
  { estado: "PREPARANDO", titulo: "Preparando" },
  { estado: "LISTO", titulo: "Listo" },
];

export function TableroProduccion({
  titulo,
  area,
  queryKey,
  queryFn,
  terminarTodosFn,
}: {
  titulo: string;
  area: "COCINA" | "BARRA";
  queryKey: string[];
  queryFn: () => Promise<ItemPedidoDTO[]>;
  terminarTodosFn: () => Promise<{ actualizados: number }>;
}) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey, queryFn });

  usePedidoRealtime([queryKey]);
  const { permisoConcedido, activarAlertas } = useAlertaProduccion(area);

  const cambiarEstadoMutation = useMutation({
    mutationFn: ({ itemId, estado }: { itemId: string; estado: string }) =>
      actualizarEstadoItem(itemId, estado),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      // El total consumido y el estado de la mesa pueden cambiar (ítems entregados).
      queryClient.invalidateQueries({ queryKey: ["cuentas"] });
    },
  });

  const terminarTodosMutation = useMutation({
    mutationFn: terminarTodosFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["cuentas"] });
    },
  });

  return (
    <div className="p-8 h-screen flex flex-col">
      <header className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">
            {titulo}
          </h1>
          <p className="text-ink-muted text-sm mt-1">Se actualiza solo, en tiempo real</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!permisoConcedido && (
            <Button variant="secondary" onClick={activarAlertas}>
              🔔 Activar alertas de sonido
            </Button>
          )}
          {(data?.length ?? 0) > 0 && (
            <Button
              variant="secondary"
              disabled={terminarTodosMutation.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `¿Marcar como entregados todos los ${data?.length} pedidos pendientes de ${titulo}? No se puede deshacer uno por uno después.`
                  )
                ) {
                  terminarTodosMutation.mutate();
                }
              }}
            >
              {terminarTodosMutation.isPending ? "Terminando..." : "Terminar todos"}
            </Button>
          )}
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden">
          {COLUMNAS.map((col) => {
            const items = (data ?? []).filter((i) => i.estado === col.estado);
            return (
              <div key={col.estado} className="flex flex-col overflow-hidden">
                <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-3 flex items-center gap-2">
                  {col.titulo}
                  <span className="bg-surface-raised text-ink-muted text-xs rounded-full px-2 py-0.5">
                    {items.length}
                  </span>
                </h2>
                <div className="flex flex-col gap-3 overflow-y-auto pr-1">
                  {items.length === 0 && (
                    <p className="text-sm text-ink-muted/60">Nada aquí por ahora</p>
                  )}
                  {items.map((item) => (
                    <ItemProduccionCard
                      key={item.id}
                      item={item}
                      onCambiarEstado={(itemId, estado) =>
                        cambiarEstadoMutation.mutate({ itemId, estado })
                      }
                      cambiandoEstado={cambiarEstadoMutation.isPending}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
