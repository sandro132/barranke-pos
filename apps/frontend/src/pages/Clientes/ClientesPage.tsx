import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { ApiError } from "../../services/api";
import {
  actualizarCliente,
  ClienteDTO,
  ClienteInput,
  crearCliente,
  eliminarCliente,
  listarClientes,
} from "../../services/clienteService";
import { formatoMoneda } from "../../utils/format";
import { ClienteCuentaModal } from "./ClienteCuentaModal";

const VACIO = { nombre: "", telefono: "", cumpleanos: "" };

function ClienteFormModal({
  open,
  onClose,
  editando,
}: {
  open: boolean;
  onClose: () => void;
  editando: ClienteDTO | null;
}) {
  const queryClient = useQueryClient();
  const [valores, setValores] = useState(VACIO);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editando) {
      setValores({
        nombre: editando.nombre,
        telefono: editando.telefono ?? "",
        cumpleanos: editando.cumpleanos ? editando.cumpleanos.slice(0, 10) : "",
      });
    } else {
      setValores(VACIO);
    }
    setError(null);
  }, [open, editando]);

  const guardarMutation = useMutation({
    mutationFn: () => {
      const data: ClienteInput = {
        nombre: valores.nombre,
        telefono: valores.telefono || undefined,
        cumpleanos: valores.cumpleanos || undefined,
      };
      return editando ? actualizarCliente(editando.id, data) : crearCliente(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo guardar"),
  });

  return (
    <Modal open={open} onClose={onClose} title={editando ? "Editar cliente" : "Nuevo cliente"}>
      <div className="flex flex-col gap-4">
        <Input
          label="Nombre"
          placeholder="Ej: Juan Pérez"
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
          type="date"
          label="Cumpleaños (opcional)"
          value={valores.cumpleanos}
          onChange={(e) => setValores((p) => ({ ...p, cumpleanos: e.target.value }))}
        />

        {error && <p className="text-sm text-rock-bright">{error}</p>}

        <Button
          fullWidth
          disabled={!valores.nombre.trim() || guardarMutation.isPending}
          onClick={() => guardarMutation.mutate()}
        >
          {guardarMutation.isPending ? "Guardando..." : editando ? "Guardar cambios" : "Crear cliente"}
        </Button>
      </div>
    </Modal>
  );
}

export function ClientesPage() {
  const queryClient = useQueryClient();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<ClienteDTO | null>(null);
  const [viendoCuenta, setViendoCuenta] = useState<ClienteDTO | null>(null);

  const { data: clientes, isLoading } = useQuery({ queryKey: ["clientes"], queryFn: listarClientes });

  const eliminarMutation = useMutation({
    mutationFn: (id: string) => eliminarCliente(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clientes"] }),
  });

  return (
    <div className="p-8">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">
            Clientes
          </h1>
          <p className="text-ink-muted text-sm mt-1">
            Base de clientes frecuentes — nombre, teléfono y cumpleaños
          </p>
        </div>
        <Button
          onClick={() => {
            setEditando(null);
            setModalAbierto(true);
          }}
        >
          + Nuevo cliente
        </Button>
      </header>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Cargando...</p>
      ) : clientes?.length === 0 ? (
        <p className="text-sm text-ink-muted">Todavía no hay clientes registrados.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {clientes?.map((c) => (
            <Card key={c.id}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{c.nombre}</p>
                    {c.saldo > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded bg-rock-dim/30 text-rock-bright">
                        Debe {formatoMoneda(c.saldo)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted mt-1">
                    {c.telefono ?? "Sin teléfono"}
                    {c.cumpleanos
                      ? ` · Cumpleaños: ${new Date(c.cumpleanos).toLocaleDateString("es-CO", {
                          day: "2-digit",
                          month: "long",
                        })}`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setViendoCuenta(c)}>
                    Cuenta
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditando(c);
                      setModalAbierto(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="secondary"
                    className="text-rock-bright"
                    onClick={() => eliminarMutation.mutate(c.id)}
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

      <ClienteFormModal open={modalAbierto} onClose={() => setModalAbierto(false)} editando={editando} />
      <ClienteCuentaModal cliente={viendoCuenta} onClose={() => setViendoCuenta(null)} />
    </div>
  );
}
