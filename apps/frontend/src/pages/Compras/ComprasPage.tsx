import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { formatoMoneda } from "../../utils/format";
import { listarCompras } from "../../services/compraService";

export function ComprasPage() {
  const navigate = useNavigate();
  const { data: compras, isLoading } = useQuery({ queryKey: ["compras"], queryFn: listarCompras });

  return (
    <div className="p-8">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">Compras</h1>
          <p className="text-ink-muted text-sm mt-1">Registro de compras a proveedores e inventario</p>
        </div>
        <Button onClick={() => navigate("/compras/nueva")}>+ Nueva compra</Button>
      </header>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Cargando...</p>
      ) : compras?.length === 0 ? (
        <p className="text-sm text-ink-muted">Todavía no se ha registrado ninguna compra.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {compras?.map((compra) => (
            <Card key={compra.id}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-display font-semibold text-ink">{compra.proveedor}</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {new Date(compra.fecha).toLocaleString("es-CO", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {compra.factura ? ` · Factura ${compra.factura}` : ""}
                  </p>
                </div>
                <p className="font-display text-xl font-bold text-ink">{formatoMoneda(compra.total)}</p>
              </div>
              <ul className="flex flex-col gap-1 mt-2">
                {compra.items.map((item) => {
                  const nombre = item.producto?.nombre ?? item.ingrediente?.nombre ?? "—";
                  return (
                    <li key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-ink-muted">
                        {item.cantidad}× {nombre}
                      </span>
                      <span className="text-ink-muted">
                        {formatoMoneda(item.costoUnitario)} c/u
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
