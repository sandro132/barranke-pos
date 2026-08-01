import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "../../components/ui/Card";
import { formatoMoneda } from "../../utils/format";
import {
  obtenerCategoriasReporte,
  obtenerGanancias,
  obtenerInventarioReporte,
  obtenerMetodosPagoReporte,
  obtenerProductosReporte,
  obtenerVentasPorPeriodo,
} from "../../services/reporteService";

type Preset = "hoy" | "semana" | "mes" | "anio";

const ETIQUETAS_METODO: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA_BANCOLOMBIA: "Transferencia",
  NEQUI: "Nequi",
  DAVIPLATA: "Daviplata",
  TARJETA: "Tarjeta",
  FIADO: "Fiado",
  OTRO: "Otro",
};

const ETIQUETAS_CATEGORIA: Record<string, string> = {
  CERVEZA: "Cerveza",
  LICOR: "Licor",
  COMIDA: "Comida",
  COCTEL: "Cóctel",
  OTRO: "Otro",
};

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function calcularRango(preset: Preset): { desde: string; hasta: string; agrupacion: "dia" | "mes" } {
  const hoy = new Date();
  const hasta = toISODate(hoy);

  if (preset === "hoy") return { desde: hasta, hasta, agrupacion: "dia" };

  if (preset === "semana") {
    const desde = new Date(hoy);
    desde.setDate(desde.getDate() - 6);
    return { desde: toISODate(desde), hasta, agrupacion: "dia" };
  }

  if (preset === "mes") {
    const desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    return { desde: toISODate(desde), hasta, agrupacion: "dia" };
  }

  // anio
  const desde = new Date(hoy.getFullYear(), 0, 1);
  return { desde: toISODate(desde), hasta, agrupacion: "mes" };
}

function BarraProporcional({ etiqueta, valor, max, formato }: { etiqueta: string; valor: number; max: number; formato: (v: number) => string }) {
  const porcentaje = max > 0 ? Math.max((valor / max) * 100, 2) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-ink">{etiqueta}</span>
        <span className="text-ink-muted">{formato(valor)}</span>
      </div>
      <div className="h-2 bg-surface-raised rounded-full overflow-hidden">
        <div className="h-full bg-rock rounded-full" style={{ width: `${porcentaje}%` }} />
      </div>
    </div>
  );
}

