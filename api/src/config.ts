import { resolve } from "node:path";

export type Config = {
  host: string;
  port: number;
  logLevel: string;
  isProduction: boolean;
  corsOrigins: string[];
  cookieSecure: boolean;
  sessionTtlMs: number;
  adminUsername: string;
  adminPassword: string;
  dataDir: string;
  databasePath: string;
  requestsDir: string;
  projectRoot: string;
  docsBuildTask: "build:all:docs";
  deployScript: "frontend:deploy:ghpages";
  deployEnabled: boolean;
  jobPollIntervalMs: number;
  pipelineTimeoutMs: number;
};

function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}.`);
  }

  return value;
}

function positiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];

  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} debe ser un entero mayor que cero.`);
  }

  return value;
}

function booleanValue(name: string, fallback: boolean): boolean {
  const raw = process.env[name];

  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }

  switch (raw.trim().toLowerCase()) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    default:
      throw new Error(`${name} debe ser true o false.`);
  }
}

function corsOrigins(isProduction: boolean): string[] {
  const raw = process.env.CORS_ORIGIN?.trim();

  if (!raw) {
    if (isProduction) {
      throw new Error("CORS_ORIGIN es obligatorio en producción.");
    }

    return ["http://localhost:4200"];
  }

  const origins = raw
    .split(",")
    .map(origin => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  if (origins.length === 0 || origins.includes("*")) {
    throw new Error("CORS_ORIGIN debe contener uno o más orígenes concretos, nunca *.");
  }

  return origins;
}

export function loadConfig(): Config {
  const isProduction = process.env.NODE_ENV === "production";
  const dataDir = resolve(process.env.API_DATA_DIR?.trim() || "/var/lib/cienciaceleste");
  const projectRoot = resolve(process.env.PROJECT_ROOT?.trim() || "/workspace/cienciaceleste");

  const docsBuildTask = process.env.DOCS_BUILD_TASK?.trim() || "build:all:docs";
  const deployScript = process.env.DEPLOY_SCRIPT?.trim() || "frontend:deploy:ghpages";

  if (docsBuildTask !== "build:all:docs") {
    throw new Error("DOCS_BUILD_TASK solo admite build:all:docs.");
  }

  if (deployScript !== "frontend:deploy:ghpages") {
    throw new Error("DEPLOY_SCRIPT solo admite frontend:deploy:ghpages.");
  }

  const adminUsername = required("ADMIN_USERNAME");
  const adminPassword = required("ADMIN_PASSWORD");

  if (adminUsername.length > 100) {
    throw new Error("ADMIN_USERNAME no puede superar 100 caracteres.");
  }

  if (adminPassword.length < 12) {
    throw new Error("ADMIN_PASSWORD debe tener al menos 12 caracteres.");
  }

  return {
    host: process.env.HOST?.trim() || "0.0.0.0",
    port: positiveInteger("PORT", 3000),
    logLevel: process.env.LOG_LEVEL?.trim() || "info",
    isProduction,
    corsOrigins: corsOrigins(isProduction),
    cookieSecure: booleanValue("COOKIE_SECURE", isProduction),
    sessionTtlMs: positiveInteger("SESSION_TTL_HOURS", 8) * 60 * 60 * 1000,
    adminUsername,
    adminPassword,
    dataDir,
    databasePath: resolve(dataDir, "cienciaceleste.sqlite"),
    requestsDir: resolve(dataDir, "requests"),
    projectRoot,
    docsBuildTask,
    deployScript,
    deployEnabled: booleanValue("DEPLOY_ENABLED", true),
    jobPollIntervalMs: positiveInteger("JOB_POLL_INTERVAL_MS", 500),
    pipelineTimeoutMs: positiveInteger("PIPELINE_TIMEOUT_MS", 30 * 60 * 1000)
  };
}
