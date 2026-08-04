import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { ApiError } from "../../services/api";
import {
  actualizarCategoria,
  CategoriaDTO,
  crearCategoria,
  eliminarCategoria,
  listarCategorias,
} from "../../services/categoriaService";

const AREAS = [
  { valor: "NINGUNA", etiqueta: "Ninguna (se sirve directo)" },
  { valor: "COCINA", etiqueta: "Cocina" },
  { valor: "BARRA", etiqueta: "Barra" },
];

const VACIO = { nombre: "", prefijoSku: "", areaPreparacion: "NINGUNA" };

export function CategoriasModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<CategoriaDTO | null>(null);
  const [valores, setValores] = useState(VACIO);
  const [error, setError] = useState<string | null>(null);

  const { data: categorias, isLoading } = useQuery({
    queryKey: ["categorias"],
    queryFn: listarCategorias,
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setEditando(null);
      setValores(VACIO);
      setError(null);
    }
  }, [open]);

  function iniciarEdicion(cat: CategoriaDTO) {
    setEditando(cat);
    setValores({ nombre: cat.nombre, prefijoSku: cat.prefijoSku, areaPreparacion: cat.areaPreparacion });
    setError(null);
  }

  function iniciarCreacion() {
    setEditando(null);
    setValores(VACIO);
    setError(null);
  }

  const guardarMutation = useMutation({
    mutationFn: () => {
      const data = {
        nombre: valores.nombre,
        prefijoSku: valores.prefijoSku || undefined,
        areaPreparacion: valores.areaPreparacion as "COCINA" | "BARRA" | "NINGUNA",
      };
      return editando ? actualizarCategoria(editando.id, data) : crearCategoria(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      iniciarCreacion();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo guardar"),
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: string) => eliminarCategoria(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categorias"] }),
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo eliminar"),
  });

  return (
    <Modal open={open} onClose={onClose} title="Categorías">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
          {isLoading && <p className="text-sm text-ink-muted">Cargando...</p>}
          {categorias?.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between border border-border rounded-md px-3 py-2"
            >
              <div>
                <p className="text-sm text-ink">{c.nombre}</p>
                <p className="text-xs text-ink-muted">
                  {c.prefijoSku} · {AREAS.find((a) => a.valor === c.areaPreparacion)?.etiqueta} ·{" "}
                  {c._count.productos} producto(s)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => iniciarEdicion(c)}
                  className="text-xs text-ink-muted hover:text-ink underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    eliminarMutation.mutate(c.id);
                  }}
                  disabled={eliminarMutation.isPending}
                  className="text-xs text-ink-muted hover:text-rock-bright underline"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-4 flex flex-col gap-3">
          <p className="text-sm font-medium text-ink-muted">
            {editando ? `Editando "${editando.nombre}"` : "Nueva categoría"}
          </p>
          <Input
            label="Nombre"
            placeholder="Ej: Mecato"
            value={valores.nombre}
            onChange={(e) => setValores((p) => ({ ...p, nombre: e.target.value }))}
          />
          <Input
            label="Prefijo del código (opcional, se genera solo)"
            placeholder="Ej: MEC"
            value={valores.prefijoSku}
            onChange={(e) => setValores((p) => ({ ...p, prefijoSku: e.target.value.toUpperCase() }))}
            maxLength={6}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-muted">
              ¿A qué pantalla van sus pedidos?
            </label>
            <select
              value={valores.areaPreparacion}
              onChange={(e) => setValores((p) => ({ ...p, areaPreparacion: e.target.value }))}
              className="bg-surface border border-border rounded-md px-4 py-3 text-ink focus:border-rock transition-colors"
            >
              {AREAS.map((a) => (
                <option key={a.valor} value={a.valor}>
                  {a.etiqueta}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-rock-bright">{error}</p>}

          <div className="flex gap-2">
            {editando && (
              <Button variant="secondary" onClick={iniciarCreacion}>
                Cancelar edición
              </Button>
            )}
            <Button
              fullWidth
              disabled={!valores.nombre.trim() || guardarMutation.isPending}
              onClick={() => guardarMutation.mutate()}
            >
              {guardarMutation.isPending ? "Guardando..." : editando ? "Guardar cambios" : "Crear categoría"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
