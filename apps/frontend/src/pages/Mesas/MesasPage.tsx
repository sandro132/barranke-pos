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
import { formatoMoneda } from "../../utils/format";
import { EspacioFormModal } from "./EspacioFormModal";

function EspacioCard({
  espacio,
  onClick,
  onEditar,
}: {
  espacio: EspacioDTO;
  onClick: () => void;
  onEditar: () => void;
}) {
  const ocupada = espacio.estado === "OCUPADA";

  return (
    <div
      className={`relative rounded-lg border p-4 transition-colors ${
        ocupada
          ? "border-rock bg-rock-dim/20 hover:bg-rock-dim/30"
          : "border-border bg-surface-raised hover:border-ink-muted"
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEditar();
        }}
        aria-label={`Editar ${espacio.nombre}`}
        className="absolute top-2 right-2 text-ink-muted hover:text-ink text-xs px-1.5 py-1 rounded hover:bg-surface"
      >
        ✎
      </button>
      <button onClick={onClick} className="text-left w-full pr-5">
        <p className="font-display font-semibold text-ink">{espacio.nombre}</p>
        {espacio.unidaA ? (
          <p className="text-xs text-rock-bright mt-1">Unida a {espacio.unidaA}</p>
        ) : ocupada ? (
          <>
            <p className="text-sm text-ink mt-1">{formatoMoneda(espacio.totalConsumido)}</p>
            <p className="text-xs text-ink-muted mt-0.5">
              Abierta hace {espacio.tiempoAbiertaMinutos} min
              {espacio.descripcion ? ` · ${espacio.descripcion}` : ""}
              {espacio.mesasUnidas.length > 0 && ` · +${espacio.mesasUnidas.length} unida(s)`}
            </p>
          </>
        ) : (
          <p className="text-xs text-ink-muted mt-1">Libre — toca para abrir</p>
        )}
      </button>
    </div>
  );
}

export function MesasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [espacioParaAbrir, setEspacioParaAbrir] = useState<EspacioDTO | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [modalFormAbierto, setModalFormAbierto] = useState(false);
  const [espacioEditando, setEspacioEditando] = useState<EspacioDTO | null>(null);
  const [tipoNuevo, setTipoNuevo] = useState<"MESA" | "BARRA">("MESA");

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
    mutationFn: (vars: { id: string; descripcion?: string }) =>
      abrirEspacio(vars.id, vars.descripcion),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["espacios"] });
      queryClient.invalidateQueries({ queryKey: ["espacio", vars.id] });
      queryClient.invalidateQueries({ queryKey: ["pedidos", "espacio", vars.id] });
      setEspacioParaAbrir(null);
      setDescripcion("");
    },
  });

  function handleClickEspacio(espacio: EspacioDTO) {
    if (espacio.estado === "OCUPADA") {
      navigate(`/mesas/${espacio.id}`);
    } else {
      setEspacioParaAbrir(espacio);
    }
  }

  function abrirEdicion(espacio: EspacioDTO) {
    setEspacioEditando(espacio);
    setModalFormAbierto(true);
  }

  function abrirCreacion(tipo: "MESA" | "BARRA") {
    setEspacioEditando(null);
    setTipoNuevo(tipo);
    setModalFormAbierto(true);
  }

  function confirmarApertura() {
    if (!espacioParaAbrir) return;
    abrirMutation.mutate({
      id: espacioParaAbrir.id,
      descripcion: descripcion.trim() ? descripcion.trim() : undefined,
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
        <p className="text-ink-muted text-sm mt-1">
          Toca una mesa libre para abrirla, una ocupada para ver el detalle, o el ✎ para editar su nombre
        </p>
      </header>

      {isLoading ? (
        <p className="text-ink-muted text-sm">Cargando...</p>
      ) : (
        <div className="flex flex-col gap-6">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted">
                Mesas
              </h2>
              <button
                onClick={() => abrirCreacion("MESA")}
                className="text-xs text-ink-muted hover:text-rock-bright underline"
              >
                + Nueva mesa
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {mesas.map((e) => (
                <EspacioCard
                  key={e.id}
                  espacio={e}
                  onClick={() => handleClickEspacio(e)}
                  onEditar={() => abrirEdicion(e)}
                />
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted">
                Barras
              </h2>
              <button
                onClick={() => abrirCreacion("BARRA")}
                className="text-xs text-ink-muted hover:text-rock-bright underline"
              >
                + Nueva barra
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {barras.map((e) => (
                <EspacioCard
                  key={e.id}
                  espacio={e}
                  onClick={() => handleClickEspacio(e)}
                  onEditar={() => abrirEdicion(e)}
                />
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
            type="text"
            label="¿Quién está en la mesa? (opcional)"
            placeholder="Ej: Juan, cliente frecuente"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={200}
          />
          {abrirMutation.isError && (
            <p className="text-sm text-rock-bright">No se pudo abrir el espacio. Intenta de nuevo.</p>
          )}
          <Button onClick={confirmarApertura} disabled={abrirMutation.isPending} fullWidth>
            {abrirMutation.isPending ? "Abriendo..." : "Abrir"}
          </Button>
        </div>
      </Modal>

      <EspacioFormModal
        open={modalFormAbierto}
        onClose={() => setModalFormAbierto(false)}
        editando={espacioEditando}
        tipoPorDefecto={tipoNuevo}
      />
    </div>
  );
}
