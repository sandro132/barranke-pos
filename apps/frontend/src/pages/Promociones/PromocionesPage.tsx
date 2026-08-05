import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { formatoMoneda } from "../../utils/format";
import { ApiError } from "../../services/api";
import { listarProductos } from "../../services/productoService";
import {
  actualizarPromocion,
  crearPromocion,
  eliminarPromocion,
  listarPromociones,
  PromocionDTO,
  PromocionInput,
} from "../../services/promocionService";

const TIPOS = [
  { valor: "HAPPY_HOUR", etiqueta: "Happy Hour" },
  { valor: "DOS_POR_UNO", etiqueta: "2x1" },
  { valor: "COMBO", etiqueta: "Combo (N unidades por $X)" },
  { valor: "DESCUENTO", etiqueta: "Descuento" },
];

const VACIO = {
  nombre: "",
  tipo: "DESCUENTO",
  activa: false,
  horaInicio: "",
  horaFin: "",
  diasSemana: "",
  valor: "",
  productoId: "",
  cantidadRequerida: "",
  precioCombo: "",
};

function PromocionFormModal({
  open,
  onClose,
  editando,
}: {
  open: boolean;
  onClose: () => void;
  editando: PromocionDTO | null;
}) {
  const queryClient = useQueryClient();
  const [valores, setValores] = useState(VACIO);
  const [error, setError] = useState<string | null>(null);

  const productosQuery = useQuery({
    queryKey: ["productos", "activos-promo"],
    queryFn: () => listarProductos({ activo: true }),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (editando) {
      setValores({
        nombre: editando.nombre,
        tipo: editando.tipo,
        activa: editando.activa,
        horaInicio: editando.horaInicio ?? "",
        horaFin: editando.horaFin ?? "",
        diasSemana: editando.diasSemana ?? "",
        valor: editando.valor !== null ? String(editando.valor) : "",
        productoId: editando.productoId ?? "",
        cantidadRequerida: editando.cantidadRequerida !== null ? String(editando.cantidadRequerida) : "",
        precioCombo: editando.precioCombo !== null ? String(editando.precioCombo) : "",
      });
    } else {
      setValores(VACIO);
    }
    setError(null);
  }, [open, editando]);

  const esCombo = valores.tipo === "COMBO";

  const guardarMutation = useMutation({
    mutationFn: () => {
      const data: PromocionInput = {
        nombre: valores.nombre,
        tipo: valores.tipo,
        activa: valores.activa,
        horaInicio: valores.horaInicio || undefined,
        horaFin: valores.horaFin || undefined,
        diasSemana: valores.diasSemana || undefined,
        valor: valores.valor ? Number(valores.valor) : undefined,
        productoId: esCombo ? valores.productoId || undefined : undefined,
        cantidadRequerida: esCombo && valores.cantidadRequerida ? Number(valores.cantidadRequerida) : undefined,
        precioCombo: esCombo && valores.precioCombo ? Number(valores.precioCombo) : undefined,
      };
      return editando ? actualizarPromocion(editando.id, data) : crearPromocion(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promociones"] });
      onClose();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo guardar"),
  });

  const comboValido = !esCombo || (valores.productoId && valores.cantidadRequerida && valores.precioCombo);

  return (
    <Modal open={open} onClose={onClose} title={editando ? "Editar promoción" : "Nueva promoción"}>
      <div className="flex flex-col gap-4">
        <Input
          label="Nombre"
          placeholder="Ej: Empanadas x5"
          value={valores.nombre}
          onChange={(e) => setValores((p) => ({ ...p, nombre: e.target.value }))}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-muted">Tipo</label>
          <select
            value={valores.tipo}
            onChange={(e) => setValores((p) => ({ ...p, tipo: e.target.value }))}
            className="bg-surface border border-border rounded-md px-4 py-3 text-ink focus:border-rock transition-colors"
          >
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.etiqueta}
              </option>
            ))}
          </select>
        </div>

        {esCombo ? (
          <>
            <p className="text-xs text-ink-muted">
              Se aplica solo: cuando alguien agregue esta cantidad (o más) del producto a un pedido, se
              cobra el precio del combo automáticamente.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-ink-muted">Producto</label>
              <select
                value={valores.productoId}
                onChange={(e) => setValores((p) => ({ ...p, productoId: e.target.value }))}
                className="bg-surface border border-border rounded-md px-4 py-3 text-ink focus:border-rock transition-colors"
              >
                <option value="">Selecciona un producto...</option>
                {productosQuery.data?.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.nombre} ({formatoMoneda(prod.precio)} c/u normal)
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                min={1}
                label="Cantidad requerida"
                placeholder="5"
                value={valores.cantidadRequerida}
                onChange={(e) => setValores((p) => ({ ...p, cantidadRequerida: e.target.value }))}
              />
              <Input
                type="number"
                min={0}
                label="Precio del combo (total)"
                placeholder="6000"
                value={valores.precioCombo}
                onChange={(e) => setValores((p) => ({ ...p, precioCombo: e.target.value }))}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Hora inicio"
                placeholder="16:00"
                value={valores.horaInicio}
                onChange={(e) => setValores((p) => ({ ...p, horaInicio: e.target.value }))}
              />
              <Input
                label="Hora fin"
                placeholder="19:00"
                value={valores.horaFin}
                onChange={(e) => setValores((p) => ({ ...p, horaFin: e.target.value }))}
              />
            </div>
            <Input
              label="Días de la semana"
              placeholder="LUN,MAR,MIE"
              value={valores.diasSemana}
              onChange={(e) => setValores((p) => ({ ...p, diasSemana: e.target.value }))}
            />
            <Input
              type="number"
              min={0}
              label="Valor (% o monto, según el tipo)"
              placeholder="20"
              value={valores.valor}
              onChange={(e) => setValores((p) => ({ ...p, valor: e.target.value }))}
            />
            <p className="text-xs text-ink-muted">
              Este tipo todavía solo se guarda, no se aplica automáticamente — de momento, únicamente los
              combos se conectan de verdad al flujo de pedidos.
            </p>
          </>
        )}

        <label className="flex items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={valores.activa}
            onChange={(e) => setValores((p) => ({ ...p, activa: e.target.checked }))}
          />
          Activa
        </label>

        {error && <p className="text-sm text-rock-bright">{error}</p>}

        <Button
          fullWidth
          disabled={!valores.nombre.trim() || !comboValido || guardarMutation.isPending}
          onClick={() => guardarMutation.mutate()}
        >
          {guardarMutation.isPending ? "Guardando..." : editando ? "Guardar cambios" : "Crear promoción"}
        </Button>
      </div>
    </Modal>
  );
}

