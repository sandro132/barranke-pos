import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { cerrarEspacio, obtenerEspacio } from "../../services/espacioService";
import { listarPorEspacio, repetirUltimaRonda } from "../../services/pedidoService";
import { formatoMoneda } from "../../utils/format";

// TARJETA queda preparada en el backend pero no se ofrece todavía como opción
// (según el pedido original: "preparado para tarjetas en el futuro").
const METODOS_PAGO = [
  { valor: "EFECTIVO", etiqueta: "Efectivo" },
  { valor: "TRANSFERENCIA_BANCOLOMBIA", etiqueta: "Transferencia Bancolombia" },
  { valor: "NEQUI", etiqueta: "Nequi" },
  { valor: "DAVIPLATA", etiqueta: "Daviplata" },
  { valor: "OTRO", etiqueta: "Otro" },
];

export function MesaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [modalCierreAbierto, setModalCierreAbierto] = useState(false);
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");

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
    mutationFn: (metodo?: string) => cerrarEspacio(id!, metodo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["espacios"] });
      queryClient.invalidateQueries({ queryKey: ["espacio", id] });
      queryClient.invalidateQueries({ queryKey: ["pedidos", "espacio", id] });
      queryClient.invalidateQueries({ queryKey: ["caja", "actual"] });
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
          onClick={() => {
            if (espacio.totalConsumido === 0) {
              cerrarMutation.mutate(undefined);
            } else {
              setModalCierreAbierto(true);
            }
          }}
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

      <Modal
        open={modalCierreAbierto}
        onClose={() => setModalCierreAbierto(false)}
        title="Cerrar mesa"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-ink-muted text-sm">Total a cobrar</span>
            <span className="font-display text-2xl font-bold text-ink">
              {formatoMoneda(espacio.totalConsumido)}
            </span>
          </div>

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
          </div>

          {cerrarMutation.isError && (
            <p className="text-sm text-rock-bright">No se pudo cerrar la mesa. Intenta de nuevo.</p>
          )}

          <Button
            fullWidth
            disabled={cerrarMutation.isPending}
            onClick={() => cerrarMutation.mutate(metodoPago)}
          >
            {cerrarMutation.isPending ? "Cerrando..." : "Confirmar cierre"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
