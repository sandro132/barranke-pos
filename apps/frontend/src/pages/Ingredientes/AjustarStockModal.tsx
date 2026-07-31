import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { IngredienteDTO, ajustarStockIngrediente } from "../../services/ingredienteService";
import { ApiError } from "../../services/api";

export function AjustarStockModal({
  ingrediente,
  onClose,
}: {
  ingrediente: IngredienteDTO | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => ajustarStockIngrediente(ingrediente!.id, Number(cantidad), motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "ingredientes" });
      setCantidad("");
      setMotivo("");
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo ajustar el stock"),
  });

  return (
    <Modal
      open={!!ingrediente}
      onClose={() => {
        setError(null);
        onClose();
      }}
      title={`Ajustar stock — ${ingrediente?.nombre ?? ""}`}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          Stock actual: {ingrediente?.stock} {ingrediente?.unidad.toLowerCase()}
        </p>
        <Input
          type="number"
          label="Cantidad (positiva para sumar, negativa para restar)"
          placeholder="Ej: 500 o -200"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />
        <Input
          label="Motivo"
          placeholder="Ej: merma, corrección de conteo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        {error && <p className="text-sm text-rock-bright">{error}</p>}
        <Button
          fullWidth
          disabled={!cantidad || Number(cantidad) === 0 || !motivo.trim() || mutation.isPending}
          onClick={() => {
            setError(null);
            mutation.mutate();
          }}
        >
          {mutation.isPending ? "Guardando..." : "Ajustar stock"}
        </Button>
      </div>
    </Modal>
  );
}
