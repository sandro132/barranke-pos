import { useEffect, useState } from "react";
import { getSocket } from "../sockets/socket";
import { SOCKET_EVENTS } from "@barranke/shared";

interface ItemPedidoSocket {
  areaPreparacion: string;
  estado: string;
  cantidad: number;
  producto: { nombre: string };
}

interface PedidoNuevoSocket {
  cuenta?: { nombre: string };
  items: ItemPedidoSocket[];
}

interface ItemActualizadoSocket {
  item: ItemPedidoSocket & { pedido?: { cuenta?: { nombre: string } } };
}

/**
 * Suena un tono corto sintetizado (sin archivo de audio que cargar) usando
 * la Web Audio API. `frecuencia` alta = tono más agudo.
 */
function reproducirTono(frecuencia: number, duracionMs: number) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const oscilador = ctx.createOscillator();
    const ganancia = ctx.createGain();
    oscilador.connect(ganancia);
    ganancia.connect(ctx.destination);
    oscilador.frequency.value = frecuencia;
    ganancia.gain.setValueAtTime(0.25, ctx.currentTime);
    ganancia.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracionMs / 1000);
    oscilador.start();
    oscilador.stop(ctx.currentTime + duracionMs / 1000);
  } catch {
    // Si el navegador bloquea el audio (por no haber interactuado con la
    // página todavía), simplemente no suena — no es un error crítico.
  }
}

/**
 * Alerta con sonido + notificación del navegador para Cocina/Barra: suena y
 * avisa cuando entra un ítem nuevo para esta área, y cuando alguno de sus
 * ítems queda LISTO. Funciona mientras la pestaña esté abierta (no requiere
 * configuración de push notifications ni funciona con el celular bloqueado).
 */
export function useAlertaProduccion(area: "COCINA" | "BARRA") {
  const [permisoConcedido, setPermisoConcedido] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );

  function activarAlertas() {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then((permiso) => setPermisoConcedido(permiso === "granted"));
    // Un sonido de prueba, para confirmar que el audio del navegador está
    // desbloqueado (los navegadores exigen una interacción del usuario
    // antes de dejar sonar cualquier audio).
    reproducirTono(660, 150);
  }

  function notificar(titulo: string, cuerpo: string) {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(titulo, { body: cuerpo, icon: "/pwa-192.png" });
    }
  }

  useEffect(() => {
    const socket = getSocket();

    function onPedidoNuevo(pedido: PedidoNuevoSocket) {
      const itemsDeEstaArea = (pedido.items ?? []).filter((i) => i.areaPreparacion === area);
      if (itemsDeEstaArea.length === 0) return;

      reproducirTono(880, 250);
      const resumen = itemsDeEstaArea.map((i) => `${i.cantidad}× ${i.producto.nombre}`).join(", ");
      notificar(`Nuevo pedido — ${pedido.cuenta?.nombre ?? ""}`, resumen);
    }

    function onItemActualizado(payload: ItemActualizadoSocket) {
      const item = payload.item;
      if (!item || item.areaPreparacion !== area || item.estado !== "LISTO") return;

      reproducirTono(1200, 180);
      const nombreCuenta = item.pedido?.cuenta?.nombre;
      notificar(`Listo — ${item.producto.nombre}`, nombreCuenta ? `Para ${nombreCuenta}` : "Listo para entregar");
    }

    socket.on(SOCKET_EVENTS.PEDIDO_NUEVO, onPedidoNuevo);
    socket.on(SOCKET_EVENTS.PEDIDO_ITEM_ACTUALIZADO, onItemActualizado);

    return () => {
      socket.off(SOCKET_EVENTS.PEDIDO_NUEVO, onPedidoNuevo);
      socket.off(SOCKET_EVENTS.PEDIDO_ITEM_ACTUALIZADO, onItemActualizado);
    };
  }, [area]);

  return { permisoConcedido, activarAlertas };
}
