import { TableroProduccion } from "../../components/production/TableroProduccion";
import { listarParaBarra, terminarTodosBarra } from "../../services/pedidoService";

export function BarraPage() {
  return (
    <TableroProduccion
      titulo="Barra"
      area="BARRA"
      queryKey={["pedidos", "barra"]}
      queryFn={listarParaBarra}
      terminarTodosFn={terminarTodosBarra}
    />
  );
}
