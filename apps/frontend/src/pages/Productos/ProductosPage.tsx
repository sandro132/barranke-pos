import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { formatoMoneda } from "../../utils/format";
import {
  actualizarProducto,
  crearProducto,
  desactivarProducto,
  listarProductos,
  ProductoDTO,
  reactivarProducto,
} from "../../services/productoService";
import { ApiError } from "../../services/api";
import { ProductoFormModal, ProductoFormValues } from "./ProductoFormModal";
import { RecetaModal } from "./RecetaModal";
import { CategoriasModal } from "./CategoriasModal";

export function ProductosPage() {
  const queryClient = useQueryClient();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalCategoriasAbierto, setModalCategoriasAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState<ProductoDTO | null>(null);
  const [productoReceta, setProductoReceta] = useState<ProductoDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  // Trae todos, activos e inactivos, para poder reactivarlos desde acá.
  const productosQuery = useQuery({ queryKey: ["productos", "gestion"], queryFn: () => listarProductos() });

  const productosFiltrados = (productosQuery.data ?? []).filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
  );

  function invalidarProductos() {
    queryClient.invalidateQueries({
      predicate: (q) => q.queryKey[0] === "productos",
    });
  }

  const crearMutation = useMutation({
    mutationFn: (valores: ProductoFormValues) =>
      crearProducto({
        nombre: valores.nombre,
        categoriaId: valores.categoriaId,
        precio: Number(valores.precio),
        costo: Number(valores.costo),
        stock: Number(valores.stock),
        unidad: valores.unidad,
      }),
    onSuccess: () => {
      invalidarProductos();
      setModalAbierto(false);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo crear el producto"),
  });

  const actualizarMutation = useMutation({
    mutationFn: (valores: ProductoFormValues) =>
      actualizarProducto(productoEditando!.id, {
        nombre: valores.nombre,
        categoriaId: valores.categoriaId,
        precio: Number(valores.precio),
        costo: Number(valores.costo),
        stock: Number(valores.stock),
        unidad: valores.unidad,
      }),
    onSuccess: () => {
      invalidarProductos();
      setModalAbierto(false);
      setProductoEditando(null);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo actualizar el producto"),
  });

  const desactivarMutation = useMutation({
    mutationFn: (id: string) => desactivarProducto(id),
    onSuccess: invalidarProductos,
  });

  const reactivarMutation = useMutation({
    mutationFn: (id: string) => reactivarProducto(id),
    onSuccess: invalidarProductos,
  });

  function abrirCrear() {
    setError(null);
    setProductoEditando(null);
    setModalAbierto(true);
  }

  function abrirEditar(producto: ProductoDTO) {
    setError(null);
    setProductoEditando(producto);
    setModalAbierto(true);
  }

  return (
    <div className="p-8">
      <header className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">Productos</h1>
          <p className="text-ink-muted text-sm mt-1">Catálogo completo — categorías 100% editables</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setModalCategoriasAbierto(true)}>
            Categorías
          </Button>
          <Button onClick={abrirCrear}>+ Nuevo producto</Button>
        </div>
      </header>

      {productosQuery.isLoading ? (
        <p className="text-sm text-ink-muted">Cargando...</p>
      ) : (
        <>
          <div className="mb-4 max-w-sm">
            <Input
              placeholder="Buscar producto por nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          {productosFiltrados.length === 0 && (
            <p className="text-sm text-ink-muted">No hay productos que coincidan con "{busqueda}".</p>
          )}
          <div className="flex flex-col gap-2">
            {productosFiltrados.map((p) => (
            <Card key={p.id} className={!p.activo ? "opacity-50" : ""}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{p.nombre}</p>
                    <span className="text-xs text-ink-muted bg-surface-raised px-2 py-0.5 rounded">
                      {p.categoria.nombre}
                    </span>
                    <span className="text-xs text-ink-muted">{p.codigoInterno}</span>
                  </div>
                  <p className="text-xs text-ink-muted mt-1">
                    Precio {formatoMoneda(p.precio)} · Costo {formatoMoneda(p.costo)} · Stock {p.stock}{" "}
                    {p.unidad}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setProductoReceta(p)}>
                    Receta
                  </Button>
                  <Button variant="secondary" onClick={() => abrirEditar(p)}>
                    Editar
                  </Button>
                  {p.activo ? (
                    <Button
                      variant="secondary"
                      className="text-rock-bright"
                      onClick={() => desactivarMutation.mutate(p.id)}
                      disabled={desactivarMutation.isPending}
                    >
                      Desactivar
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => reactivarMutation.mutate(p.id)}
                      disabled={reactivarMutation.isPending}
                    >
                      Reactivar
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
        </>
      )}

      <ProductoFormModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        productoEditando={productoEditando}
        guardando={crearMutation.isPending || actualizarMutation.isPending}
        error={error}
        onSubmit={(valores) => {
          setError(null);
          if (productoEditando) {
            actualizarMutation.mutate(valores);
          } else {
            crearMutation.mutate(valores);
          }
        }}
      />

      <RecetaModal producto={productoReceta} onClose={() => setProductoReceta(null)} />
      <CategoriasModal open={modalCategoriasAbierto} onClose={() => setModalCategoriasAbierto(false)} />
    </div>
  );
}
