import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { formatoMoneda } from "../../utils/format";
import { ApiError } from "../../services/api";
import { actualizarCompra, anularCompra, CompraDTO, listarCompras } from "../../services/compraService";
import { listarProveedores } from "../../services/proveedorService";
import { ProveedoresModal } from "./ProveedoresModal";

function EditarCompraModal({
  compra,
  onClose,
}: {
  compra: CompraDTO | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [proveedorId, setProveedorId] = useState(compra?.proveedorId ?? "");
  const [factura, setFactura] = useState(compra?.factura ?? "");
  const [error, setError] = useState<string | null>(null);

  const proveedoresQuery = useQuery({
    queryKey: ["proveedores"],
    queryFn: listarProveedores,
    enabled: !!compra,
  });

  useEffect(() => {
    if (compra) {
      setProveedorId(compra.proveedorId);
      setFactura(compra.factura ?? "");
    }
  }, [compra]);

  const mutation = useMutation({
    mutationFn: () => actualizarCompra(compra!.id, proveedorId, factura || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras"] });
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo guardar"),
  });

  return (
    <Modal open={!!compra} onClose={onClose} title="Editar compra">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-ink-muted">
          Aquí solo puedes corregir el proveedor o el número de factura — no afectan el inventario. Si el
          error fue en las cantidades, costos o productos, anula esta compra y regístrala de nuevo bien.
        </p>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-muted">Proveedor</label>
          <select
            value={proveedorId}
            onChange={(e) => setProveedorId(e.target.value)}
            className="bg-surface border border-border rounded-md px-4 py-3 text-ink focus:border-rock transition-colors"
          >
            {proveedoresQuery.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Factura (opcional)"
          value={factura}
          onChange={(e) => setFactura(e.target.value)}
        />
        {error && <p className="text-sm text-rock-bright">{error}</p>}
        <Button fullWidth disabled={!proveedorId || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </Modal>
  );
}

export function ComprasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<CompraDTO | null>(null);
  const [modalProveedoresAbierto, setModalProveedoresAbierto] = useState(false);
  const { data: compras, isLoading } = useQuery({ queryKey: ["compras"], queryFn: listarCompras });

  const anularMutation = useMutation({
    mutationFn: (id: string) => anularCompra(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compras"] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "productos" });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "ingredientes" });
    },
  });

  return (
    <div className="p-8">
      <header className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">Compras</h1>
          <p className="text-ink-muted text-sm mt-1">Registro de compras a proveedores e inventario</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setModalProveedoresAbierto(true)}>
            Proveedores
          </Button>
          <Button onClick={() => navigate("/compras/nueva")}>+ Nueva compra</Button>
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Cargando...</p>
      ) : compras?.length === 0 ? (
        <p className="text-sm text-ink-muted">Todavía no se ha registrado ninguna compra.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {compras?.map((compra) => (
            <Card key={compra.id}>
              <div className="flex items-start justify-between mb-2 gap-3">
                <div>
                  <p className="font-display font-semibold text-ink">{compra.proveedor.nombre}</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {new Date(compra.fecha).toLocaleString("es-CO", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {compra.factura ? ` · Factura ${compra.factura}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="font-display text-xl font-bold text-ink">{formatoMoneda(compra.total)}</p>
                  <button
                    onClick={() => setEditando(compra)}
                    className="text-xs text-ink-muted hover:text-ink underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `¿Anular la compra a ${compra.proveedor.nombre} por ${formatoMoneda(compra.total)}? Esto resta del inventario lo que esta compra había sumado, y no se puede deshacer.`
                        )
                      ) {
                        anularMutation.mutate(compra.id);
                      }
                    }}
                    disabled={anularMutation.isPending}
                    className="text-xs text-ink-muted hover:text-rock-bright underline"
                  >
                    Anular
                  </button>
                </div>
              </div>
              <ul className="flex flex-col gap-1 mt-2">
                {compra.items.map((item) => {
                  const nombre = item.producto?.nombre ?? item.ingrediente?.nombre ?? "—";
                  return (
                    <li key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-ink-muted">
                        {item.cantidad}× {nombre}
                      </span>
                      <span className="text-ink-muted">
                        {formatoMoneda(item.costoUnitario)} c/u
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <EditarCompraModal compra={editando} onClose={() => setEditando(null)} />
      <ProveedoresModal
        open={modalProveedoresAbierto}
        onClose={() => setModalProveedoresAbierto(false)}
      />
    </div>
  );
}
