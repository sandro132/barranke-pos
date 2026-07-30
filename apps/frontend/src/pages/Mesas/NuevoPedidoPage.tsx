import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { obtenerEspacio } from "../../services/espacioService";
import { crearPedido } from "../../services/pedidoService";
import { listarProductos, ProductoDTO } from "../../services/productoService";
import { ApiError } from "../../services/api";
import { formatoMoneda } from "../../utils/format";

const CATEGORIAS: { valor: string; etiqueta: string }[] = [
  { valor: "CERVEZA", etiqueta: "Cervezas" },
  { valor: "LICOR", etiqueta: "Licores" },
  { valor: "COMIDA", etiqueta: "Comida" },
  { valor: "COCTEL", etiqueta: "Cócteles" },
  { valor: "OTRO", etiqueta: "Otros" },
];

interface ItemCarrito {
  producto: ProductoDTO;
  cantidad: number;
}

function ProductoBoton({ producto, cantidad, onSumar, onRestar }: {
  producto: ProductoDTO;
  cantidad: number;
  onSumar: () => void;
  onRestar: () => void;
}) {
  return (
    <div
      className={`rounded-lg border p-3 flex flex-col gap-2 transition-colors ${
        cantidad > 0 ? "border-rock bg-rock-dim/15" : "border-border bg-surface-raised"
      }`}
    >
      <button onClick={onSumar} className="text-left flex-1">
        <p className="text-sm font-medium text-ink leading-tight">{producto.nombre}</p>
        <p className="text-xs text-ink-muted mt-1">{formatoMoneda(producto.precio)}</p>
      </button>

      {cantidad > 0 && (
        <div className="flex items-center justify-between">
          <button
            onClick={onRestar}
            className="w-8 h-8 rounded-md bg-surface border border-border text-ink font-bold flex items-center justify-center hover:border-rock"
            aria-label={`Quitar una unidad de ${producto.nombre}`}
          >
            −
          </button>
          <span className="font-display font-bold text-ink text-lg">{cantidad}</span>
          <button
            onClick={onSumar}
            className="w-8 h-8 rounded-md bg-rock text-ink font-bold flex items-center justify-center hover:bg-rock-bright"
            aria-label={`Agregar una unidad de ${producto.nombre}`}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

export function NuevoPedidoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [categoriaActiva, setCategoriaActiva] = useState("CERVEZA");
  const [carrito, setCarrito] = useState<Record<string, ItemCarrito>>({});
  const [error, setError] = useState<string | null>(null);

  const espacioQuery = useQuery({
    queryKey: ["espacio", id],
    queryFn: () => obtenerEspacio(id!),
    enabled: !!id,
  });

  const productosQuery = useQuery({
    queryKey: ["productos", "activos"],
    queryFn: () => listarProductos({ activo: true }),
  });

  const categoriasConProductos = useMemo(() => {
    if (!productosQuery.data) return CATEGORIAS;
    const disponibles = new Set(productosQuery.data.map((p) => p.categoria));
    return CATEGORIAS.filter((c) => disponibles.has(c.valor));
  }, [productosQuery.data]);

  const productosDeCategoria = useMemo(
    () => (productosQuery.data ?? []).filter((p) => p.categoria === categoriaActiva),
    [productosQuery.data, categoriaActiva]
  );

  const items = Object.values(carrito);
  const total = items.reduce((sum, i) => sum + i.producto.precio * i.cantidad, 0);
  const cantidadTotal = items.reduce((sum, i) => sum + i.cantidad, 0);

  function sumar(producto: ProductoDTO) {
    setCarrito((prev) => {
      const actual = prev[producto.id];
      return {
        ...prev,
        [producto.id]: { producto, cantidad: (actual?.cantidad ?? 0) + 1 },
      };
    });
  }

  function restar(producto: ProductoDTO) {
    setCarrito((prev) => {
      const actual = prev[producto.id];
      if (!actual) return prev;
      if (actual.cantidad <= 1) {
        const { [producto.id]: _omitido, ...resto } = prev;
        return resto;
      }
      return { ...prev, [producto.id]: { producto, cantidad: actual.cantidad - 1 } };
    });
  }

  const enviarMutation = useMutation({
    mutationFn: () =>
      crearPedido(
        id!,
        items.map((i) => ({ productoId: i.producto.id, cantidad: i.cantidad }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pedidos", "espacio", id] });
      queryClient.invalidateQueries({ queryKey: ["espacio", id] });
      queryClient.invalidateQueries({ queryKey: ["espacios"] });
      navigate(`/mesas/${id}`);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "No se pudo enviar el pedido");
    },
  });

  return (
    <div className="flex flex-col lg:flex-row h-screen">
      {/* Catálogo */}
      <div className="flex-1 overflow-y-auto p-6">
        <button
          onClick={() => navigate(`/mesas/${id}`)}
          className="text-sm text-ink-muted hover:text-ink mb-4"
        >
          ← Volver a {espacioQuery.data?.nombre ?? "la mesa"}
        </button>

        <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink mb-4">
          Nuevo pedido — {espacioQuery.data?.nombre}
        </h1>

        <div className="flex gap-2 mb-6 flex-wrap">
          {categoriasConProductos.map((c) => (
            <button
              key={c.valor}
              onClick={() => setCategoriaActiva(c.valor)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                categoriaActiva === c.valor
                  ? "bg-rock text-ink"
                  : "bg-surface-raised text-ink-muted hover:text-ink"
              }`}
            >
              {c.etiqueta}
            </button>
          ))}
        </div>

        {productosQuery.isLoading ? (
          <p className="text-sm text-ink-muted">Cargando productos...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {productosDeCategoria.map((p) => (
              <ProductoBoton
                key={p.id}
                producto={p}
                cantidad={carrito[p.id]?.cantidad ?? 0}
                onSumar={() => sumar(p)}
                onRestar={() => restar(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Carrito */}
      <div className="w-full lg:w-96 shrink-0 bg-surface border-t lg:border-t-0 lg:border-l border-border flex flex-col">
        <div className="p-5 border-b border-border">
          <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted">
            Pedido ({cantidadTotal} {cantidadTotal === 1 ? "producto" : "productos"})
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <p className="text-sm text-ink-muted">Toca un producto para agregarlo al pedido.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <li key={item.producto.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink">
                    {item.cantidad}× {item.producto.nombre}
                  </span>
                  <span className="text-ink-muted">
                    {formatoMoneda(item.producto.precio * item.cantidad)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-5 border-t border-border">
          {error && (
            <div className="bg-rock-dim/30 border border-rock text-ink text-sm rounded-md px-3 py-2 mb-3">
              {error}
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <span className="text-ink-muted text-sm">Total</span>
            <span className="font-display text-2xl font-bold text-ink">{formatoMoneda(total)}</span>
          </div>
          <Button
            fullWidth
            disabled={items.length === 0 || enviarMutation.isPending}
            onClick={() => {
              setError(null);
              enviarMutation.mutate();
            }}
          >
            {enviarMutation.isPending ? "Enviando..." : "Enviar pedido"}
          </Button>
        </div>
      </div>
    </div>
  );
}
