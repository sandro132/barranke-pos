import { create } from "zustand";
import { UsuarioPublicoDTO } from "@barranke/shared";

interface AuthState {
  token: string | null;
  usuario: UsuarioPublicoDTO | null;
  setSesion: (token: string, usuario: UsuarioPublicoDTO) => void;
  cerrarSesion: () => void;
}

/**
 * Guarda el token en localStorage manualmente (no es un Artifact, así que sí podemos
 * usar localStorage aquí sin problema) para que la sesión sobreviva un refresh de página.
 */
const TOKEN_KEY = "barranke_token";
const USUARIO_KEY = "barranke_usuario";

function cargarSesionInicial(): { token: string | null; usuario: UsuarioPublicoDTO | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const usuarioRaw = localStorage.getItem(USUARIO_KEY);
    return {
      token,
      usuario: usuarioRaw ? JSON.parse(usuarioRaw) : null,
    };
  } catch {
    return { token: null, usuario: null };
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...cargarSesionInicial(),

  setSesion: (token, usuario) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
    set({ token, usuario });
  },

  cerrarSesion: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USUARIO_KEY);
    set({ token: null, usuario: null });
  },
}));
