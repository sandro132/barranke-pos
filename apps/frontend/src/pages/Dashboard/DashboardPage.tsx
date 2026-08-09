import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { listarCuentas } from "../../services/cuentaService";
import { listarIngredientes } from "../../services/ingredienteService";
import { listarParaCocina, listarParaBarra } from "../../services/pedidoService";
import { obtenerCajaActual } from "../../services/cajaService";
import { formatoMoneda } from "../../utils/format";

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <p className="text-sm text-ink-muted font-medium">{label}</p>
      <p className="font-display text-4xl font-bold text-ink mt-1">{value}</p>
      {hint && <p className="text-xs text-ink-muted mt-1">{hint}</p>}
    </Card>
  );
}

export function DashboardPage() {
  const cuentas = useQuery({ queryKey: ["cuentas"], queryFn: listarCuentas });
  const stockBajo = useQuery({
    queryKey: ["ingredientes", "stockBajo"],
    queryFn: () => listarIngredientes(true),
  });
  const cocina = useQuery({ queryKey: ["pedidos", "cocina"], queryFn: listarParaCocina });
  const barra = useQuery({ queryKey: ["pedidos", "barra"], queryFn: listarParaBarra });
  const caja = useQuery({ queryKey: ["caja", "actual"], queryFn: obtenerCajaActual });

  const cuentasAbiertas = cuentas.data?.length ?? 0;
  const pedidosPendientes = (cocina.data?.length ?? 0) + (barra.data?.length ?? 0);

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">
          Dashboard
        </h1>
        <p className="text-ink-muted text-sm mt-1">Vista general del bar en este momento</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Cuentas abiertas ahora"
          value={cuentas.isLoading ? "—" : cuentasAbiertas}
        />
        <StatCard
          label="Pedidos en preparación"
          value={cocina.isLoading || barra.isLoading ? "—" : pedidosPendientes}
          hint="Cocina + Barra"
        />
        <StatCard
          label="Ingredientes con stock bajo"
          value={stockBajo.isLoading ? "—" : stockBajo.data?.length ?? 0}
        />
        <StatCard
          label="Ventas del día"
          value={caja.isLoading ? "—" : caja.data ? formatoMoneda(caja.data.totalVentas) : "$0"}
          hint={caja.data ? undefined : "Caja cerrada"}
        />
      </div>

      {stockBajo.data && stockBajo.data.length > 0 && (
        <Card className="mb-6 border-rock">
          <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-rock-bright mb-3">
            Alerta de inventario bajo
          </h2>
          <ul className="flex flex-col gap-1.5">
            {stockBajo.data.map((ing) => (
              <li key={ing.id} className="text-sm text-ink flex justify-between">
                <span>{ing.nombre}</span>
                <span className="text-ink-muted">
                  {ing.stock} {ing.unidad.toLowerCase()} (mínimo: {ing.stockMinimo})
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-3">
          Cuentas abiertas
        </h2>
        {cuentas.isLoading ? (
          <p className="text-sm text-ink-muted">Cargando...</p>
        ) : cuentas.data?.length === 0 ? (
          <p className="text-sm text-ink-muted">No hay ninguna cuenta abierta ahora mismo.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {cuentas.data?.map((c) => (
              <div key={c.id} className="rounded-md border border-rock bg-rock-dim/20 px-3 py-3 text-center">
                <p className="text-sm font-medium text-ink">{c.nombre}</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {c.espacio ? `${c.espacio.nombre} · ` : ""}
                  {formatoMoneda(c.totalConsumido)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
