import { TableroProduccion } from "../../components/production/TableroProduccion";
import { listarParaBarra } from "../../services/pedidoService";

export function BarraPage() {
  return (
    <TableroProduccion
      titulo="Barra"
      area="BARRA"
      queryKey={["pedidos", "barra"]}
      queryFn={listarParaBarra}
    />
  );
}
