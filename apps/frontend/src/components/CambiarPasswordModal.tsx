import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { cambiarPassword } from "../services/authService";
import { ApiError } from "../services/api";

export function CambiarPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  function cerrar() {
    setPasswordActual("");
    setPasswordNueva("");
    setPasswordConfirmar("");
    setError(null);
    setExito(false);
    onClose();
  }

  const mutation = useMutation({
    mutationFn: () => cambiarPassword(passwordActual, passwordNueva),
    onSuccess: () => {
      setExito(true);
      setPasswordActual("");
      setPasswordNueva("");
      setPasswordConfirmar("");
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "No se pudo cambiar la contraseña"),
  });

  const coincide = passwordNueva === passwordConfirmar;
  const esValida = passwordActual.length > 0 && passwordNueva.length >= 8 && coincide;

  return (
    <Modal open={open} onClose={cerrar} title="Cambiar contraseña">
      {exito ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink">
            Tu contraseña se cambió correctamente. La próxima vez que inicies sesión, usa la nueva.
          </p>
          <Button fullWidth onClick={cerrar}>
            Listo
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Input
            type="password"
            label="Contraseña actual"
            value={passwordActual}
            onChange={(e) => setPasswordActual(e.target.value)}
          />
          <Input
            type="password"
            label="Contraseña nueva (mínimo 8 caracteres)"
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
          />
          <Input
            type="password"
            label="Confirmar contraseña nueva"
            value={passwordConfirmar}
            onChange={(e) => setPasswordConfirmar(e.target.value)}
          />
          {passwordConfirmar.length > 0 && !coincide && (
            <p className="text-sm text-rock-bright">Las contraseñas no coinciden.</p>
          )}
          {error && <p className="text-sm text-rock-bright">{error}</p>}
          <Button
            fullWidth
            disabled={!esValida || mutation.isPending}
            onClick={() => {
              setError(null);
              mutation.mutate();
            }}
          >
            {mutation.isPending ? "Cambiando..." : "Cambiar contraseña"}
          </Button>
        </div>
      )}
    </Modal>
  );
}
