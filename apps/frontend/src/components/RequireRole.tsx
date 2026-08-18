import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { rutaInicioSegunRol } from "../utils/roles";

/**
 * Envuelve una ruta y solo la deja pasar si el usuario tiene alguno de los
 * roles permitidos (ADMIN siempre pasa, igual que en el backend). Si no,
 * lo manda a SU pantalla de inicio (no siempre "/" — eso causaría un loop
 * si "/" es justo lo que le está bloqueado).
 */
export function RequireRole({
  roles,
  children,
}: {
  roles: string[];
  children: React.ReactNode;
}) {
  const usuario = useAuthStore((s) => s.usuario);

  if (!usuario) return null;

  const tienePermiso = usuario.rol === "ADMIN" || roles.includes(usuario.rol);

  if (!tienePermiso) {
    return <Navigate to={rutaInicioSegunRol(usuario.rol)} replace />;
  }

  return <>{children}</>;
}
