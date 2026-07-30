import { TableroProduccion } from "../../components/production/TableroProduccion";
import { listarParaCocina } from "../../services/pedidoService";

export function CocinaPage() {
  return (
    <TableroProduccion titulo="Cocina" queryKey={["pedidos", "cocina"]} queryFn={listarParaCocina} />
  );
}
