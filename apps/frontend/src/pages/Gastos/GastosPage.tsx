import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { formatoMoneda } from "../../utils/format";
import { ApiError } from "../../services/api";
import { crearGasto, eliminarGasto, GastoDTO, listarGastos } from "../../services/gastoService";

const CATEGORIAS = [
  { valor: "ARRIENDO", etiqueta: "Arriendo" },
  { valor: "SERVICIOS", etiqueta: "Servicios (luz, agua, internet...)" },
  { valor: "NOMINA", etiqueta: "Nómina" },
  { valor: "OTRO", etiqueta: "Otro" },
];

function toISODate(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type Preset = "mes" | "anio" | "todos";

function calcularRango(preset: Preset) {
  const hoy = new Date();
  if (preset === "mes") {
    return { desde: toISODate(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: toISODate(hoy) };
  }
  if (preset === "anio") {
    return { desde: toISODate(new Date(hoy.getFullYear(), 0, 1)), hasta: toISODate(hoy) };
  }
  return { desde: undefined, hasta: undefined };
}

function NuevoGastoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState("ARRIENDO");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(toISODate(new Date()));
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);

  function cerrar() {
    setConcepto("");
    setCategoria("ARRIENDO");
    setMonto("");
    setFecha(toISODate(new Date()));
    setNotas("");
    setError(null);
    onClose();
  }

  const mutation = useMutation({
    mutationFn: () =>
      crearGasto({ concepto, categoria, monto: Number(monto), fecha, notas: notas || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gastos"] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "reportes" });
      cerrar();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo guardar"),
  });

  return (
    <Modal open={open} onClose={cerrar} title="Nuevo gasto">
      <div className="flex flex-col gap-4">
        <Input
          label="Concepto"
          placeholder="Ej: Arriendo local, Sueldo Ronald, Factura EPM..."
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-muted">Categoría</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="bg-surface border border-border rounded-md px-4 py-3 text-ink focus:border-rock transition-colors"
          >
            {CATEGORIAS.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.etiqueta}
              </option>
            ))}
          </select>
        </div>
        <Input type="number" min={0} label="Monto" placeholder="0" value={monto} onChange={(e) => setMonto(e.target.value)} />
        <Input
          type="date"
          label="Fecha"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />
        <Input
          label="Notas (opcional)"
          placeholder="Ej: mes de agosto"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
        {error && <p className="text-sm text-rock-bright">{error}</p>}
        <Button
          fullWidth
          disabled={!concepto.trim() || !monto || Number(monto) <= 0 || mutation.isPending}
          onClick={() => {
            setError(null);
            mutation.mutate();
          }}
        >
          {mutation.isPending ? "Guardando..." : "Registrar gasto"}
        </Button>
      </div>
    </Modal>
  );
}

export function GastosPage() {
  const queryClient = useQueryClient();
  const [preset, setPreset] = useState<Preset>("mes");
  const [modalAbierto, setModalAbierto] = useState(false);

  const { desde, hasta } = calcularRango(preset);

  const gastosQuery = useQuery({
    queryKey: ["gastos", desde, hasta],
    queryFn: () => listarGastos(desde, hasta),
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: string) => eliminarGasto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gastos"] });
      queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "reportes" });
    },
  });

  const total = (gastosQuery.data ?? []).reduce((sum, g) => sum + g.monto, 0);

  return (
    <div className="p-8">
      <header className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">
            Gastos operativos
          </h1>
          <p className="text-ink-muted text-sm mt-1">
            Arriendo, servicios, nómina — lo que hace que la ganancia neta sea real
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {(["mes", "anio", "todos"] as Preset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                preset === p ? "bg-rock text-ink" : "bg-surface-raised text-ink-muted hover:text-ink"
              }`}
            >
              {{ mes: "Este mes", anio: "Este año", todos: "Todos" }[p]}
            </button>
          ))}
          <Button onClick={() => setModalAbierto(true)}>+ Nuevo gasto</Button>
        </div>
      </header>

      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <span className="text-ink-muted text-sm">Total en el rango</span>
          <span className="font-display text-2xl font-bold text-ink">{formatoMoneda(total)}</span>
        </div>
      </Card>

      {gastosQuery.isLoading ? (
        <p className="text-sm text-ink-muted">Cargando...</p>
      ) : gastosQuery.data?.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-muted">No hay gastos registrados en este rango.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {gastosQuery.data?.map((g: GastoDTO) => (
            <Card key={g.id}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{g.concepto}</p>
                    <span className="text-xs px-2 py-0.5 rounded bg-surface-raised text-ink-muted">
                      {CATEGORIAS.find((c) => c.valor === g.categoria)?.etiqueta ?? g.categoria}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-1">
                    {new Date(g.fecha).toLocaleDateString("es-CO", { dateStyle: "medium" })}
                    {g.usuario ? ` · ${g.usuario.nombre}` : ""}
                    {g.notas ? ` · ${g.notas}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-display text-lg font-bold text-ink">{formatoMoneda(g.monto)}</p>
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Eliminar el gasto "${g.concepto}"?`)) {
                        eliminarMutation.mutate(g.id);
                      }
                    }}
                    disabled={eliminarMutation.isPending}
                    className="text-xs text-ink-muted hover:text-rock-bright underline"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <NuevoGastoModal open={modalAbierto} onClose={() => setModalAbierto(false)} />
    </div>
  );
}