export function ReportesPage() {
  const [preset, setPreset] = useState<Preset>("mes");
  const { desde, hasta, agrupacion } = useMemo(() => calcularRango(preset), [preset]);

  const ventasQuery = useQuery({
    queryKey: ["reportes", "ventas", desde, hasta, agrupacion],
    queryFn: () => obtenerVentasPorPeriodo(desde, hasta, agrupacion),
  });
  const gananciasQuery = useQuery({
    queryKey: ["reportes", "ganancias", desde, hasta],
    queryFn: () => obtenerGanancias(desde, hasta),
  });
  const productosQuery = useQuery({
    queryKey: ["reportes", "productos", desde, hasta],
    queryFn: () => obtenerProductosReporte(desde, hasta),
  });
  const metodosQuery = useQuery({
    queryKey: ["reportes", "metodos", desde, hasta],
    queryFn: () => obtenerMetodosPagoReporte(desde, hasta),
  });
  const categoriasQuery = useQuery({
    queryKey: ["reportes", "categorias", desde, hasta],
    queryFn: () => obtenerCategoriasReporte(desde, hasta),
  });
  const inventarioQuery = useQuery({
    queryKey: ["reportes", "inventario"],
    queryFn: obtenerInventarioReporte,
  });

  const maxMetodo = Math.max(1, ...(metodosQuery.data ?? []).map((m) => m.total));
  const maxCategoria = Math.max(1, ...(categoriasQuery.data ?? []).map((c) => c.total));
  const maxProducto = Math.max(
    1,
    ...(productosQuery.data?.masVendidos ?? []).map((p) => p.cantidad)
  );

  return (
    <div className="p-8">
      <header className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">Reportes</h1>
          <p className="text-ink-muted text-sm mt-1">
            {new Date(`${desde}T00:00:00`).toLocaleDateString("es-CO", { dateStyle: "medium" })} —{" "}
            {new Date(`${hasta}T00:00:00`).toLocaleDateString("es-CO", { dateStyle: "medium" })}
          </p>
        </div>
        <div className="flex gap-2">
          {(["hoy", "semana", "mes", "anio"] as Preset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                preset === p ? "bg-rock text-ink" : "bg-surface-raised text-ink-muted hover:text-ink"
              }`}
            >
              {{ hoy: "Hoy", semana: "7 días", mes: "Este mes", anio: "Este año" }[p]}
            </button>
          ))}
        </div>
      </header>

      {/* Ganancias */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-sm text-ink-muted">Ingresos</p>
          <p className="font-display text-2xl font-bold text-ink mt-1">
            {gananciasQuery.isLoading ? "—" : formatoMoneda(gananciasQuery.data?.ingresos ?? 0)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-ink-muted">Costos</p>
          <p className="font-display text-2xl font-bold text-ink mt-1">
            {gananciasQuery.isLoading ? "—" : formatoMoneda(gananciasQuery.data?.costos ?? 0)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-ink-muted">Ganancia</p>
          <p className="font-display text-2xl font-bold text-ink mt-1">
            {gananciasQuery.isLoading ? "—" : formatoMoneda(gananciasQuery.data?.ganancia ?? 0)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-ink-muted">Margen</p>
          <p className="font-display text-2xl font-bold text-ink mt-1">
            {gananciasQuery.isLoading ? "—" : `${(gananciasQuery.data?.margen ?? 0).toFixed(1)}%`}
          </p>
        </Card>
      </div>

      {/* Ventas por periodo */}
      <Card className="mb-6">
        <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-4">
          Ventas por periodo
        </h2>
        {ventasQuery.isLoading ? (
          <p className="text-sm text-ink-muted">Cargando...</p>
        ) : ventasQuery.data?.length === 0 ? (
          <p className="text-sm text-ink-muted">Sin ventas en este rango.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={ventasQuery.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2E2A30" />
              <XAxis dataKey="periodo" stroke="#9C97A0" fontSize={12} />
              <YAxis stroke="#9C97A0" fontSize={12} tickFormatter={(v) => formatoMoneda(v)} width={90} />
              <Tooltip
                contentStyle={{ background: "#201D22", border: "1px solid #2E2A30", borderRadius: 8 }}
                labelStyle={{ color: "#F3F1EE" }}
                formatter={(value: number) => formatoMoneda(value)}
              />
              <Bar dataKey="total" fill="#C5203D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Más vendidos */}
        <Card>
          <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-4">
            Más vendidos
          </h2>
          <div className="flex flex-col gap-3">
            {productosQuery.data?.masVendidos.map((p) => (
              <BarraProporcional
                key={p.nombre}
                etiqueta={p.nombre}
                valor={p.cantidad}
                max={maxProducto}
                formato={(v) => `${v}`}
              />
            ))}
          </div>
        </Card>

        {/* Menos vendidos */}
        <Card>
          <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-4">
            Menos vendidos
          </h2>
          <div className="flex flex-col gap-2">
            {productosQuery.data?.menosVendidos.map((p) => (
              <div key={p.nombre} className="flex items-center justify-between text-sm">
                <span className="text-ink">{p.nombre}</span>
                <span className="text-ink-muted">{p.cantidad} vendidos</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Métodos de pago */}
        <Card>
          <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-4">
            Ingresos por método de pago
          </h2>
          <div className="flex flex-col gap-3">
            {metodosQuery.data?.length === 0 && <p className="text-sm text-ink-muted">Sin ventas</p>}
            {metodosQuery.data?.map((m) => (
              <BarraProporcional
                key={m.metodo}
                etiqueta={ETIQUETAS_METODO[m.metodo] ?? m.metodo}
                valor={m.total}
                max={maxMetodo}
                formato={formatoMoneda}
              />
            ))}
          </div>
        </Card>

        {/* Categorías */}
        <Card>
          <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-4">
            Consumo por categoría
          </h2>
          <div className="flex flex-col gap-3">
            {categoriasQuery.data?.length === 0 && <p className="text-sm text-ink-muted">Sin ventas</p>}
            {categoriasQuery.data?.map((c) => (
              <BarraProporcional
                key={c.categoria}
                etiqueta={ETIQUETAS_CATEGORIA[c.categoria] ?? c.categoria}
                valor={c.total}
                max={maxCategoria}
                formato={formatoMoneda}
              />
            ))}
          </div>
        </Card>
      </div>

      {/* Inventario */}
      <Card>
        <h2 className="font-display uppercase text-sm font-semibold tracking-wide text-ink-muted mb-4">
          Inventario
        </h2>
        {inventarioQuery.isLoading ? (
          <p className="text-sm text-ink-muted">Cargando...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-ink-muted">Valor total en stock</p>
                <p className="font-display text-xl font-bold text-ink">
                  {formatoMoneda(inventarioQuery.data?.valorTotal ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">En productos</p>
                <p className="text-ink">{formatoMoneda(inventarioQuery.data?.valorProductos ?? 0)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">En ingredientes</p>
                <p className="text-ink">{formatoMoneda(inventarioQuery.data?.valorIngredientes ?? 0)}</p>
              </div>
            </div>

            {inventarioQuery.data && inventarioQuery.data.stockBajo.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="text-sm font-medium text-rock-bright mb-2">
                  {inventarioQuery.data.stockBajo.length} ingrediente(s) con stock bajo
                </p>
                <ul className="flex flex-col gap-1">
                  {inventarioQuery.data.stockBajo.map((i) => (
                    <li key={i.id} className="text-sm text-ink-muted flex justify-between">
                      <span>{i.nombre}</span>
                      <span>
                        {i.stock} {i.unidad.toLowerCase()} (mínimo: {i.stockMinimo})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
