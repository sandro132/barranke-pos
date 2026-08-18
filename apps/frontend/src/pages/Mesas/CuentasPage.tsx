import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { abrirCuenta, CuentaDTO, listarCuentas } from "../../services/cuentaService";
import { listarEspacios } from "../../services/espacioService";
import { getSocket } from "../../sockets/socket";
import { SOCKET_EVENTS } from "@barranke/shared";
import { useAuthStore } from "../../stores/authStore";
import { formatoMoneda } from "../../utils/format";
import { EspaciosModal } from "./EspaciosModal";

function CuentaCard({ cuenta, onClick }: { cuenta: CuentaDTO; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-lg border border-rock bg-rock-dim/20 hover:bg-rock-dim/30 p-4 transition-colors"
    >
      <p className="font-display font-semibold text-ink">{cuenta.nombre}</p>
      {cuenta.unidaA ? (
        <p className="text-xs text-rock-bright mt-1">Unida a {cuenta.unidaA}</p>
      ) : (
        <>
          <p className="text-sm text-ink mt-1">{formatoMoneda(cuenta.totalConsumido)}</p>
          <p className="text-xs text-ink-muted mt-0.5">
            {cuenta.espacio ? `${cuenta.espacio.nombre} · ` : ""}
            Abierta hace {cuenta.tiempoAbiertaMinutos} min
            {cuenta.descripcion ? ` · ${cuenta.descripcion}` : ""}
            {cuenta.cuentasUnidas.length > 0 && ` · +${cuenta.cuentasUnidas.length} unida(s)`}
          </p>
        </>
      )}
    </button>
  );
}

export function CuentasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const usuario = useAuthStore((s) => s.usuario);
  const [modalAbrirVisible, setModalAbrirVisible] = useState(false);
  const [modalEspaciosVisible, setModalEspaciosVisible] = useState(false);
  const [nombre, setNombre] = useState("");
  const [espacioId, setEspacioId] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const { data: cuentas, isLoading } = useQuery({ queryKey: ["cuentas"], queryFn: listarCuentas });
  const espaciosQuery = useQuery({
    queryKey: ["espacios"],
    queryFn: listarEspacios,
    enabled: modalAbrirVisible,
  });

  // Se suscribe a cambios en tiempo real: si otro mesero abre/cierra una
  // cuenta desde su celular, esta pantalla se actualiza sola, sin recargar.
  useEffect(() => {
    const socket = getSocket();
    const onCuentaActualizada = () => {
      queryClient.invalidateQueries({ queryKey: ["cuentas"] });
    };
    socket.on(SOCKET_EVENTS.CUENTA_ACTUALIZADA, onCuentaActualizada);
    return () => {
      socket.off(SOCKET_EVENTS.CUENTA_ACTUALIZADA, onCuentaActualizada);
    };
  }, [queryClient]);

  const abrirMutation = useMutation({
    mutationFn: () =>
      abrirCuenta(nombre.trim(), espacioId || undefined, descripcion.trim() || undefined),
    onSuccess: (cuenta) => {
      queryClient.invalidateQueries({ queryKey: ["cuentas"] });
      setModalAbrirVisible(false);
      setNombre("");
      setEspacioId("");
      setDescripcion("");
      navigate(`/cuentas/${cuenta.id}`);
    },
  });

  return (
    <div className="p-8">
      <header className="mb-8 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">
            Cuentas
          </h1>
          <p className="text-ink-muted text-sm mt-1">
            Cuentas abiertas ahora mismo — a nombre de quién, no de una mesa fija
          </p>
        </div>
        <div className="flex gap-2">
          {usuario?.rol === "ADMIN" && (
            <Button variant="secondary" onClick={() => setModalEspaciosVisible(true)}>
              Mesas y barras
            </Button>
          )}
          <Button onClick={() => setModalAbrirVisible(true)}>+ Nueva cuenta</Button>
        </div>
      </header>

      {isLoading ? (
        <p className="text-ink-muted text-sm">Cargando...</p>
      ) : cuentas?.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">
            No hay ninguna cuenta abierta ahora mismo. Dale "+ Nueva cuenta" para empezar.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {cuentas?.map((c) => (
            <CuentaCard key={c.id} cuenta={c} onClick={() => navigate(`/cuentas/${c.id}`)} />
          ))}
        </div>
      )}

      <Modal open={modalAbrirVisible} onClose={() => setModalAbrirVisible(false)} title="Nueva cuenta">
        <div className="flex flex-col gap-4">
          <Input
            label="¿A nombre de quién?"
            placeholder="Ej: Juan, Cumpleaños María, Cliente 1..."
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-ink-muted">
              Mesa/barra (opcional, solo referencia)
            </label>
            <select
              value={espacioId}
              onChange={(e) => setEspacioId(e.target.value)}
              className="bg-surface border border-border rounded-md px-4 py-3 text-ink focus:border-rock transition-colors"
            >
              <option value="">Sin asignar</option>
              {espaciosQuery.data?.map((esp) => (
                <option key={esp.id} value={esp.id}>
                  {esp.nombre}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Notas (opcional)"
            placeholder="Ej: grupo de 6, cliente frecuente"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={200}
          />
          {abrirMutation.isError && (
            <p className="text-sm text-rock-bright">No se pudo abrir la cuenta. Intenta de nuevo.</p>
          )}
          <Button
            fullWidth
            disabled={!nombre.trim() || abrirMutation.isPending}
            onClick={() => abrirMutation.mutate()}
          >
            {abrirMutation.isPending ? "Abriendo..." : "Abrir cuenta"}
          </Button>
        </div>
      </Modal>

      <EspaciosModal open={modalEspaciosVisible} onClose={() => setModalEspaciosVisible(false)} />
    </div>
  );
}
