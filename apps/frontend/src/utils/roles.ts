/** A qué pantalla se manda a cada rol justo después de iniciar sesión, o si
 * intenta entrar por URL directa a algo que no le corresponde. */
export function rutaInicioSegunRol(rol: string): string {
  if (rol === "COCINA") return "/cocina";
  if (rol === "BAR") return "/barra";
  if (rol === "MESERO") return "/cuentas";
  return "/"; // ADMIN
}
