import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { formatoMoneda } from "../../utils/format";
import { obtenerPrecuenta } from "../../services/espacioService";

export function PrecuentaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: precuenta, isLoading, error } = useQuery({
    queryKey: ["precuenta", id],
    queryFn: () => obtenerPrecuenta(id!),
    enabled: !!id,
  });

  return (
    <div className="min-h-screen bg-base print:bg-white flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-xs flex gap-2 mb-4 print:hidden">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          ← Volver
        </Button>
        <Button onClick={() => window.print()} disabled={!precuenta}>
          Imprimir
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Cargando precuenta...</p>
      ) : error || !precuenta ? (
        <p className="text-sm text-rock-bright">
          No se pudo cargar la precuenta (¿la mesa está unida a otra, o no tiene consumo?).
        </p>
      ) : (
        <div className="w-full max-w-xs bg-white text-black font-mono text-xs p-4 rounded shadow-lg print:shadow-none print:rounded-none">
          <div className="text-center mb-3">
            <p className="font-bold text-base tracking-wide">BARRANKE ROCK</p>
            <p className="text-[10px] tracking-widest">CAFÉ BAR</p>
          </div>

          <div className="border-t border-dashed border-black my-2" />

          <p>Mesa/Barra: {precuenta.espacio}</p>
          {precuenta.mesasUnidas.length > 0 && (
            <p>Unida a: {precuenta.mesasUnidas.join(", ")}</p>
          )}
          <p>
            Fecha: {new Date().toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
          </p>

          <div className="border-t border-dashed border-black my-2" />

          {precuenta.items.map((item, idx) => (
            <div key={idx} className="flex justify-between gap-2 mb-1">
              <span className="flex-1">
                {item.cantidad}x {item.nombre}
              </span>
              <span className="whitespace-nowrap">{formatoMoneda(item.subtotal)}</span>
            </div>
          ))}

          <div className="border-t border-dashed border-black my-2" />

          <div className="flex justify-between font-bold text-sm">
            <span>TOTAL</span>
            <span>{formatoMoneda(precuenta.total)}</span>
          </div>

          <div className="border-t border-dashed border-black my-3" />

          <div className="text-center">
            <p className="font-bold">PRECUENTA</p>
            <p className="text-[10px]">Este documento no es un comprobante de pago</p>
          </div>
        </div>
      )}
    </div>
  );
}
