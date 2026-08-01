import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { formatoMoneda } from "../../utils/format";
import { obtenerTicket } from "../../services/ventaService";

const ETIQUETAS_METODO: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA_BANCOLOMBIA: "Transferencia Bancolombia",
  NEQUI: "Nequi",
  DAVIPLATA: "Daviplata",
  TARJETA: "Tarjeta",
  FIADO: "Fiado",
  OTRO: "Otro",
};

export function TicketPage() {
  const { ventaId } = useParams<{ ventaId: string }>();
  const navigate = useNavigate();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", ventaId],
    queryFn: () => obtenerTicket(ventaId!),
    enabled: !!ventaId,
  });

  return (
    <div className="min-h-screen bg-base print:bg-white flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-xs flex gap-2 mb-4 print:hidden">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          ← Volver
        </Button>
        <Button onClick={() => window.print()} disabled={!ticket}>
          Imprimir
        </Button>
      </div>

      {isLoading || !ticket ? (
        <p className="text-sm text-ink-muted">Cargando ticket...</p>
      ) : (
        <div className="w-full max-w-xs bg-white text-black font-mono text-xs p-4 rounded shadow-lg print:shadow-none print:rounded-none">
          <div className="text-center mb-3">
            <p className="font-bold text-base tracking-wide">BARRANKE ROCK</p>
            <p className="text-[10px] tracking-widest">CAFÉ BAR</p>
          </div>

          <div className="border-t border-dashed border-black my-2" />

          <p>Mesa/Barra: {ticket.espacio}</p>
          <p>
            Fecha:{" "}
            {new Date(ticket.fecha).toLocaleString("es-CO", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
          <p>Atendió: {ticket.usuario}</p>

          <div className="border-t border-dashed border-black my-2" />

          {ticket.items.map((item, idx) => (
            <div key={idx} className="flex justify-between gap-2 mb-1">
              <span className="flex-1">
                {item.cantidad}x {item.nombre}
              </span>
              <span className="whitespace-nowrap">{formatoMoneda(item.subtotal)}</span>
            </div>
          ))}

          <div className="border-t border-dashed border-black my-2" />

          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatoMoneda(ticket.subtotal)}</span>
          </div>
          {ticket.descuento > 0 && (
            <div className="flex justify-between">
              <span>Descuento</span>
              <span>-{formatoMoneda(ticket.descuento)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm mt-1">
            <span>TOTAL</span>
            <span>{formatoMoneda(ticket.total)}</span>
          </div>

          <div className="border-t border-dashed border-black my-2" />

          <p>Método de pago: {ETIQUETAS_METODO[ticket.metodoPago] ?? ticket.metodoPago}</p>

          <div className="border-t border-dashed border-black my-3" />

          <div className="text-center">
            <p>¡Gracias por tu visita!</p>
            <p className="font-bold mt-1">PURO ROCK Y BUEN AMBIENTE</p>
          </div>
        </div>
      )}
    </div>
  );
}
