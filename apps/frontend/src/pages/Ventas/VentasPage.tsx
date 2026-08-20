import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { formatoMoneda } from "../../utils/format";
import { anularVenta, listarVentas } from "../../services/ventaService";
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

type Preset = "hoy" | "semana" | "mes" | "todas";

// OJO: nunca usar toISOString() aquí — convierte a UTC, y en horas de la
// noche eso hace que "hoy" se calcule como el día SIGUIENTE en Colombia.
function toISODate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calcularRango(preset: Preset): { desde?: string; hasta?: string } {
  const hoy = new Date();
  const hasta = toISODate(hoy);

  if (preset === "todas") return {};
  if (preset === "hoy") return { desde: hasta, hasta };
  if (preset === "semana") {
    const desde = new Date(hoy);
    desde.setDate(desde.getDate() - 6);
    return { desde: toISODate(desde), hasta };
  }
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  return { desde: toISODate(desde), hasta };
}

export function VentasPage() {
  const queryClient = useQueryClient();
  const [preset, setPreset] = useState<Preset>("semana");
  const [corrigiendo, setCorrigiendo] = useState<VentaParaCorregir | null>(null);
  const { desde, hasta } = useMemo(() => calcularRango(preset), [preset]);

  const ventasQuery = useQuery({
    queryKey: ["ventas", desde, hasta],
    queryFn: () => listarVentas(desde, hasta),
  });

  const anularMutation = useMutation({
    mutationFn: (id: string) => anularVenta(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ventas"] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "caja" });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "reportes" });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "clientes" });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "productos" });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "ingredientes" });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "cuentas" });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "cuenta" });
    },
  });

  return (
    <div className="p-8">
      <header className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">
            Todas las ventas
          </h1>
          <p className="text-ink-muted text-sm mt-1">
            Incluye ventas hechas sin caja abierta, que no aparecen en el historial de caja
          </p>
        </div>
        <div className="flex gap-2">
          {(["hoy", "semana", "mes", "todas"] as Preset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                preset === p ? "bg-rock text-ink" : "bg-surface-raised text-ink-muted hover:text-ink"
              }`}
            >
              {{ hoy: "Hoy", semana: "7 días", mes: "Este mes", todas: "Todas" }[p]}
            </button>
          ))}
        </div>
      </header>

      <Card>
        {ventasQuery.isLoading ? (
          <p className="text-sm text-ink-muted">Cargando...</p>
        ) : ventasQuery.data?.length === 0 ? (
          <p className="text-sm text-ink-muted">Sin ventas en este rango.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {ventasQuery.data?.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0"
              >
                <div>
                  <p className="text-ink">
                    {v.cuenta.nombre}
                    {v.cuenta.espacio && (
                      <span className="text-ink-muted"> ({v.cuenta.espacio.nombre})</span>
                    )}
                    {v.cliente && (
                      <span className="text-ink-muted"> · fiado a {v.cliente.nombre}</span>
                    )}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {new Date(v.fecha).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                    {" · "}
                    {ETIQUETAS_METODO[v.metodoPago] ?? v.metodoPago}
                    {!v.caja && (
                      <span className="text-rock-bright"> · sin caja asociada</span>
                    )}
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
                        anularMutation.mutate(v.id);
                      }
                    }}
                    disabled={anularMutation.isPending}
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
