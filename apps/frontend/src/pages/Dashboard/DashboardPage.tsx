import { useQuery } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { listarEspacios } from "../../services/espacioService";
import { listarIngredientes } from "../../services/ingredienteService";
import { listarParaCocina, listarParaBarra } from "../../services/pedidoService";

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
  const espacios = useQuery({ queryKey: ["espacios"], queryFn: listarEspacios });
  const stockBajo = useQuery({
    queryKey: ["ingredientes", "stockBajo"],
    queryFn: () => listarIngredientes(true),
  });
  const cocina = useQuery({ queryKey: ["pedidos", "cocina"], queryFn: listarParaCocina });
  const barra = useQuery({ queryKey: ["pedidos", "barra"], queryFn: listarParaBarra });

  const mesasOcupadas = espacios.data?.filter((e) => e.estado === "OCUPADA").length ?? 0;
  const totalEspacios = espacios.data?.length ?? 0;
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
          label="Mesas y barras ocupadas"
          value={espacios.isLoading ? "—" : `${mesasOcupadas} / ${totalEspacios}`}
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
        <StatCard label="Ventas del día" value="—" hint="Disponible en Fase 8 (Caja)" />
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
          Estado de mesas y barras
        </h2>
        {espacios.isLoading ? (
          <p className="text-sm text-ink-muted">Cargando...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {espacios.data?.map((e) => (
              <div
                key={e.id}
                className={`rounded-md border px-3 py-3 text-center ${
                  e.estado === "OCUPADA"
                    ? "border-rock bg-rock-dim/20"
                    : "border-border bg-surface-raised"
                }`}
              >
                <p className="text-sm font-medium text-ink">{e.nombre}</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {e.estado === "OCUPADA" ? `$${e.totalConsumido.toLocaleString("es-CO")}` : "Libre"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
