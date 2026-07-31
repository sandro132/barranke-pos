import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { ProductoDTO } from "../../services/productoService";

const CATEGORIAS = [
  { valor: "CERVEZA", etiqueta: "Cerveza" },
  { valor: "LICOR", etiqueta: "Licor" },
  { valor: "COMIDA", etiqueta: "Comida" },
  { valor: "COCTEL", etiqueta: "Cóctel" },
  { valor: "OTRO", etiqueta: "Otro" },
];

export interface ProductoFormValues {
  nombre: string;
  categoria: string;
  precio: string;
  costo: string;
  stock: string;
  unidad: string;
}

const VALORES_VACIOS: ProductoFormValues = {
  nombre: "",
  categoria: "CERVEZA",
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

  // Cada vez que se abre el modal, precarga los datos si es edición, o limpia si es creación.
  useEffect(() => {
    if (!open) return;
    if (productoEditando) {
      setValores({
        nombre: productoEditando.nombre,
        categoria: productoEditando.categoria,
        precio: String(productoEditando.precio),
        costo: String(productoEditando.costo),
        stock: String(productoEditando.stock),
        unidad: productoEditando.unidad,
      });
    } else {
      setValores(VALORES_VACIOS);
    }
  }, [open, productoEditando]);

  function actualizar<K extends keyof ProductoFormValues>(campo: K, valor: string) {
    setValores((prev) => ({ ...prev, [campo]: valor }));
  }

  const esValido =
    valores.nombre.trim() !== "" &&
    valores.unidad.trim() !== "" &&
    Number(valores.precio) > 0 &&
    Number(valores.costo) >= 0 &&
    Number(valores.stock) >= 0;

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
          <select
            value={valores.categoria}
            onChange={(e) => actualizar("categoria", e.target.value)}
            className="bg-surface border border-border rounded-md px-4 py-3 text-ink focus:border-rock transition-colors"
          >
            {CATEGORIAS.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.etiqueta}
              </option>
            ))}
          </select>
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
          {valores.categoria === "COMIDA" || valores.categoria === "COCTEL"
            ? "Si este producto usa receta (ingredientes), configúrala después de guardarlo, desde el botón \"Receta\"."
            : "El stock aquí se descuenta directo con cada venta (no usa receta)."}
        </p>

        {error && <p className="text-sm text-rock-bright">{error}</p>}

        <Button fullWidth disabled={!esValido || guardando} onClick={() => onSubmit(valores)}>
          {guardando ? "Guardando..." : productoEditando ? "Guardar cambios" : "Crear producto"}
        </Button>
      </div>
    </Modal>
  );
}
