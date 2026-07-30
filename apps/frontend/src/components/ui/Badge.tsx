const COLORES: Record<string, string> = {
  LIBRE: "bg-surface-raised text-ink-muted",
  OCUPADA: "bg-rock text-ink",
  RESERVADA: "bg-yellow-900/40 text-yellow-300",
  PENDIENTE: "bg-surface-raised text-ink-muted",
  PREPARANDO: "bg-yellow-900/40 text-yellow-300",
  LISTO: "bg-green-900/40 text-green-300",
  ENTREGADO: "bg-surface-raised text-ink-muted",
  CANCELADO: "bg-red-950/60 text-red-400",
};

export function Badge({ estado }: { estado: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide ${
        COLORES[estado] ?? "bg-surface-raised text-ink-muted"
      }`}
    >
      {estado}
    </span>
  );
}
