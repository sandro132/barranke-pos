// Copia dev.db a una carpeta backups/ con fecha y hora en el nombre.
// Conserva solo los últimos 30 respaldos para no llenar el disco.
// Uso: npm run backup (desde apps/backend)
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "dev.db");
const backupsDir = path.join(__dirname, "..", "backups");

if (!fs.existsSync(dbPath)) {
  console.error(`No se encontró la base de datos en ${dbPath}`);
  process.exit(1);
}

if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const destino = path.join(backupsDir, `dev-${timestamp}.db`);

fs.copyFileSync(dbPath, destino);
console.log(`✔ Respaldo creado: ${destino}`);

const archivos = fs
  .readdirSync(backupsDir)
  .filter((f) => f.endsWith(".db"))
  .map((f) => ({
    nombre: f,
    ruta: path.join(backupsDir, f),
    tiempo: fs.statSync(path.join(backupsDir, f)).mtimeMs,
  }))
  .sort((a, b) => b.tiempo - a.tiempo);

const LIMITE_RESPALDOS = 30;
const aBorrar = archivos.slice(LIMITE_RESPALDOS);

for (const archivo of aBorrar) {
  fs.unlinkSync(archivo.ruta);
  console.log(`  (borrado respaldo antiguo: ${archivo.nombre})`);
}
