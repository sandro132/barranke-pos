import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { ApiError } from "../../services/api";
import { useAuthStore } from "../../stores/authStore";
import {
  actualizarUsuario,
  crearUsuario,
  listarUsuarios,
  resetearPasswordUsuario,
  UsuarioDTO,
} from "../../services/usuarioService";

const ROLES = [
  { valor: "ADMIN", etiqueta: "Admin", descripcion: "Acceso completo a todo" },
  { valor: "MESERO", etiqueta: "Mesero", descripcion: "Cuentas, pedidos, clientes" },
  { valor: "COCINA", etiqueta: "Cocina", descripcion: "Solo la pantalla de Cocina" },
  { valor: "BAR", etiqueta: "Bar", descripcion: "Solo la pantalla de Barra" },
];

function CrearUsuarioModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("MESERO");
  const [error, setError] = useState<string | null>(null);

  function cerrar() {
    setNombre("");
    setEmail("");
    setPassword("");
    setRol("MESERO");
    setError(null);
    onClose();
  }

  const mutation = useMutation({
    mutationFn: () => crearUsuario({ nombre, email, password, rol }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      cerrar();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo crear"),
  });

  return (
    <Modal open={open} onClose={cerrar} title="Nuevo usuario">
      <div className="flex flex-col gap-4">
        <Input label="Nombre" placeholder="Ej: Andrés" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Input
          type="email"
          label="Email"
          placeholder="andres@barranke.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          label="Contraseña (mínimo 8 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-ink-muted">Rol</label>
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            className="bg-surface border border-border rounded-md px-4 py-3 text-ink focus:border-rock transition-colors"
          >
            {ROLES.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.etiqueta} — {r.descripcion}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-rock-bright">{error}</p>}
        <Button
          fullWidth
          disabled={!nombre.trim() || !email.trim() || password.length < 8 || mutation.isPending}
          onClick={() => {
            setError(null);
            mutation.mutate();
          }}
        >
          {mutation.isPending ? "Creando..." : "Crear usuario"}
        </Button>
      </div>
    </Modal>
  );
}

function ResetearPasswordModal({
  usuario,
  onClose,
}: {
  usuario: UsuarioDTO | null;
  onClose: () => void;
}) {
  const [passwordNueva, setPasswordNueva] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  function cerrar() {
    setPasswordNueva("");
    setError(null);
    setExito(false);
    onClose();
  }

  const mutation = useMutation({
    mutationFn: () => resetearPasswordUsuario(usuario!.id, passwordNueva),
    onSuccess: () => setExito(true),
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo cambiar"),
  });

  return (
    <Modal open={!!usuario} onClose={cerrar} title={`Resetear contraseña — ${usuario?.nombre ?? ""}`}>
      {exito ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink">Contraseña cambiada. Avísale a {usuario?.nombre} la nueva.</p>
          <Button fullWidth onClick={cerrar}>
            Listo
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Input
            type="password"
            label="Contraseña nueva (mínimo 8 caracteres)"
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
          />
          {error && <p className="text-sm text-rock-bright">{error}</p>}
          <Button
            fullWidth
            disabled={passwordNueva.length < 8 || mutation.isPending}
            onClick={() => {
              setError(null);
              mutation.mutate();
            }}
          >
            {mutation.isPending ? "Guardando..." : "Cambiar contraseña"}
          </Button>
        </div>
      )}
    </Modal>
  );
}

export function UsuariosPage() {
  const queryClient = useQueryClient();
  const usuarioActual = useAuthStore((s) => s.usuario);
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [reseteando, setReseteando] = useState<UsuarioDTO | null>(null);

  const { data: usuarios, isLoading } = useQuery({ queryKey: ["usuarios"], queryFn: listarUsuarios });

  const cambiarRolMutation = useMutation({
    mutationFn: (vars: { id: string; rol: string }) => actualizarUsuario(vars.id, { rol: vars.rol }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });

  const toggleActivoMutation = useMutation({
    mutationFn: (vars: { id: string; activo: boolean }) => actualizarUsuario(vars.id, { activo: vars.activo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });

  return (
    <div className="p-8">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display uppercase text-2xl font-bold tracking-wide text-ink">
            Usuarios
          </h1>
          <p className="text-ink-muted text-sm mt-1">
            El personal del bar y qué puede ver/hacer cada uno
          </p>
        </div>
        <Button onClick={() => setModalCrearAbierto(true)}>+ Nuevo usuario</Button>
      </header>

      {isLoading ? (
        <p className="text-sm text-ink-muted">Cargando...</p>
      ) : (
        <div className="flex flex-col gap-2">
          {usuarios?.map((u) => {
            const esUnoMismo = u.id === usuarioActual?.id;
            return (
              <Card key={u.id} className={!u.activo ? "opacity-50" : ""}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-ink">{u.nombre}</p>
                      {!u.activo && (
                        <span className="text-xs px-2 py-0.5 rounded bg-surface-raised text-ink-muted">
                          Inactivo
                        </span>
                      )}
                      {esUnoMismo && (
                        <span className="text-xs px-2 py-0.5 rounded bg-rock-dim/30 text-rock-bright">
                          Tú
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted mt-1">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={u.rol}
                      disabled={esUnoMismo || cambiarRolMutation.isPending}
                      onChange={(e) => cambiarRolMutation.mutate({ id: u.id, rol: e.target.value })}
                      className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-ink focus:border-rock transition-colors disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r.valor} value={r.valor}>
                          {r.etiqueta}
                        </option>
                      ))}
                    </select>
                    <Button variant="secondary" onClick={() => setReseteando(u)}>
                      Resetear contraseña
                    </Button>
                    <Button
                      variant="secondary"
                      className={u.activo ? "text-rock-bright" : ""}
                      disabled={esUnoMismo || toggleActivoMutation.isPending}
                      onClick={() => toggleActivoMutation.mutate({ id: u.id, activo: !u.activo })}
                    >
                      {u.activo ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CrearUsuarioModal open={modalCrearAbierto} onClose={() => setModalCrearAbierto(false)} />
      <ResetearPasswordModal usuario={reseteando} onClose={() => setReseteando(null)} />
    </div>
  );
}
