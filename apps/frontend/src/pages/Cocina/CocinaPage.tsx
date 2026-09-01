import { TableroProduccion } from "../../components/production/TableroProduccion";
import { listarParaCocina, terminarTodosCocina } from "../../services/pedidoService";

export function CocinaPage() {
  return (
    <TableroProduccion
      titulo="Cocina"
      area="COCINA"
      queryKey={["pedidos", "cocina"]}
      queryFn={listarParaCocina}
      terminarTodosFn={terminarTodosCocina}
    />
  );
}
