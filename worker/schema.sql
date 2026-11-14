-- Esquema de D1 para los reportes de ocupación. Se aplica con:
--   npx wrangler d1 execute rutapoli-ocupacion --local --file=worker/schema.sql   (pruebas locales)
--   npx wrangler d1 execute rutapoli-ocupacion --remote --file=worker/schema.sql  (producción)
CREATE TABLE IF NOT EXISTS reportes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lugar_id TEXT NOT NULL,
  nivel INTEGER NOT NULL CHECK (nivel BETWEEN 1 AND 4),
  creado INTEGER NOT NULL,          -- milisegundos desde 1970
  dispositivo TEXT NOT NULL,        -- hash del identificador aleatorio del dispositivo
  ip TEXT NOT NULL                  -- hash de la IP con sal diaria (nunca la IP real)
);
CREATE INDEX IF NOT EXISTS idx_reportes_creado ON reportes (creado);
CREATE INDEX IF NOT EXISTS idx_reportes_dispositivo ON reportes (dispositivo, creado);
CREATE INDEX IF NOT EXISTS idx_reportes_ip ON reportes (ip, creado);
CREATE INDEX IF NOT EXISTS idx_reportes_lugar ON reportes (lugar_id, dispositivo, creado);

-- Moderación manual: para bloquear un dispositivo o IP abusivos, inserta su hash aquí.
CREATE TABLE IF NOT EXISTS bloqueados (
  hash TEXT PRIMARY KEY,
  motivo TEXT,
  creado INTEGER NOT NULL
);
