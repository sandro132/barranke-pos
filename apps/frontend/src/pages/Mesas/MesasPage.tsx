import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { abrirEspacio, EspacioDTO, listarEspacios } from "../../services/espacioService";
import { getSocket } from "../../sockets/socket";
import { SOCKET_EVENTS } from "@barranke/shared";

function formatoMoneda(valor: number) {
  return valor.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

function EspacioCard({ espacio, onClick }: { espacio: EspacioDTO; onClick: () => void }) {
  const ocupada = espacio.estado === "OCUPADA";

  return (
    <button
      onClick={onClick}
      className={`text-left rounded-lg border p-4 transition-colors ${
        ocupada
          ? "border-rock bg-rock-dim/20 hover:bg-rock-dim/30"
          : "border-border bg-surface-raised hover:border-ink-muted"
      }`}
    >
      <p className="font-display font-semibold text-ink">{espacio.nombre}</p>
      {ocupada ? (
        <>
          <p className="text-sm text-ink mt-1">{formatoMoneda(espacio.totalConsumido)}</p>
          <p className="text-xs text-ink-muted mt-0.5">
            Abierta hace {espacio.tiempoAbiertaMinutos} min
            {espacio.personas ? ` · ${espacio.personas} personas` : ""}
          </p>
        </>
      ) : (
        <p className="text-xs text-ink-muted mt-1">Libre — toca para abrir</p>
      )}
    </button>
  );
}

export function MesasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [espacioParaAbrir, setEspacioParaAbrir] = useState<EspacioDTO | null>(null);
  const [personas, setPersonas] = useState("");

  const { data: espacios, isLoading } = useQuery({ queryKey: ["espacios"], queryFn: listarEspacios });

  // Se suscribe a cambios en tiempo real: si otro mesero abre/cierra una mesa
  // desde su celular, esta pantalla se actualiza sola, sin recargar.
  useEffect(() => {
    const socket = getSocket();
    const onEspacioActualizado = () => {
      queryClient.invalidateQueries({ queryKey: ["espacios"] });
    };
    socket.on(SOCKET_EVENTS.ESPACIO_ACTUALIZADO, onEspacioActualizado);
    return () => {
      socket.off(SOCKET_EVENTS.ESPACIO_ACTUALIZADO, onEspacioActualizado);
    };
  }, [queryClient]);

  const abrirMutation = useMutation({
    mutationFn: (vars: { id: string; personas?: number }) =>
      abrirEspacio(vars.id, vars.personas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["espacios"] });
      setEspacioParaAbrir(null);
      setPersonas("");
    },
  });

  function handleClickEspacio(espacio: EspacioDTO) {
    if (espacio.estado === "OCUPADA") {
      navigate(`/mesas/${espacio.id}`);
    } else {
      setEspacioParaAbrir(espacio);
    }
  }

  function confirmarApertura() {
    if (!espacioParaAbrir) return;
    abrirMutation.mutate({
      id: espacioParaAbrir.id,
      personas: personas ? Number(personas) : undefined,
    });
  }

  const mesas = espacios?.filter((e) => e.tipo === "MESA") ?? [];
  const barras = espacios?.filter((e) => e.tipo === "BARRA") ?? [];

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">
          Mesas y Barras
        </h1>
        <p className="text-ink-muted text-sm mt-1">Toca una mesa libre para abrirla, o una ocupada para ver el detalle</p>
      </header>

      {isLoading ? (
        <p className="text-ink-muted text-sm">Cargando...</p>
      ) : (
        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-3">
              Mesas
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {mesas.map((e) => (
                <EspacioCard key={e.id} espacio={e} onClick={() => handleClickEspacio(e)} />
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-3">
              Barras
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {barras.map((e) => (
                <EspacioCard key={e.id} espacio={e} onClick={() => handleClickEspacio(e)} />
              ))}
            </div>
          </Card>
        </div>
      )}

      <Modal
        open={!!espacioParaAbrir}
        onClose={() => setEspacioParaAbrir(null)}
        title={`Abrir ${espacioParaAbrir?.nombre ?? ""}`}
      >
        <div className="flex flex-col gap-4">
          <Input
            type="number"
            min={1}
            label="Cantidad de personas (opcional)"
            placeholder="4"
            value={personas}
            onChange={(e) => setPersonas(e.target.value)}
          />
          {abrirMutation.isError && (
            <p className="text-sm text-rock-bright">No se pudo abrir el espacio. Intenta de nuevo.</p>
          )}
          <Button onClick={confirmarApertura} disabled={abrirMutation.isPending} fullWidth>
            {abrirMutation.isPending ? "Abriendo..." : "Abrir"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
