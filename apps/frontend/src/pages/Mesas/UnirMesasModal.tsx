import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { EspacioDTO, listarEspacios, unirEspacios } from "../../services/espacioService";
import { ApiError } from "../../services/api";

export function UnirMesasModal({
  espacio,
  open,
  onClose,
}: {
  espacio: EspacioDTO;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const espaciosQuery = useQuery({ queryKey: ["espacios"], queryFn: listarEspacios, enabled: open });

  // Solo se pueden unir mesas ocupadas, que no sean esta misma, y que no
  // estén ya unidas a otra ni tengan a su vez mesas unidas a ellas.
  const candidatas = (espaciosQuery.data ?? []).filter(
    (e) =>
      e.id !== espacio.id &&
      e.estado === "OCUPADA" &&
      !e.espacioPadreId &&
      e.mesasUnidas.length === 0
  );

  const unirMutation = useMutation({
    mutationFn: () => unirEspacios(espacio.id, seleccionadas),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "espacio" || q.queryKey[0] === "espacios" });
      setSeleccionadas([]);
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudieron unir las mesas"),
  });

  function toggle(id: string) {
    setSeleccionadas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <Modal open={open} onClose={onClose} title={`Unir mesas a ${espacio.nombre}`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          El consumo y el cierre de las mesas que elijas se van a manejar desde {espacio.nombre}.
        </p>

        {candidatas.length === 0 ? (
          <p className="text-sm text-ink-muted">No hay otras mesas ocupadas disponibles para unir.</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {candidatas.map((e) => (
              <button
                key={e.id}
                onClick={() => toggle(e.id)}
                className={`text-left px-4 py-2.5 rounded-md text-sm font-medium border transition-colors ${
                  seleccionadas.includes(e.id)
                    ? "border-rock bg-rock-dim/20 text-ink"
                    : "border-border text-ink-muted hover:text-ink"
                }`}
              >
                {e.nombre}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-rock-bright">{error}</p>}

        <Button
          fullWidth
          disabled={seleccionadas.length === 0 || unirMutation.isPending}
          onClick={() => {
            setError(null);
            unirMutation.mutate();
          }}
        >
          {unirMutation.isPending ? "Uniendo..." : `Unir ${seleccionadas.length || ""} mesa(s)`}
        </Button>
      </div>
    </Modal>
  );
}
