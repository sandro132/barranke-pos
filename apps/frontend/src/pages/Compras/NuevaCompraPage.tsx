import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { formatoMoneda } from "../../utils/format";
import { listarProductos, ProductoDTO } from "../../services/productoService";
import { listarIngredientes, IngredienteDTO } from "../../services/ingredienteService";
import { listarProveedores } from "../../services/proveedorService";
import { crearCompra } from "../../services/compraService";
import { ApiError } from "../../services/api";

type Tipo = "producto" | "ingrediente";

interface ItemCarritoCompra {
  tipo: Tipo;
  id: string;
  nombre: string;
  cantidad: string;
  costoUnitario: string;
}

export function NuevaCompraPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tipo>("producto");
  const [proveedorId, setProveedorId] = useState("");
  const [factura, setFactura] = useState("");
  const [carrito, setCarrito] = useState<Record<string, ItemCarritoCompra>>({});
  const [error, setError] = useState<string | null>(null);

  const proveedoresQuery = useQuery({ queryKey: ["proveedores"], queryFn: listarProveedores });

  const productosQuery = useQuery({
    queryKey: ["productos", "todos"],
    queryFn: () => listarProductos(),
  });
  const ingredientesQuery = useQuery({
    queryKey: ["ingredientes", "todos"],
    queryFn: () => listarIngredientes(),
  });

  const items = Object.values(carrito);
  const total = items.reduce((sum, i) => sum + (Number(i.cantidad) || 0) * (Number(i.costoUnitario) || 0), 0);

  function agregarProducto(p: ProductoDTO) {
    const key = `producto-${p.id}`;
    setCarrito((prev) => ({
      ...prev,
      [key]: prev[key] ?? {
        tipo: "producto",
        id: p.id,
        nombre: p.nombre,
        cantidad: "1",
        costoUnitario: String(p.costo),
      },
    }));
  }

  function agregarIngrediente(i: IngredienteDTO) {
    const key = `ingrediente-${i.id}`;
    setCarrito((prev) => ({
      ...prev,
      [key]: prev[key] ?? {
        tipo: "ingrediente",
        id: i.id,
        nombre: i.nombre,
        cantidad: "1",
        costoUnitario: "0",
      },
    }));
  }

  function actualizarItem(key: string, campo: "cantidad" | "costoUnitario", valor: string) {
    setCarrito((prev) => ({ ...prev, [key]: { ...prev[key], [campo]: valor } }));
  }

  function quitarItem(key: string) {
    setCarrito((prev) => {
      const { [key]: _omitido, ...resto } = prev;
      return resto;
    });
  }

  const itemsValidos = items.every(
    (i) => Number(i.cantidad) > 0 && Number(i.costoUnitario) >= 0 && i.cantidad !== "" && i.costoUnitario !== ""
  );

  const crearMutation = useMutation({
    mutationFn: () =>
      crearCompra(
        proveedorId,
        factura.trim() ? factura.trim() : undefined,
        items.map((i) => ({
          productoId: i.tipo === "producto" ? i.id : undefined,
          ingredienteId: i.tipo === "ingrediente" ? i.id : undefined,
          cantidad: Number(i.cantidad),
          costoUnitario: Number(i.costoUnitario),
        }))
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras"] });
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "productos" || q.queryKey[0] === "ingredientes",
      });
      navigate("/compras");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo registrar la compra"),
  });

  const [busqueda, setBusqueda] = useState("");

  const productosDisponibles = useMemo(
    () =>
      (productosQuery.data ?? [])
        .filter((p) => !carrito[`producto-${p.id}`])
        .filter((p) => p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())),
    [productosQuery.data, carrito, busqueda]
  );
  const ingredientesDisponibles = useMemo(
    () =>
      (ingredientesQuery.data ?? [])
        .filter((i) => !carrito[`ingrediente-${i.id}`])
        .filter((i) => i.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())),
    [ingredientesQuery.data, carrito, busqueda]
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen">
      {/* Catálogo */}
      <div className="flex-1 overflow-y-auto p-6">
        <button
          onClick={() => navigate("/compras")}
          className="text-sm text-ink-muted hover:text-ink mb-4"
        >
          ← Volver a Compras
        </button>

        <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink mb-4">
          Nueva compra
        </h1>

        <div className="flex gap-2 mb-6">
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

        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {tab === "producto"
            ? productosDisponibles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => agregarProducto(p)}
                  className="text-left rounded-lg border border-border bg-surface-raised p-3 hover:border-rock transition-colors"
                >
                  <p className="text-sm font-medium text-ink leading-tight">{p.nombre}</p>
                  <p className="text-xs text-ink-muted mt-1">
                    Stock: {p.stock} · Costo: {formatoMoneda(p.costo)}
                  </p>
                </button>
              ))
            : ingredientesDisponibles.map((i) => (
                <button
                  key={i.id}
                  onClick={() => agregarIngrediente(i)}
                  className="text-left rounded-lg border border-border bg-surface-raised p-3 hover:border-rock transition-colors"
                >
                  <p className="text-sm font-medium text-ink leading-tight">{i.nombre}</p>
                  <p className="text-xs text-ink-muted mt-1">
                    Stock actual: {i.stock} {i.unidad.toLowerCase()}
                  </p>
                </button>
              ))}
        </div>
      </div>

      {/* Carrito de compra */}
      <div className="w-full lg:w-[28rem] shrink-0 bg-surface border-t lg:border-t-0 lg:border-l border-border flex flex-col">
        <div className="p-5 border-b border-border flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-muted">Proveedor</label>
            {proveedoresQuery.data?.length === 0 ? (
              <p className="text-xs text-rock-bright">
                No hay proveedores creados todavía. Ve a Compras → "Proveedores" para crear uno primero.
              </p>
            ) : (
              <select
                value={proveedorId}
                onChange={(e) => setProveedorId(e.target.value)}
                className="bg-surface border border-border rounded-md px-4 py-3 text-ink focus:border-rock transition-colors"
              >
                <option value="">Selecciona un proveedor...</option>
                {proveedoresQuery.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>
          <Input
            label="Factura (opcional)"
            placeholder="Ej: FV-00123"
            value={factura}
            onChange={(e) => setFactura(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <p className="text-sm text-ink-muted">Agrega productos o ingredientes a la compra.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((item) => {
                const key = `${item.tipo}-${item.id}`;
                return (
                  <li key={key} className="border border-border rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-ink">{item.nombre}</p>
                      <button
                        onClick={() => quitarItem(key)}
                        className="text-ink-muted hover:text-rock-bright text-lg leading-none"
                        aria-label={`Quitar ${item.nombre}`}
                      >
                        ×
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        min={0}
                        label="Cantidad"
                        value={item.cantidad}
                        onChange={(e) => actualizarItem(key, "cantidad", e.target.value)}
                      />
                      <Input
                        type="number"
                        min={0}
                        label="Costo unitario"
                        value={item.costoUnitario}
                        onChange={(e) => actualizarItem(key, "costoUnitario", e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-ink-muted mt-2 text-right">
                      Subtotal: {formatoMoneda((Number(item.cantidad) || 0) * (Number(item.costoUnitario) || 0))}
                    </p>
                  </li>
                );
              })}
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
            disabled={items.length === 0 || !proveedorId || !itemsValidos || crearMutation.isPending}
            onClick={() => {
              setError(null);
              crearMutation.mutate();
            }}
          >
            {crearMutation.isPending ? "Registrando..." : "Registrar compra"}
          </Button>
        </div>
      </div>
    </div>
  );
}
