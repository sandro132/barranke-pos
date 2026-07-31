import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { IngredienteDTO } from "../../services/ingredienteService";

const UNIDADES = [
  { valor: "UNIDAD", etiqueta: "Unidad" },
  { valor: "GRAMO", etiqueta: "Gramo" },
  { valor: "KILOGRAMO", etiqueta: "Kilogramo" },
  { valor: "MILILITRO", etiqueta: "Mililitro" },
  { valor: "LITRO", etiqueta: "Litro" },
  { valor: "ONZA", etiqueta: "Onza" },
  { valor: "BOTELLA", etiqueta: "Botella" },
];

export interface IngredienteFormValues {
  nombre: string;
  unidad: string;
  stock: string;
  stockMinimo: string;
  costoUnitario: string;
}

const VALORES_VACIOS: IngredienteFormValues = {
  nombre: "",
  unidad: "GRAMO",
  stock: "0",
  stockMinimo: "0",
  costoUnitario: "0",
};

export function IngredienteFormModal({
  open,
  onClose,
  onSubmit,
  ingredienteEditando,
  guardando,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (valores: IngredienteFormValues) => void;
  ingredienteEditando: IngredienteDTO | null;
  guardando: boolean;
  error: string | null;
}) {
  const [valores, setValores] = useState<IngredienteFormValues>(VALORES_VACIOS);

  useEffect(() => {
    if (!open) return;
    if (ingredienteEditando) {
      setValores({
        nombre: ingredienteEditando.nombre,
        unidad: ingredienteEditando.unidad,
        stock: String(ingredienteEditando.stock),
        stockMinimo: String(ingredienteEditando.stockMinimo),
        costoUnitario: String(ingredienteEditando.costoUnitario),
      });
    } else {
      setValores(VALORES_VACIOS);
    }
  }, [open, ingredienteEditando]);

  function actualizar<K extends keyof IngredienteFormValues>(campo: K, valor: string) {
    setValores((prev) => ({ ...prev, [campo]: valor }));
  }

  const esValido =
    valores.nombre.trim() !== "" &&
    Number(valores.stockMinimo) >= 0 &&
    Number(valores.costoUnitario) >= 0 &&
    (ingredienteEditando || Number(valores.stock) >= 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ingredienteEditando ? "Editar ingrediente" : "Nuevo ingrediente"}
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Nombre"
          placeholder="Ej: Menta fresca"
          value={valores.nombre}
          onChange={(e) => actualizar("nombre", e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-muted">Unidad</label>
          <select
            value={valores.unidad}
            onChange={(e) => actualizar("unidad", e.target.value)}
            className="bg-surface border border-border rounded-md px-4 py-3 text-ink focus:border-rock transition-colors"
          >
            {UNIDADES.map((u) => (
              <option key={u.valor} value={u.valor}>
                {u.etiqueta}
              </option>
            ))}
          </select>
        </div>

        {!ingredienteEditando && (
          <Input
            type="number"
            min={0}
            label="Stock inicial"
            placeholder="0"
            value={valores.stock}
            onChange={(e) => actualizar("stock", e.target.value)}
          />
        )}
        {ingredienteEditando && (
          <p className="text-xs text-ink-muted">
            El stock no se edita aquí — usa el botón "Ajustar stock" en la lista, para dejar
            registro del motivo del cambio.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            min={0}
            label="Stock mínimo (alerta)"
            placeholder="0"
            value={valores.stockMinimo}
            onChange={(e) => actualizar("stockMinimo", e.target.value)}
          />
          <Input
            type="number"
            min={0}
            label="Costo unitario"
            placeholder="0"
            value={valores.costoUnitario}
            onChange={(e) => actualizar("costoUnitario", e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-rock-bright">{error}</p>}

        <Button fullWidth disabled={!esValido || guardando} onClick={() => onSubmit(valores)}>
          {guardando ? "Guardando..." : ingredienteEditando ? "Guardar cambios" : "Crear ingrediente"}
        </Button>
      </div>
    </Modal>
  );
}
