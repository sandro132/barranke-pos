import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { ProductoDTO } from "../../services/productoService";
import { listarIngredientes } from "../../services/ingredienteService";
import {
  agregarItemReceta,
  eliminarItemReceta,
  obtenerReceta,
} from "../../services/recetaService";

export function RecetaModal({
  producto,
  onClose,
}: {
  producto: ProductoDTO | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [ingredienteId, setIngredienteId] = useState("");
  const [cantidad, setCantidad] = useState("");

  const recetaQuery = useQuery({
    queryKey: ["receta", producto?.id],
    queryFn: () => obtenerReceta(producto!.id),
    enabled: !!producto,
  });

  const ingredientesQuery = useQuery({
    queryKey: ["ingredientes", "todos"],
    queryFn: () => listarIngredientes(),
    enabled: !!producto,
  });

  const agregarMutation = useMutation({
    mutationFn: () => agregarItemReceta(producto!.id, ingredienteId, Number(cantidad)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receta", producto?.id] });
      setIngredienteId("");
      setCantidad("");
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: (ingId: string) => eliminarItemReceta(producto!.id, ingId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["receta", producto?.id] }),
  });

  const ingredientesEnReceta = new Set((recetaQuery.data ?? []).map((r) => r.ingredienteId));
  const ingredientesDisponibles = (ingredientesQuery.data ?? []).filter(
    (i) => !ingredientesEnReceta.has(i.id)
  );

  return (
    <Modal open={!!producto} onClose={onClose} title={`Receta — ${producto?.nombre ?? ""}`}>
      <div className="flex flex-col gap-4">
        {recetaQuery.data?.length === 0 && (
          <p className="text-sm text-ink-muted">
            Este producto todavía no tiene receta. Sin receta, su stock se descuenta directo.
          </p>
        )}

        {recetaQuery.data && recetaQuery.data.length > 0 && (
          <ul className="flex flex-col gap-2">
            {recetaQuery.data.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between border border-border rounded-md px-3 py-2"
              >
                <span className="text-sm text-ink">
                  {item.cantidad} {item.ingrediente.unidad.toLowerCase()} de {item.ingrediente.nombre}
                </span>
                <button
                  onClick={() => eliminarMutation.mutate(item.ingredienteId)}
                  disabled={eliminarMutation.isPending}
                  className="text-ink-muted hover:text-rock-bright text-lg leading-none"
                  aria-label={`Quitar ${item.ingrediente.nombre}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-border pt-4 flex flex-col gap-3">
          <p className="text-sm font-medium text-ink-muted">Agregar ingrediente</p>
          <div className="flex flex-col gap-1.5">
            <select
              value={ingredienteId}
              onChange={(e) => setIngredienteId(e.target.value)}
              className="bg-surface border border-border rounded-md px-4 py-3 text-ink focus:border-rock transition-colors"
            >
              <option value="">Selecciona un ingrediente...</option>
              {ingredientesDisponibles.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre} ({i.unidad.toLowerCase()})
                </option>
              ))}
            </select>
          </div>
          <Input
            type="number"
            min={0}
            label="Cantidad por unidad vendida"
            placeholder="Ej: 60 (ml)"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
          <Button
            fullWidth
            variant="secondary"
            disabled={!ingredienteId || Number(cantidad) <= 0 || agregarMutation.isPending}
            onClick={() => agregarMutation.mutate()}
          >
            {agregarMutation.isPending ? "Agregando..." : "Agregar a la receta"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
