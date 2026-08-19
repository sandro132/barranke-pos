import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { useAuthStore } from "../stores/authStore";
import { useSocketConnection } from "../hooks/useSocketConnection";
import { CambiarPasswordModal } from "../components/CambiarPasswordModal";

// roles: [] significa "solo Admin" (ADMIN siempre pasa cualquier chequeo,
// igual que en el backend — ver RequireRole).
const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true, roles: [] as string[] },
  { to: "/cuentas", label: "Cuentas", roles: ["MESERO"] },
  { to: "/cocina", label: "Cocina", roles: ["COCINA"] },
  { to: "/barra", label: "Barra", roles: ["BAR"] },
  { to: "/consumo-interno", label: "Consumo interno", roles: ["MESERO", "COCINA", "BAR"] },
  { to: "/clientes", label: "Clientes", roles: ["MESERO"] },
  { to: "/productos", label: "Productos", roles: [] as string[] },
  { to: "/ingredientes", label: "Ingredientes", roles: [] as string[] },
  { to: "/caja", label: "Caja", roles: [] as string[] },
  { to: "/ventas", label: "Ventas", roles: [] as string[] },
  { to: "/compras", label: "Compras", roles: [] as string[] },
  { to: "/gastos", label: "Gastos", roles: [] as string[] },
  { to: "/reportes", label: "Reportes", roles: [] as string[] },
  { to: "/promociones", label: "Promociones", roles: [] as string[] },
  { to: "/usuarios", label: "Usuarios", roles: [] as string[] },
];

export function AppLayout() {
  useSocketConnection();
  const [modalPasswordAbierto, setModalPasswordAbierto] = useState(false);
  // Controla el menú en pantallas angostas (celular). En pantallas grandes
  // el sidebar siempre está visible y este estado no tiene efecto.
  const [menuAbierto, setMenuAbierto] = useState(false);

  const usuario = useAuthStore((s) => s.usuario);
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);

  const itemsVisibles = NAV_ITEMS.filter(
    (item) => usuario?.rol === "ADMIN" || item.roles.includes(usuario?.rol ?? "")
  );

  return (
    <div className="min-h-screen bg-base flex">
      {/* Barra superior solo visible en pantallas angostas, con el botón de menú */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-14 bg-surface border-b border-border flex items-center justify-between px-4 z-30">
        <h1 className="font-display font-bold uppercase text-lg tracking-wide text-ink leading-tight">
          Barranke<span className="text-rock-bright italic">Rock</span>
        </h1>
        <button
          onClick={() => setMenuAbierto(true)}
          aria-label="Abrir menú"
          className="text-ink text-2xl leading-none p-2 -mr-2"
        >
          ☰
        </button>
      </header>

      {/* Fondo oscuro detrás del menú al abrirlo en celular; tocarlo lo cierra */}
      {menuAbierto && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      <aside
        className={`
          w-64 shrink-0 bg-surface border-r border-border flex flex-col
          fixed inset-y-0 left-0 z-50 transition-transform duration-200
          ${menuAbierto ? "translate-x-0" : "-translate-x-full"}
          lg:static lg:translate-x-0 lg:z-auto
        `}
      >
        <div className="px-5 py-6 flex items-start justify-between">
          <div>
            <h1 className="font-display font-bold uppercase text-xl tracking-wide text-ink leading-tight">
              Barranke<span className="text-rock-bright italic">Rock</span>
            </h1>
            <div className="h-0.5 w-10 bg-rock mt-2" />
          </div>
          <button
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
            className="lg:hidden text-ink-muted text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
          {itemsVisibles.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuAbierto(false)}
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
        </nav>

        <div className="px-3 py-4 border-t border-border">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm text-ink font-medium truncate">{usuario?.nombre}</p>
            <p className="text-xs text-ink-muted truncate">{usuario?.email}</p>
          </div>
          <button
            onClick={() => setModalPasswordAbierto(true)}
            className="w-full text-left px-3 py-2 rounded-md text-sm text-ink-muted hover:text-ink hover:bg-surface-raised transition-colors"
          >
            Cambiar contraseña
          </button>
          <button
            onClick={cerrarSesion}
            className="w-full text-left px-3 py-2 rounded-md text-sm text-ink-muted hover:text-rock-bright hover:bg-surface-raised transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* pt-14 en celular para no quedar tapado por la barra superior fija */}
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        <Outlet />
      </main>

      <CambiarPasswordModal open={modalPasswordAbierto} onClose={() => setModalPasswordAbierto(false)} />
    </div>
  );
}
