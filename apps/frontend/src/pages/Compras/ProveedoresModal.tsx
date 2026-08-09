import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { ApiError } from "../../services/api";
import {
  actualizarProveedor,
  crearProveedor,
  eliminarProveedor,
  listarProveedores,
  ProveedorDTO,
} from "../../services/proveedorService";

const VACIO = { nombre: "", telefono: "", contacto: "", notas: "" };

export function ProveedoresModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<ProveedorDTO | null>(null);
  const [valores, setValores] = useState(VACIO);
  const [error, setError] = useState<string | null>(null);

  const { data: proveedores, isLoading } = useQuery({
    queryKey: ["proveedores"],
    queryFn: listarProveedores,
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setEditando(null);
      setValores(VACIO);
      setError(null);
    }
  }, [open]);

  function iniciarEdicion(prov: ProveedorDTO) {
    setEditando(prov);
    setValores({
      nombre: prov.nombre,
      telefono: prov.telefono ?? "",
      contacto: prov.contacto ?? "",
      notas: prov.notas ?? "",
    });
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
        telefono: valores.telefono || undefined,
        contacto: valores.contacto || undefined,
        notas: valores.notas || undefined,
      };
      return editando ? actualizarProveedor(editando.id, data) : crearProveedor(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
      iniciarCreacion();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo guardar"),
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: string) => eliminarProveedor(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proveedores"] }),
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo eliminar"),
  });

  return (
    <Modal open={open} onClose={onClose} title="Proveedores">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
          {isLoading && <p className="text-sm text-ink-muted">Cargando...</p>}
          {proveedores?.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between border border-border rounded-md px-3 py-2"
            >
              <div>
                <p className="text-sm text-ink">{p.nombre}</p>
                <p className="text-xs text-ink-muted">
                  {p.telefono ?? "Sin teléfono"}
                  {p.contacto ? ` · ${p.contacto}` : ""} · {p._count.compras} compra(s)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => iniciarEdicion(p)}
                  className="text-xs text-ink-muted hover:text-ink underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    eliminarMutation.mutate(p.id);
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
            {editando ? `Editando "${editando.nombre}"` : "Nuevo proveedor"}
          </p>
          <Input
            label="Nombre"
            placeholder="Ej: Distribuidora La 70"
            value={valores.nombre}
            onChange={(e) => setValores((p) => ({ ...p, nombre: e.target.value }))}
          />
          <Input
            label="Teléfono (opcional)"
            placeholder="3001234567"
            value={valores.telefono}
            onChange={(e) => setValores((p) => ({ ...p, telefono: e.target.value }))}
          />
          <Input
            label="Persona de contacto (opcional)"
            placeholder="Ej: Andrés"
            value={valores.contacto}
            onChange={(e) => setValores((p) => ({ ...p, contacto: e.target.value }))}
          />
          <Input
            label="Notas (opcional)"
            placeholder="Ej: pedidos mínimo 2 días antes"
            value={valores.notas}
            onChange={(e) => setValores((p) => ({ ...p, notas: e.target.value }))}
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
              {guardarMutation.isPending ? "Guardando..." : editando ? "Guardar cambios" : "Crear proveedor"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
