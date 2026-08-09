import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { ApiError } from "../../services/api";
import { actualizarEspacio, crearEspacio, EspacioDTO, listarEspacios } from "../../services/espacioService";

const VACIO = { nombre: "", tipo: "MESA" as "MESA" | "BARRA", capacidad: "" };

export function EspaciosModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<EspacioDTO | null>(null);
  const [valores, setValores] = useState(VACIO);
  const [error, setError] = useState<string | null>(null);

  const { data: espacios, isLoading } = useQuery({
    queryKey: ["espacios"],
    queryFn: listarEspacios,
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setEditando(null);
      setValores(VACIO);
      setError(null);
    }
  }, [open]);

  function iniciarEdicion(e: EspacioDTO) {
    setEditando(e);
    setValores({ nombre: e.nombre, tipo: e.tipo, capacidad: e.capacidad ? String(e.capacidad) : "" });
    setError(null);
  }

  function iniciarCreacion() {
    setEditando(null);
    setValores(VACIO);
    setError(null);
  }

  const guardarMutation = useMutation({
    mutationFn: () => {
      const cap = valores.capacidad ? Number(valores.capacidad) : undefined;
      return editando
        ? actualizarEspacio(editando.id, valores.nombre, cap ?? null)
        : crearEspacio(valores.nombre, valores.tipo, cap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["espacios"] });
      iniciarCreacion();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo guardar"),
  });

  return (
    <Modal open={open} onClose={onClose} title="Mesas y barras (referencia física)">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-ink-muted">
          Esta lista es solo el catálogo físico del local — para abrir una cuenta, ve a "Cuentas" y
          asígnale una de estas si quieres, como referencia de dónde entregar.
        </p>

        <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
          {isLoading && <p className="text-sm text-ink-muted">Cargando...</p>}
          {espacios?.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between border border-border rounded-md px-3 py-2"
            >
              <div>
                <p className="text-sm text-ink">{e.nombre}</p>
                <p className="text-xs text-ink-muted">
                  {e.tipo === "MESA" ? "Mesa" : "Barra"}
                  {e.capacidad ? ` · Capacidad ${e.capacidad}` : ""}
                </p>
              </div>
              <button
                onClick={() => iniciarEdicion(e)}
                className="text-xs text-ink-muted hover:text-ink underline"
              >
                Editar
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-4 flex flex-col gap-3">
          <p className="text-sm font-medium text-ink-muted">
            {editando ? `Editando "${editando.nombre}"` : "Nueva mesa/barra"}
          </p>
          <Input
            label="Nombre"
            placeholder="Ej: Mesa 6, Terraza 1..."
            value={valores.nombre}
            onChange={(e) => setValores((p) => ({ ...p, nombre: e.target.value }))}
          />
          {!editando && (
            <div className="flex gap-2">
              <button
                onClick={() => setValores((p) => ({ ...p, tipo: "MESA" }))}
                className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium border transition-colors ${
                  valores.tipo === "MESA" ? "border-rock bg-rock-dim/20 text-ink" : "border-border text-ink-muted"
                }`}
              >
                Mesa
              </button>
              <button
                onClick={() => setValores((p) => ({ ...p, tipo: "BARRA" }))}
                className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium border transition-colors ${
                  valores.tipo === "BARRA" ? "border-rock bg-rock-dim/20 text-ink" : "border-border text-ink-muted"
                }`}
              >
                Barra
              </button>
            </div>
          )}
          <Input
            type="number"
            min={1}
            label="Capacidad (opcional)"
            placeholder="Ej: 4"
            value={valores.capacidad}
            onChange={(e) => setValores((p) => ({ ...p, capacidad: e.target.value }))}
          />

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
              {guardarMutation.isPending ? "Guardando..." : editando ? "Guardar cambios" : "Crear"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
