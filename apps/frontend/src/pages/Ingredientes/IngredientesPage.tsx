import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { formatoMoneda } from "../../utils/format";
import {
  actualizarIngrediente,
  crearIngrediente,
  eliminarIngrediente,
  IngredienteDTO,
  listarIngredientes,
} from "../../services/ingredienteService";
import { ApiError } from "../../services/api";
import { IngredienteFormModal, IngredienteFormValues } from "./IngredienteFormModal";
import { AjustarStockModal } from "./AjustarStockModal";
import { HistorialIngredienteModal } from "./HistorialIngredienteModal";

export function IngredientesPage() {
  const queryClient = useQueryClient();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<IngredienteDTO | null>(null);
  const [ajustandoStock, setAjustandoStock] = useState<IngredienteDTO | null>(null);
  const [viendoHistorial, setViendoHistorial] = useState<IngredienteDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  const ingredientesQuery = useQuery({
    queryKey: ["ingredientes", "gestion"],
    queryFn: () => listarIngredientes(),
  });

  function invalidar() {
    queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "ingredientes" });
  }

  const crearMutation = useMutation({
    mutationFn: (v: IngredienteFormValues) =>
      crearIngrediente({
        nombre: v.nombre,
        unidad: v.unidad,
        stock: Number(v.stock),
        stockMinimo: Number(v.stockMinimo),
        costoUnitario: Number(v.costoUnitario),
      }),
    onSuccess: () => {
      invalidar();
      setModalAbierto(false);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo crear el ingrediente"),
  });

  const actualizarMutation = useMutation({
    mutationFn: (v: IngredienteFormValues) =>
      actualizarIngrediente(editando!.id, {
        nombre: v.nombre,
        unidad: v.unidad,
        stockMinimo: Number(v.stockMinimo),
        costoUnitario: Number(v.costoUnitario),
      }),
    onSuccess: () => {
      invalidar();
      setModalAbierto(false);
      setEditando(null);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo actualizar"),
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: string) => eliminarIngrediente(id),
    onSuccess: invalidar,
    onError: (err) =>
      setErrorEliminar(err instanceof ApiError ? err.message : "No se pudo eliminar el ingrediente"),
  });

  return (
    <div className="p-8">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">
            Ingredientes
          </h1>
          <p className="text-ink-muted text-sm mt-1">Insumos usados en las recetas de comida y cócteles</p>
        </div>
        <Button
          onClick={() => {
            setError(null);
            setEditando(null);
            setModalAbierto(true);
          }}
        >
          + Nuevo ingrediente
        </Button>
      </header>

      {errorEliminar && (
        <div className="bg-rock-dim/30 border border-rock text-ink text-sm rounded-md px-3 py-2 mb-4">
          {errorEliminar}
        </div>
      )}

      {ingredientesQuery.isLoading ? (
        <p className="text-sm text-ink-muted">Cargando...</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ingredientesQuery.data?.map((i) => (
            <Card key={i.id} className={i.stockBajo ? "border-rock" : ""}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{i.nombre}</p>
                    {i.stockBajo && (
                      <span className="text-xs text-rock-bright bg-rock-dim/30 px-2 py-0.5 rounded">
                        Stock bajo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted mt-1">
                    Stock {i.stock} {i.unidad.toLowerCase()} · Mínimo {i.stockMinimo} · Costo{" "}
                    {formatoMoneda(i.costoUnitario)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setViendoHistorial(i)}>
                    Historial
                  </Button>
                  <Button variant="secondary" onClick={() => setAjustandoStock(i)}>
                    Ajustar stock
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setError(null);
                      setEditando(i);
                      setModalAbierto(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="secondary"
                    className="text-rock-bright"
                    onClick={() => {
                      setErrorEliminar(null);
                      eliminarMutation.mutate(i.id);
                    }}
                    disabled={eliminarMutation.isPending}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <IngredienteFormModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        ingredienteEditando={editando}
        guardando={crearMutation.isPending || actualizarMutation.isPending}
        error={error}
        onSubmit={(valores) => {
          setError(null);
          if (editando) {
            actualizarMutation.mutate(valores);
          } else {
            crearMutation.mutate(valores);
          }
        }}
      />

      <AjustarStockModal ingrediente={ajustandoStock} onClose={() => setAjustandoStock(null)} />
      <HistorialIngredienteModal ingrediente={viendoHistorial} onClose={() => setViendoHistorial(null)} />
    </div>
  );
}
