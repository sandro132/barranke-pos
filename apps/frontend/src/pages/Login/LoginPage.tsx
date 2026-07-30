import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuthStore } from "../../stores/authStore";
import { login } from "../../services/authService";
import { ApiError } from "../../services/api";

export function LoginPage() {
  const navigate = useNavigate();
  const setSesion = useAuthStore((s) => s.setSesion);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const resultado = await login({ email, password });
      setSesion(resultado.token, resultado.usuario);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("No se pudo conectar con el servidor");
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="grain-texture min-h-screen bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-display font-bold uppercase text-4xl tracking-wide text-ink">
            Barranke
          </h1>
          <div className="h-1 w-16 bg-rock mx-auto my-3" />
          <p className="font-display uppercase text-sm tracking-[0.3em] text-ink-muted">
            Rock Café Bar
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-border rounded-lg p-6 flex flex-col gap-4"
        >
          <Input
            id="email"
            type="email"
            label="Correo"
            placeholder="admin@barranke.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
          <Input
            id="password"
            type="password"
            label="Contraseña"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && (
            <div className="bg-rock-dim/30 border border-rock text-ink text-sm rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <Button type="submit" disabled={cargando} fullWidth className="mt-2">
            {cargando ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
