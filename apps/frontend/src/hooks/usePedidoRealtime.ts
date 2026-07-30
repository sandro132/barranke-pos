import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "../sockets/socket";
import { SOCKET_EVENTS } from "@barranke/shared";

/**
 * Se suscribe a los eventos de pedidos (nuevo pedido, ítem actualizado) y refresca
 * las queries indicadas. Usado por Cocina y Barra para que los pedidos aparezcan
 * y cambien de estado en pantalla sin que nadie tenga que recargar la página.
 */
export function usePedidoRealtime(queryKeys: unknown[][]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    const invalidar = () => {
      queryKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    };

    socket.on(SOCKET_EVENTS.PEDIDO_NUEVO, invalidar);
    socket.on(SOCKET_EVENTS.PEDIDO_ITEM_ACTUALIZADO, invalidar);

    return () => {
      socket.off(SOCKET_EVENTS.PEDIDO_NUEVO, invalidar);
      socket.off(SOCKET_EVENTS.PEDIDO_ITEM_ACTUALIZADO, invalidar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);
}
