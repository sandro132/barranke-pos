import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { CuentaDTO, listarCuentas, unirCuentas } from "../../services/cuentaService";
import { ApiError } from "../../services/api";

export function UnirCuentasModal({
  cuenta,
  open,
  onClose,
}: {
  cuenta: CuentaDTO;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const cuentasQuery = useQuery({ queryKey: ["cuentas"], queryFn: listarCuentas, enabled: open });

  // Solo se pueden unir cuentas abiertas, que no sean esta misma, y que no
  // estén ya unidas a otra ni tengan a su vez cuentas unidas a ellas.
  const candidatas = (cuentasQuery.data ?? []).filter(
    (c) => c.id !== cuenta.id && !c.cuentaPadreId && c.cuentasUnidas.length === 0
  );

  const unirMutation = useMutation({
    mutationFn: () => unirCuentas(cuenta.id, seleccionadas),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "cuenta" || q.queryKey[0] === "cuentas" });
      setSeleccionadas([]);
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudieron unir las cuentas"),
  });

  function toggle(id: string) {
    setSeleccionadas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <Modal open={open} onClose={onClose} title={`Unir cuentas a ${cuenta.nombre}`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          El consumo y el cierre de las cuentas que elijas se van a manejar desde {cuenta.nombre}.
        </p>

        {candidatas.length === 0 ? (
          <p className="text-sm text-ink-muted">No hay otras cuentas abiertas disponibles para unir.</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {candidatas.map((c) => (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                className={`text-left px-4 py-2.5 rounded-md text-sm font-medium border transition-colors ${
                  seleccionadas.includes(c.id)
                    ? "border-rock bg-rock-dim/20 text-ink"
                    : "border-border text-ink-muted hover:text-ink"
                }`}
              >
                {c.nombre}
                {c.espacio ? ` (${c.espacio.nombre})` : ""}
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
          {unirMutation.isPending ? "Uniendo..." : `Unir ${seleccionadas.length || ""} cuenta(s)`}
        </Button>
      </div>
    </Modal>
  );
}
