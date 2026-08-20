import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { formatoMoneda } from "../../utils/format";
import { obtenerDetalleCaja } from "../../services/cajaService";
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

export function DetalleCajaHistorialPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: caja, isLoading } = useQuery({
    queryKey: ["caja", "historial", id],
    queryFn: () => obtenerDetalleCaja(id!),
    enabled: !!id,
  });

  const [corrigiendo, setCorrigiendo] = useState<VentaParaCorregir | null>(null);

  const anularVentaMutation = useMutation({
    mutationFn: (ventaId: string) => anularVenta(ventaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["caja", "historial", id] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "reportes" });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "clientes" });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "productos" });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "ingredientes" });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "cuentas" });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "cuenta" });
    },
  });

  if (isLoading || !caja) {
    return <div className="p-8 text-ink-muted text-sm">Cargando...</div>;
  }

  return (
    <div className="p-8">
      <button
        onClick={() => navigate("/caja/historial")}
        className="text-sm text-ink-muted hover:text-ink mb-4"
      >
        ← Volver al historial
      </button>

      <header className="mb-6">
        <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">
          Caja del {new Date(caja.fechaApertura).toLocaleDateString("es-CO", { dateStyle: "long" })}
        </h1>
        <p className="text-ink-muted text-sm mt-1">
          {new Date(caja.fechaApertura).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
          {caja.fechaCierre &&
            ` — ${new Date(caja.fechaCierre).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-3">
            Resumen
          </h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-muted">Monto inicial</span>
              <span className="text-ink">{formatoMoneda(caja.montoInicial)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Ingresos manuales</span>
              <span className="text-ink">{formatoMoneda(caja.ingresos)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Gastos</span>
              <span className="text-ink">-{formatoMoneda(caja.gastos)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Ventas en efectivo</span>
              <span className="text-ink">{formatoMoneda(caja.ventasEfectivo)}</span>
            </div>
            {caja.montoFinal !== null && (
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span className="text-ink-muted">Efectivo contado al cierre</span>
                <span className="text-ink">{formatoMoneda(caja.montoFinal)}</span>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-3">
            Ventas por método
          </h2>
          <div className="flex flex-col gap-2 text-sm">
            {Object.entries(caja.ventasPorMetodo).map(([metodo, valor]) => (
              <div key={metodo} className="flex justify-between">
                <span className="text-ink-muted">{ETIQUETAS_METODO[metodo] ?? metodo}</span>
                <span className="text-ink">{formatoMoneda(valor)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 flex justify-between font-bold">
              <span className="text-ink-muted">Total</span>
              <span className="text-ink">{formatoMoneda(caja.totalVentas)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-3">
            Movimientos
          </h2>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto text-sm">
            {caja.movimientos.map((m) => (
              <div key={m.id} className="flex items-center justify-between">
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

      <Card>
        <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-3">
          Ventas de esta caja
        </h2>
        {caja.ventas.length === 0 ? (
          <p className="text-sm text-ink-muted">Sin ventas.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {caja.ventas.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0"
              >
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

      <CambiarMetodoPagoModal venta={corrigiendo} onClose={() => setCorrigiendo(null)} />
    </div>
  );
}
