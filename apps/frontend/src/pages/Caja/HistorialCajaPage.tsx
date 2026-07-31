import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { formatoMoneda } from "../../utils/format";
import { listarHistorialCaja } from "../../services/cajaService";

export function HistorialCajaPage() {
  const navigate = useNavigate();
  const { data: historial, isLoading } = useQuery({
    queryKey: ["caja", "historial"],
    queryFn: listarHistorialCaja,
  });

  return (
    <div className="p-8">
      <button onClick={() => navigate("/caja")} className="text-sm text-ink-muted hover:text-ink mb-4">
        ← Volver a Caja
      </button>

      <header className="mb-6">
        <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">
          Historial de caja
        </h1>
        <p className="text-ink-muted text-sm mt-1">Cajas de días anteriores</p>
      </header>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Cargando...</p>
      ) : historial?.length === 0 ? (
        <p className="text-sm text-ink-muted">Todavía no hay cajas en el historial.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {historial?.map((c) => (
            <Link key={c.id} to={`/caja/historial/${c.id}`}>
              <Card className="hover:border-rock transition-colors">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-ink font-medium">
                      {new Date(c.fechaApertura).toLocaleDateString("es-CO", { dateStyle: "long" })}
                      {c.abierta && (
                        <span className="ml-2 text-xs text-rock-bright uppercase">Abierta</span>
                      )}
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {new Date(c.fechaApertura).toLocaleTimeString("es-CO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {c.fechaCierre &&
                        ` — ${new Date(c.fechaCierre).toLocaleTimeString("es-CO", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-ink-muted">
                      Inicial {formatoMoneda(c.montoInicial)}
                      {c.montoFinal !== null && ` · Final ${formatoMoneda(c.montoFinal)}`}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
