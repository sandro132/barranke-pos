import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { ApiError } from "../../services/api";
import { actualizarEspacio, crearEspacio, EspacioDTO } from "../../services/espacioService";

export function EspacioFormModal({
  open,
  onClose,
  editando,
  tipoPorDefecto,
}: {
  open: boolean;
  onClose: () => void;
  editando: EspacioDTO | null;
  tipoPorDefecto: "MESA" | "BARRA";
}) {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"MESA" | "BARRA">("MESA");
  const [capacidad, setCapacidad] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editando) {
      setNombre(editando.nombre);
      setTipo(editando.tipo);
      setCapacidad(editando.capacidad ? String(editando.capacidad) : "");
    } else {
      setNombre("");
      setTipo(tipoPorDefecto);
      setCapacidad("");
    }
    setError(null);
  }, [open, editando, tipoPorDefecto]);

  const guardarMutation = useMutation({
    mutationFn: () => {
      const cap = capacidad ? Number(capacidad) : undefined;
      return editando
        ? actualizarEspacio(editando.id, nombre, cap ?? null)
        : crearEspacio(nombre, tipo, cap);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["espacios"] });
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo guardar"),
  });

  return (
    <Modal open={open} onClose={onClose} title={editando ? "Editar mesa/barra" : "Nueva mesa/barra"}>
      <div className="flex flex-col gap-4">
        <Input
          label="Nombre"
          placeholder="Ej: Mesa 6, Terraza 1..."
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />

        {!editando && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-muted">Tipo</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTipo("MESA")}
                className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium border transition-colors ${
                  tipo === "MESA" ? "border-rock bg-rock-dim/20 text-ink" : "border-border text-ink-muted"
                }`}
              >
                Mesa
              </button>
              <button
                onClick={() => setTipo("BARRA")}
                className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium border transition-colors ${
                  tipo === "BARRA" ? "border-rock bg-rock-dim/20 text-ink" : "border-border text-ink-muted"
                }`}
              >
                Barra
              </button>
            </div>
          </div>
        )}

        <Input
          type="number"
          min={1}
          label="Capacidad (opcional)"
          placeholder="Ej: 4"
          value={capacidad}
          onChange={(e) => setCapacidad(e.target.value)}
        />

        {error && <p className="text-sm text-rock-bright">{error}</p>}

        <Button
          fullWidth
          disabled={!nombre.trim() || guardarMutation.isPending}
          onClick={() => {
            setError(null);
            guardarMutation.mutate();
          }}
        >
          {guardarMutation.isPending ? "Guardando..." : editando ? "Guardar cambios" : "Crear"}
        </Button>
      </div>
    </Modal>
  );
}
