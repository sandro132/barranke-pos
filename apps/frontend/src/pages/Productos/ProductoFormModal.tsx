import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { ProductoDTO } from "../../services/productoService";
import { listarCategorias } from "../../services/categoriaService";

export interface ProductoFormValues {
  nombre: string;
  categoriaId: string;
  precio: string;
  costo: string;
  stock: string;
  unidad: string;
}

const VALORES_VACIOS: ProductoFormValues = {
  nombre: "",
  categoriaId: "",
  precio: "",
  costo: "",
  stock: "0",
  unidad: "unidad",
};

export function ProductoFormModal({
  open,
  onClose,
  onSubmit,
  productoEditando,
  guardando,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (valores: ProductoFormValues) => void;
  productoEditando: ProductoDTO | null;
  guardando: boolean;
  error: string | null;
}) {
  const [valores, setValores] = useState<ProductoFormValues>(VALORES_VACIOS);

  const categoriasQuery = useQuery({
    queryKey: ["categorias"],
    queryFn: listarCategorias,
    enabled: open,
  });

  // Cada vez que se abre el modal, precarga los datos si es edición, o limpia si es creación.
  useEffect(() => {
    if (!open) return;
    if (productoEditando) {
      setValores({
        nombre: productoEditando.nombre,
        categoriaId: productoEditando.categoriaId,
        precio: String(productoEditando.precio),
        costo: String(productoEditando.costo),
        stock: String(productoEditando.stock),
        unidad: productoEditando.unidad,
      });
    } else {
      setValores(VALORES_VACIOS);
    }
  }, [open, productoEditando]);

  // Si es un producto nuevo y todavía no hay categoría elegida, preselecciona
  // la primera de la lista en cuanto llega — para no dejar el select vacío.
  useEffect(() => {
    if (!productoEditando && !valores.categoriaId && categoriasQuery.data?.length) {
      setValores((prev) => ({ ...prev, categoriaId: categoriasQuery.data[0].id }));
    }
  }, [categoriasQuery.data, productoEditando, valores.categoriaId]);

  function actualizar<K extends keyof ProductoFormValues>(campo: K, valor: string) {
    setValores((prev) => ({ ...prev, [campo]: valor }));
  }

  const esValido =
    valores.nombre.trim() !== "" &&
    valores.categoriaId !== "" &&
    valores.unidad.trim() !== "" &&
    Number(valores.precio) > 0 &&
    Number(valores.costo) >= 0 &&
    Number(valores.stock) >= 0;

  const categoriaSeleccionada = categoriasQuery.data?.find((c) => c.id === valores.categoriaId);

  return (
    <Modal open={open} onClose={onClose} title={productoEditando ? "Editar producto" : "Nuevo producto"}>
      <div className="flex flex-col gap-4">
        <Input
          label="Nombre"
          placeholder="Ej: Gin"
          value={valores.nombre}
          onChange={(e) => actualizar("nombre", e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-muted">Categoría</label>
          {categoriasQuery.data?.length === 0 ? (
            <p className="text-xs text-rock-bright">
              No hay categorías creadas todavía. Usa el botón "Categorías" en la pantalla anterior para
              crear una primero.
            </p>
          ) : (
            <select
              value={valores.categoriaId}
              onChange={(e) => actualizar("categoriaId", e.target.value)}
              className="bg-surface border border-border rounded-md px-4 py-3 text-ink focus:border-rock transition-colors"
            >
              {categoriasQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            min={0}
            label="Precio de venta"
            placeholder="8000"
            value={valores.precio}
            onChange={(e) => actualizar("precio", e.target.value)}
          />
          <Input
            type="number"
            min={0}
            label="Costo"
            placeholder="4000"
            value={valores.costo}
            onChange={(e) => actualizar("costo", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            min={0}
            label="Stock inicial"
            placeholder="0"
            value={valores.stock}
            onChange={(e) => actualizar("stock", e.target.value)}
          />
          <Input
            label="Unidad"
            placeholder="botella, unidad..."
            value={valores.unidad}
            onChange={(e) => actualizar("unidad", e.target.value)}
          />
        </div>

        <p className="text-xs text-ink-muted">
          {categoriaSeleccionada?.areaPreparacion === "COCINA" ||
          categoriaSeleccionada?.areaPreparacion === "BARRA"
            ? `Los pedidos de esta categoría van a la pantalla de ${
                categoriaSeleccionada.areaPreparacion === "COCINA" ? "Cocina" : "Barra"
              }. Si este producto usa receta (ingredientes), configúrala después de guardarlo, desde el botón "Receta".`
            : "Esta categoría se sirve directo (no pasa por cocina/barra). El stock se descuenta directo con cada venta."}
        </p>

        {error && <p className="text-sm text-rock-bright">{error}</p>}

        <Button fullWidth disabled={!esValido || guardando} onClick={() => onSubmit(valores)}>
          {guardando ? "Guardando..." : productoEditando ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>
    </Modal>
  );
}
