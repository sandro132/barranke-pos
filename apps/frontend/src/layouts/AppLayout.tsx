import { NavLink, Outlet } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { useSocketConnection } from "../hooks/useSocketConnection";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/mesas", label: "Mesas y Barras" },
  { to: "/cocina", label: "Cocina" },
  { to: "/barra", label: "Barra" },
  { to: "/caja", label: "Caja" },
];

const PROXIMAMENTE = [{ label: "Reportes", fase: "Fase 11" }];

export function AppLayout() {
  useSocketConnection();

  const usuario = useAuthStore((s) => s.usuario);
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);

  return (
    <div className="min-h-screen bg-base flex">
      <aside className="w-60 shrink-0 bg-surface border-r border-border flex flex-col">
        <div className="px-5 py-6">
          <h1 className="font-display font-bold uppercase text-xl tracking-wide text-ink leading-tight">
            Barranke<span className="text-rock-bright italic">Rock</span>
          </h1>
          <div className="h-0.5 w-10 bg-rock mt-2" />
        </div>

        <nav className="flex-1 px-3 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-rock text-ink"
                    : "text-ink-muted hover:text-ink hover:bg-surface-raised"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}

          <p className="px-3 pt-4 pb-1 text-xs uppercase tracking-wide text-ink-muted/60">
            Próximamente
          </p>
          {PROXIMAMENTE.map((item) => (
            <div
              key={item.label}
              className="px-3 py-2.5 rounded-md text-sm text-ink-muted/50 flex justify-between cursor-not-allowed"
              title={`Disponible en ${item.fase}`}
            >
              <span>{item.label}</span>
              <span className="text-xs">{item.fase}</span>
            </div>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-border">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm text-ink font-medium truncate">{usuario?.nombre}</p>
            <p className="text-xs text-ink-muted truncate">{usuario?.email}</p>
          </div>
          <button
            onClick={cerrarSesion}
            className="w-full text-left px-3 py-2 rounded-md text-sm text-ink-muted hover:text-rock-bright hover:bg-surface-raised transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
