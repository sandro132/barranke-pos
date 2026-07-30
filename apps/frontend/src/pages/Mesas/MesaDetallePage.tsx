import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { cerrarEspacio, obtenerEspacio } from "../../services/espacioService";
import { listarPorEspacio, repetirUltimaRonda } from "../../services/pedidoService";
import { formatoMoneda } from "../../utils/format";

export function MesaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const espacioQuery = useQuery({
    queryKey: ["espacio", id],
    queryFn: () => obtenerEspacio(id!),
    enabled: !!id,
    refetchInterval: 30_000, // refresca el tiempo abierta cada 30s
  });

  const pedidosQuery = useQuery({
    queryKey: ["pedidos", "espacio", id],
    queryFn: () => listarPorEspacio(id!),
    enabled: !!id,
  });

  const cerrarMutation = useMutation({
    mutationFn: () => cerrarEspacio(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["espacios"] });
      queryClient.invalidateQueries({ queryKey: ["espacio", id] });
      queryClient.invalidateQueries({ queryKey: ["pedidos", "espacio", id] });
      navigate("/mesas");
    },
  });

  const repetirMutation = useMutation({
    mutationFn: () => repetirUltimaRonda(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos", "espacio", id] });
      queryClient.invalidateQueries({ queryKey: ["espacio", id] });
    },
  });

  if (espacioQuery.isLoading) {
    return <div className="p-8 text-ink-muted text-sm">Cargando...</div>;
  }

  const espacio = espacioQuery.data;
  if (!espacio) {
    return <div className="p-8 text-ink-muted text-sm">Espacio no encontrado.</div>;
  }

  return (
    <div className="p-8">
      <button
        onClick={() => navigate("/mesas")}
        className="text-sm text-ink-muted hover:text-ink mb-4"
      >
        ← Volver a Mesas y Barras
      </button>

      <header className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">
            {espacio.nombre}
          </h1>
          <p className="text-ink-muted text-sm mt-1">
            Abierta hace {espacio.tiempoAbiertaMinutos} min
            {espacio.descripcion ? ` · ${espacio.descripcion}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-muted uppercase tracking-wide">Total consumido</p>
          <p className="font-display text-3xl font-bold text-ink">
            {formatoMoneda(espacio.totalConsumido)}
          </p>
        </div>
      </header>

      <div className="flex gap-3 mb-8">
        <Button
          variant="secondary"
          onClick={() => repetirMutation.mutate()}
          disabled={repetirMutation.isPending || pedidosQuery.data?.length === 0}
        >
          {repetirMutation.isPending ? "Repitiendo..." : "Repetir última ronda"}
        </Button>
        <Button
          variant="secondary"
          className="border-rock text-rock-bright hover:bg-rock-dim/20"
          onClick={() => cerrarMutation.mutate()}
          disabled={cerrarMutation.isPending}
        >
          {cerrarMutation.isPending ? "Cerrando..." : "Cerrar mesa"}
        </Button>
        <Button onClick={() => navigate(`/mesas/${id}/pedido`)}>+ Agregar productos</Button>
      </div>

      <Card>
        <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-4">
          Pedidos de esta sesión
        </h2>

        {pedidosQuery.isLoading && <p className="text-sm text-ink-muted">Cargando pedidos...</p>}

        {pedidosQuery.data?.length === 0 && (
          <p className="text-sm text-ink-muted">Todavía no se ha enviado ningún pedido a esta mesa.</p>
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
                    <span className="text-ink">
                      {item.cantidad}× {item.producto.nombre}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-ink-muted">
                        {formatoMoneda(item.precioUnitario * item.cantidad)}
                      </span>
                      <Badge estado={item.estado} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