export function PromocionesPage() {
  const queryClient = useQueryClient();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<PromocionDTO | null>(null);

  const { data: promociones, isLoading } = useQuery({
    queryKey: ["promociones"],
    queryFn: listarPromociones,
  });

  const eliminarMutation = useMutation({
    mutationFn: (id: string) => eliminarPromocion(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["promociones"] }),
  });

  return (
    <div className="p-8">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">
            Promociones
          </h1>
          <p className="text-ink-muted text-sm mt-1">
            Los combos se aplican automáticamente al armar un pedido — el resto, por ahora, solo quedan
            guardados
          </p>
        </div>
        <Button
          onClick={() => {
            setEditando(null);
            setModalAbierto(true);
          }}
        >
          + Nueva promoción
        </Button>
      </header>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Cargando...</p>
      ) : promociones?.length === 0 ? (
        <p className="text-sm text-ink-muted">Todavía no hay promociones creadas.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {promociones?.map((p) => (
            <Card key={p.id}>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{p.nombre}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        p.activa ? "bg-rock text-ink" : "bg-surface-raised text-ink-muted"
                      }`}
                    >
                      {p.activa ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-1">
                    {TIPOS.find((t) => t.valor === p.tipo)?.etiqueta ?? p.tipo}
                    {p.tipo === "COMBO" && p.producto
                      ? ` · ${p.cantidadRequerida}× ${p.producto.nombre} por ${formatoMoneda(p.precioCombo ?? 0)}`
                      : ""}
                    {p.tipo !== "COMBO" && p.horaInicio && p.horaFin ? ` · ${p.horaInicio}–${p.horaFin}` : ""}
                    {p.tipo !== "COMBO" && p.diasSemana ? ` · ${p.diasSemana}` : ""}
                    {p.tipo !== "COMBO" && p.valor !== null ? ` · ${p.valor}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditando(p);
                      setModalAbierto(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="secondary"
                    className="text-rock-bright"
                    onClick={() => eliminarMutation.mutate(p.id)}
                    disabled={eliminarMutation.isPending}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PromocionFormModal open={modalAbierto} onClose={() => setModalAbierto(false)} editando={editando} />
    </div>
  );
}
