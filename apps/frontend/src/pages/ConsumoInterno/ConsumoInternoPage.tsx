import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { formatoMoneda } from "../../utils/format";
import { ApiError } from "../../services/api";
import { listarProductos, ProductoDTO } from "../../services/productoService";
import { listarIngredientes, IngredienteDTO } from "../../services/ingredienteService";
import { listarConsumoInterno, registrarConsumoInterno } from "../../services/consumoInternoService";

type Tipo = "producto" | "ingrediente";
type Seleccion = { tipo: Tipo; id: string; nombre: string; stock: number; unidad: string } | null;

function RegistrarModal({ seleccion, onClose }: { seleccion: Seleccion; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      registrarConsumoInterno(
        seleccion!.tipo === "producto" ? seleccion!.id : undefined,
        seleccion!.tipo === "ingrediente" ? seleccion!.id : undefined,
        Number(cantidad),
        motivo || undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "productos" });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "ingredientes" });
      queryClient.invalidateQueries({ queryKey: ["consumo-interno"] });
      setCantidad("");
      setMotivo("");
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo registrar"),
  });

  return (
    <Modal open={!!seleccion} onClose={onClose} title={`Consumo interno — ${seleccion?.nombre ?? ""}`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          Stock actual: {seleccion?.stock} {seleccion?.unidad.toLowerCase()}
        </p>
        <Input
          type="number"
          min={0}
          label="Cantidad"
          placeholder="1"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
        <Input
          label="Motivo (opcional)"
          placeholder="Ej: cortesía cliente frecuente"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        {error && <p className="text-sm text-rock-bright">{error}</p>}
        <Button
          fullWidth
          disabled={!cantidad || Number(cantidad) <= 0 || mutation.isPending}
          onClick={() => {
            setError(null);
            mutation.mutate();
          }}
        >
          {mutation.isPending ? "Registrando..." : "Registrar consumo"}
        </Button>
      </div>
    </Modal>
  );
}

export function ConsumoInternoPage() {
  const [tab, setTab] = useState<Tipo>("producto");
  const [busqueda, setBusqueda] = useState("");
  const [seleccion, setSeleccion] = useState<Seleccion>(null);

  const productosQuery = useQuery({ queryKey: ["productos", "activos-ci"], queryFn: () => listarProductos({ activo: true }) });
  const ingredientesQuery = useQuery({ queryKey: ["ingredientes", "todos"], queryFn: () => listarIngredientes() });
  const recientesQuery = useQuery({ queryKey: ["consumo-interno"], queryFn: () => listarConsumoInterno() });

  const productosFiltrados = useMemo(
    () =>
      (productosQuery.data ?? []).filter((p: ProductoDTO) =>
        p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
      ),
    [productosQuery.data, busqueda]
  );
  const ingredientesFiltrados = useMemo(
    () =>
      (ingredientesQuery.data ?? []).filter((i: IngredienteDTO) =>
        i.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
      ),
    [ingredientesQuery.data, busqueda]
  );

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">
          Consumo interno
        </h1>
        <p className="text-ink-muted text-sm mt-1">
          Para cuando el personal toma algo sin pagarlo — descuenta el inventario, sin mezclarse con las
          ventas reales
        </p>
      </header>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("producto")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "producto" ? "bg-rock text-ink" : "bg-surface-raised text-ink-muted hover:text-ink"
          }`}
        >
          Productos
        </button>
        <button
          onClick={() => setTab("ingrediente")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "ingrediente" ? "bg-rock text-ink" : "bg-surface-raised text-ink-muted hover:text-ink"
          }`}
        >
          Ingredientes
        </button>
      </div>

      <div className="mb-4 max-w-sm">
        <Input
          placeholder={tab === "producto" ? "Buscar producto..." : "Buscar ingrediente..."}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
        {tab === "producto"
          ? productosFiltrados.map((p) => (
              <button
                key={p.id}
                onClick={() =>
                  setSeleccion({ tipo: "producto", id: p.id, nombre: p.nombre, stock: p.stock, unidad: p.unidad })
                }
                className="text-left rounded-lg border border-border bg-surface-raised p-3 hover:border-rock transition-colors"
              >
                <p className="text-sm font-medium text-ink leading-tight">{p.nombre}</p>
                <p className="text-xs text-ink-muted mt-1">Stock: {p.stock}</p>
              </button>
            ))
          : ingredientesFiltrados.map((i) => (
              <button
                key={i.id}
                onClick={() =>
                  setSeleccion({ tipo: "ingrediente", id: i.id, nombre: i.nombre, stock: i.stock, unidad: i.unidad })
                }
                className="text-left rounded-lg border border-border bg-surface-raised p-3 hover:border-rock transition-colors"
              >
                <p className="text-sm font-medium text-ink leading-tight">{i.nombre}</p>
                <p className="text-xs text-ink-muted mt-1">
                  Stock: {i.stock} {i.unidad.toLowerCase()}
                </p>
              </button>
            ))}
      </div>

      <Card>
        <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-4">
          Registros recientes
        </h2>
        {recientesQuery.data?.length === 0 && (
          <p className="text-sm text-ink-muted">Todavía no hay consumo interno registrado.</p>
        )}
        <div className="flex flex-col gap-2">
          {recientesQuery.data?.slice(0, 20).map((m) => {
            const nombre = m.producto?.nombre ?? m.ingrediente?.nombre ?? "—";
            const costoUnitario = m.producto?.costo ?? m.ingrediente?.costoUnitario ?? 0;
            return (
              <div key={m.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                <div>
                  <p className="text-ink">
                    {m.cantidad}× {nombre}
                    {m.motivo ? ` — ${m.motivo}` : ""}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {m.usuario?.nombre ?? "Sin usuario"} ·{" "}
                    {new Date(m.fecha).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
                <span className="text-ink-muted">{formatoMoneda(costoUnitario * m.cantidad)}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <RegistrarModal seleccion={seleccion} onClose={() => setSeleccion(null)} />
    </div>
  );
}
