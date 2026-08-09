import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Badge } from "../../components/ui/Badge";
import { formatoMoneda } from "../../utils/format";
import {
  abrirCaja,
  CierreCajaResultadoDTO,
  cerrarCaja,
  obtenerCajaActual,
  registrarMovimiento,
} from "../../services/cajaService";
import { ApiError } from "../../services/api";
import { anularVenta } from "../../services/ventaService";
import { CambiarMetodoPagoModal, VentaParaCorregir } from "../../components/CambiarMetodoPagoModal";

const ETIQUETAS_METODO: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA_BANCOLOMBIA: "Transferencia",
  NEQUI: "Nequi",
  DAVIPLATA: "Daviplata",
  TARJETA: "Tarjeta",
  FIADO: "Fiado",
  OTRO: "Otro",
};

function FilaResumen({ etiqueta, valor, resaltado }: { etiqueta: string; valor: number; resaltado?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-muted">{etiqueta}</span>
      <span className={resaltado ? "font-display text-lg font-bold text-ink" : "text-ink"}>
        {formatoMoneda(valor)}
      </span>
    </div>
  );
}

function PantallaAbrirCaja() {
  const queryClient = useQueryClient();
  const [montoInicial, setMontoInicial] = useState("");
  const [error, setError] = useState<string | null>(null);

  const abrirMutation = useMutation({
    mutationFn: () => abrirCaja(Number(montoInicial) || 0),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caja", "actual"] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo abrir la caja"),
  });

  return (
    <div className="p-8 max-w-md">
      <header className="mb-6">
        <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">Caja</h1>
        <p className="text-ink-muted text-sm mt-1">No hay una caja abierta. Ábrela para empezar el día.</p>
        <Link to="/caja/historial" className="text-sm text-ink-muted hover:text-ink underline">
          Ver historial de cajas anteriores
        </Link>
      </header>

      <Card>
        <div className="flex flex-col gap-4">
          <Input
            type="number"
            min={0}
            label="Monto inicial en efectivo"
            placeholder="100000"
            value={montoInicial}
            onChange={(e) => setMontoInicial(e.target.value)}
          />
          {error && <p className="text-sm text-rock-bright">{error}</p>}
          <Button
            fullWidth
            onClick={() => {
              setError(null);
              abrirMutation.mutate();
            }}
            disabled={abrirMutation.isPending}
          >
            {abrirMutation.isPending ? "Abriendo..." : "Abrir caja"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function CajaPage() {
  const queryClient = useQueryClient();
  const [modalMovimiento, setModalMovimiento] = useState<"INGRESO" | "GASTO" | null>(null);
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [modalCierreAbierto, setModalCierreAbierto] = useState(false);
  const [montoContado, setMontoContado] = useState("");
  const [resultadoCierre, setResultadoCierre] = useState<CierreCajaResultadoDTO | null>(null);

  const cajaQuery = useQuery({ queryKey: ["caja", "actual"], queryFn: obtenerCajaActual });

  // Si la caja cambia (se cerró, o se abrió una nueva) mientras algún modal
  // seguía "abierto" en memoria, lo cerramos y limpiamos todo. Esto evita que
  // el resultado del cierre anterior reaparezca al abrir la caja siguiente,
  // en caso de que la pantalla haya cambiado antes de que el usuario alcanzara
  // a cerrar el modal manualmente con "Entendido".
  useEffect(() => {
    setModalCierreAbierto(false);
    setResultadoCierre(null);
    setMontoContado("");
    setModalMovimiento(null);
    setMonto("");
    setDescripcion("");
  }, [cajaQuery.data?.cajaId]);

  const movimientoMutation = useMutation({
    mutationFn: () => registrarMovimiento(modalMovimiento!, Number(monto) || 0, descripcion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caja", "actual"] });
      setModalMovimiento(null);
      setMonto("");
      setDescripcion("");
    },
  });

  const cerrarCajaMutation = useMutation({
    mutationFn: () => cerrarCaja(Number(montoContado) || 0),
    onSuccess: (data) => {
      setResultadoCierre(data);
      queryClient.invalidateQueries({ queryKey: ["caja", "actual"] });
    },
  });

  const [corrigiendo, setCorrigiendo] = useState<VentaParaCorregir | null>(null);

  const anularVentaMutation = useMutation({
    mutationFn: (ventaId: string) => anularVenta(ventaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caja", "actual"] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "reportes" });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "clientes" });
    },
  });

  if (cajaQuery.isLoading) {
    return <div className="p-8 text-ink-muted text-sm">Cargando...</div>;
  }

  if (!cajaQuery.data) {
    return <PantallaAbrirCaja />;
  }

  const caja = cajaQuery.data;

  return (
    <div className="p-8">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">Caja</h1>
          <p className="text-ink-muted text-sm mt-1">
            Abierta desde las{" "}
            {new Date(caja.fechaApertura).toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/caja/historial" className="self-center text-sm text-ink-muted hover:text-ink underline mr-2">
            Ver historial
          </Link>
          <Button
            variant="secondary"
            onClick={() => {
              setMonto("");
              setDescripcion("");
              setModalMovimiento("INGRESO");
            }}
          >
            + Ingreso
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setMonto("");
              setDescripcion("");
              setModalMovimiento("GASTO");
            }}
          >
            + Gasto
          </Button>
          <Button
            className="border-rock text-rock-bright"
            variant="secondary"
            onClick={() => {
              setResultadoCierre(null);
              setMontoContado("");
              setModalCierreAbierto(true);
            }}
          >
            Cerrar caja
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-3">
            Resumen
          </h2>
          <div className="flex flex-col gap-2">
            <FilaResumen etiqueta="Monto inicial" valor={caja.montoInicial} />
            <FilaResumen etiqueta="Ingresos manuales" valor={caja.ingresos} />
            <FilaResumen etiqueta="Gastos" valor={-caja.gastos} />
            <FilaResumen etiqueta="Ventas en efectivo" valor={caja.ventasEfectivo} />
            <div className="border-t border-border pt-2 mt-1">
              <FilaResumen etiqueta="Efectivo esperado" valor={caja.montoEsperadoEfectivo} resaltado />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-3">
            Ventas por método de pago
          </h2>
          <div className="flex flex-col gap-2">
            {Object.entries(caja.ventasPorMetodo).length === 0 && (
              <p className="text-sm text-ink-muted">Sin ventas todavía</p>
            )}
            {Object.entries(caja.ventasPorMetodo).map(([metodo, valor]) => (
              <FilaResumen key={metodo} etiqueta={ETIQUETAS_METODO[metodo] ?? metodo} valor={valor} />
            ))}
            <div className="border-t border-border pt-2 mt-1">
              <FilaResumen etiqueta="Total ventas" valor={caja.totalVentas} resaltado />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-3">
            Movimientos
          </h2>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
            {caja.movimientos.length === 0 && <p className="text-sm text-ink-muted">Sin movimientos</p>}
            {[...caja.movimientos].reverse().map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <div>
                  <Badge estado={m.tipo} />
                  <p className="text-xs text-ink-muted mt-0.5">{m.descripcion}</p>
                </div>
                <span className="text-ink">{formatoMoneda(m.monto)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-3">
          Ventas de esta caja
        </h2>
        {caja.ventas.length === 0 ? (
          <p className="text-sm text-ink-muted">Todavía no se ha cerrado ninguna mesa con esta caja abierta.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {[...caja.ventas].reverse().map((v) => (
              <div key={v.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                <div>
                  <p className="text-ink">{v.cuenta.nombre}</p>
                  <p className="text-xs text-ink-muted">
                    {new Date(v.fecha).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    {" · "}
                    {ETIQUETAS_METODO[v.metodoPago] ?? v.metodoPago}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-ink font-medium">{formatoMoneda(v.total)}</span>
                  <Link
                    to={`/ventas/${v.id}/ticket`}
                    target="_blank"
                    className="text-xs text-ink-muted hover:text-rock-bright underline"
                  >
                    Ver ticket
                  </Link>
                  <button
                    onClick={() =>
                      setCorrigiendo({
                        id: v.id,
                        cuentaNombre: v.cuenta.nombre,
                        total: v.total,
                        metodoPagoActual: v.metodoPago,
                      })
                    }
                    className="text-xs text-ink-muted hover:text-ink underline"
                  >
                    Corregir método
                  </button>
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `¿Anular la venta de ${v.cuenta.nombre} por ${formatoMoneda(v.total)}? Esto no se puede deshacer.`
                        )
                      ) {
                        anularVentaMutation.mutate(v.id);
                      }
                    }}
                    disabled={anularVentaMutation.isPending}
                    className="text-xs text-ink-muted hover:text-rock-bright underline"
                  >
                    Anular
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal registrar movimiento */}
      <Modal
        open={!!modalMovimiento}
        onClose={() => setModalMovimiento(null)}
        title={modalMovimiento === "INGRESO" ? "Registrar ingreso" : "Registrar gasto"}
      >
        <div className="flex flex-col gap-4">
          <Input
            type="number"
            min={0}
            label="Monto"
            placeholder="20000"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
          <Input
            label="Descripción"
            placeholder={modalMovimiento === "INGRESO" ? "Ej: propina en efectivo" : "Ej: compra de hielo"}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
          {movimientoMutation.isError && (
            <p className="text-sm text-rock-bright">No se pudo registrar. Intenta de nuevo.</p>
          )}
          <Button
            fullWidth
            disabled={movimientoMutation.isPending || !monto || !descripcion}
            onClick={() => movimientoMutation.mutate()}
          >
            {movimientoMutation.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </Modal>

      {/* Modal cerrar caja */}
      <Modal
        open={modalCierreAbierto}
        onClose={() => {
          setModalCierreAbierto(false);
          setResultadoCierre(null);
          setMontoContado("");
        }}
        title="Cerrar caja — Arqueo"
      >
        {!resultadoCierre ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-muted">
              Cuenta el efectivo físico en la caja ahora mismo y escribe el total.
            </p>
            <FilaResumen etiqueta="Efectivo esperado por el sistema" valor={caja.montoEsperadoEfectivo} />
            <Input
              type="number"
              min={0}
              label="Efectivo contado"
              placeholder="0"
              value={montoContado}
              onChange={(e) => setMontoContado(e.target.value)}
            />
            <Button
              fullWidth
              disabled={cerrarCajaMutation.isPending || !montoContado}
              onClick={() => cerrarCajaMutation.mutate()}
            >
              {cerrarCajaMutation.isPending ? "Cerrando..." : "Confirmar arqueo"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <FilaResumen etiqueta="Esperado" valor={resultadoCierre.montoEsperadoEfectivo} />
            <FilaResumen etiqueta="Contado" valor={resultadoCierre.montoContado} />
            <div className="border-t border-border pt-2">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted text-sm">Diferencia</span>
                <span
                  className={`font-display text-2xl font-bold ${
                    resultadoCierre.diferencia === 0
                      ? "text-ink"
                      : resultadoCierre.diferencia > 0
                        ? "text-green-400"
                        : "text-rock-bright"
                  }`}
                >
                  {resultadoCierre.diferencia > 0 ? "+" : ""}
                  {formatoMoneda(resultadoCierre.diferencia)}
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-1">
                {resultadoCierre.diferencia === 0
                  ? "Cuadró exacto."
                  : resultadoCierre.diferencia > 0
                    ? "Sobró efectivo respecto a lo esperado."
                    : "Faltó efectivo respecto a lo esperado."}
              </p>
            </div>
            <Button
              fullWidth
              onClick={() => {
                setModalCierreAbierto(false);
                setResultadoCierre(null);
                setMontoContado("");
              }}
            >
              Entendido
            </Button>
          </div>
        )}
      </Modal>

      <CambiarMetodoPagoModal venta={corrigiendo} onClose={() => setCorrigiendo(null)} />
    </div>
  );
}
