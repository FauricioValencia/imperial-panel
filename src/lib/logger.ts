import winston from "winston";

const { combine, timestamp, json, printf, colorize } = winston.format;

// Formato legible para desarrollo local
const formatoDesarrollo = printf(({ level, message, timestamp, ...meta }) => {
  const datos = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
  return `${timestamp} [${level}]: ${message} ${datos}`;
});

// Crear logger base
const transports: winston.transport[] = [];

if (process.env.NODE_ENV === "production") {
  // En produccion, se usa Google Cloud Logging
  // El transport se agrega condicionalmente para evitar importar el modulo en desarrollo
  transports.push(new winston.transports.Console({ format: combine(timestamp(), json()) }));

  // Si esta en Google Cloud, agregar el transport de Cloud Logging
  if (process.env.GOOGLE_CLOUD_PROJECT) {
    import("@google-cloud/logging-winston").then(({ LoggingWinston }) => {
      const cloudTransport = new LoggingWinston({
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
        logName: "imperial-app",
      });
      logger.add(cloudTransport);
    });
  }
} else {
  // En desarrollo, console con colores
  transports.push(
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: "HH:mm:ss" }), formatoDesarrollo),
    })
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  defaultMeta: { servicio: "imperial-app" },
  transports,
});

// Helpers para operaciones de negocio
export function logOperacion(
  accion: string,
  datos: Record<string, unknown>,
  usuario_id?: string
) {
  logger.info(accion, { ...datos, usuario_id, tipo: "operacion" });
}

export function logError(
  accion: string,
  error: unknown,
  datos?: Record<string, unknown>
) {
  const mensaje = error instanceof Error ? error.message : String(error);
  logger.error(accion, { error: mensaje, ...datos, tipo: "error" });
}

export function logAuth(accion: string, usuario_id: string, ip?: string) {
  logger.info(accion, { usuario_id, ip, tipo: "auth" });
}
