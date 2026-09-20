import { randomBytes, timingSafeEqual } from "node:crypto";
import process from "node:process";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import { loadConfig, type Config } from "./config.js";
import { hashOpaqueToken, Repository, toPublicJob, type SessionRecord } from "./database.js";
import { verifyPassword } from "./password.js";
import { PipelineRunner } from "./pipeline.js";
import { DocumentTypeSchema, LoginSchema, parseDocumentRequest } from "./schema.js";
import type { DocumentType, EditorWriteRequest } from "./types.js";
import { PublishWorker } from "./worker.js";

const SESSION_COOKIE = "cc_session";
const CSRF_COOKIE = "cc_csrf";

type AuthContext = {
  session: SessionRecord;
};

function cookieOptions(config: Config) {
  return {
    path: "/api/v1",
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "strict" as const,
    maxAge: Math.floor(config.sessionTtlMs / 1_000)
  };
}

function csrfCookieOptions(config: Config, expiresAt: number) {
  return {
    // The admin page is /admin while the API is /api/v1. The CSRF cookie
    // must be readable by the page and sent to the API.
    path: "/",
    httpOnly: false,
    secure: config.cookieSecure,
    sameSite: "strict" as const,
    maxAge: Math.max(1, Math.ceil((expiresAt - Date.now()) / 1_000))
  };
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");

  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

function documentKey(documentType: DocumentType, document: EditorWriteRequest): string {
  if ("id" in document) {
    return `${documentType}:id:${document.id}`;
  }

  if ("shownNumber" in document) {
    return "ley:id:" + document.shownNumber;
  }

  return `ley:page:${document.pagina}:index:${document.indexInPage}`;
}

function requestIp(request: FastifyRequest): string {
  return request.ip || "unknown";
}

async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
  repository: Repository
): Promise<AuthContext | null> {
  const token = request.cookies[SESSION_COOKIE];

  if (!token) {
    reply.code(401).send({ error: "La sesión no es válida o ya venció." });
    return null;
  }

  const session = repository.findActiveSession(hashOpaqueToken(token));

  if (!session) {
    reply.clearCookie(SESSION_COOKIE, cookieOptionsForClear(request));
    reply.clearCookie(CSRF_COOKIE, csrfCookieOptionsForClear(request));
    reply.clearCookie(CSRF_COOKIE, legacyCsrfCookieOptionsForClear());
    reply.code(401).send({ error: "La sesión no es válida o ya venció." });
    return null;
  }

  return { session };
}

// clearCookie only needs attributes that affect the cookie scope. The secure
// flag is deliberately omitted because Fastify does not need it to expire it.
function cookieOptionsForClear(_request: FastifyRequest) {
  return { path: "/api/v1", httpOnly: true, sameSite: "strict" as const };
}

function csrfCookieOptionsForClear(_request: FastifyRequest) {
  return { path: "/", httpOnly: false, sameSite: "strict" as const };
}

// Removes the pre-fix cookie, whose Path was /api/v1.
function legacyCsrfCookieOptionsForClear() {
  return { path: "/api/v1", httpOnly: false, sameSite: "strict" as const };
}

// Moves an already valid CSRF cookie from the former API-only scope to the
// root scope. This keeps existing sessions working after the deployment.
function refreshCsrfCookie(
  request: FastifyRequest,
  reply: FastifyReply,
  config: Config,
  auth: AuthContext
): void {
  const csrfToken = request.cookies[CSRF_COOKIE];

  if (
    !csrfToken ||
    !safeEqual(hashOpaqueToken(csrfToken), auth.session.csrfTokenHash)
  ) {
    return;
  }

  reply
    .clearCookie(CSRF_COOKIE, legacyCsrfCookieOptionsForClear())
    .setCookie(
      CSRF_COOKIE,
      csrfToken,
      csrfCookieOptions(config, auth.session.expiresAt)
    );
}

function requireCsrf(
  request: FastifyRequest,
  reply: FastifyReply,
  auth: AuthContext
): boolean {
  const csrfCookie = request.cookies[CSRF_COOKIE];
  const csrfHeader = request.headers["x-csrf-token"];

  if (
    !csrfCookie ||
    typeof csrfHeader !== "string" ||
    !safeEqual(csrfCookie, csrfHeader) ||
    !safeEqual(hashOpaqueToken(csrfHeader), auth.session.csrfTokenHash)
  ) {
    reply.code(403).send({ error: "El token CSRF no es válido." });
    return false;
  }

  return true;
}

export async function buildServer(config: Config, repository: Repository): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      redact: ["req.headers.cookie", "req.headers.authorization"]
    },
    bodyLimit: 1_100_000,
    trustProxy: config.isProduction
  });

  await app.register(cookie);
  await app.register(cors, {
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        callback(null, false);
        return;
      }

      callback(null, config.corsOrigins.includes(origin));
    }
  });
  await app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: "1 minute"
  });

  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("Cache-Control", "no-store");
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "same-origin");
    return payload;
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError) {
      reply.code(400).send({ error: "La solicitud no tiene un formato válido.", details: error.issues });
      return;
    }

    const statusCode = (error as { statusCode?: unknown }).statusCode;

    if (typeof statusCode === "number" && statusCode < 500) {
      const message = error instanceof Error
        ? error.message
        : "La solicitud no pudo procesarse.";

      reply.code(statusCode).send({ error: message });
      return;
    }

    app.log.error(error);
    reply.code(500).send({ error: "Ocurrió un error interno." });
  });

  app.get("/api/v1/health", async () => ({ status: "ok" }));

  app.post(
    "/api/v1/auth/login",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const body = LoginSchema.parse(request.body);
      const user = repository.findUserByUsername(body.username);
      const passwordIsValid = user ? await verifyPassword(body.password, user.passwordHash) : false;

      if (!user || !passwordIsValid) {
        repository.addAudit("auth.login_failed", {
          ipAddress: requestIp(request),
          details: { username: body.username }
        });
        return reply.code(401).send({ error: "Usuario o contraseña incorrectos." });
      }

      const sessionToken = randomToken();
      const csrfToken = randomToken();
      const expiresAt = Date.now() + config.sessionTtlMs;
      repository.createSession(
        user.id,
        hashOpaqueToken(sessionToken),
        hashOpaqueToken(csrfToken),
        expiresAt
      );
      repository.addAudit("auth.login_succeeded", {
        userId: user.id,
        ipAddress: requestIp(request)
      });

      reply
        .setCookie(SESSION_COOKIE, sessionToken, cookieOptions(config))
        .clearCookie(CSRF_COOKIE, legacyCsrfCookieOptionsForClear())
        .setCookie(
          CSRF_COOKIE,
          csrfToken,
          csrfCookieOptions(config, expiresAt)
        );

      return {
        user: { username: user.username },
        expiresAt
      };
    }
  );

  app.get("/api/v1/auth/me", async (request, reply) => {
    const auth = await authenticate(request, reply, repository);

    if (!auth) {
      return;
    }

    refreshCsrfCookie(request, reply, config, auth);

    return {
      user: { username: auth.session.username },
      expiresAt: auth.session.expiresAt
    };
  });

  app.post("/api/v1/auth/logout", async (request, reply) => {
    const auth = await authenticate(request, reply, repository);

    if (!auth || !requireCsrf(request, reply, auth)) {
      return;
    }

    const token = request.cookies[SESSION_COOKIE];

    if (token) {
      repository.revokeSession(hashOpaqueToken(token));
      repository.addAudit("auth.logout", {
        userId: auth.session.userId,
        ipAddress: requestIp(request)
      });
    }

    reply
      .clearCookie(SESSION_COOKIE, cookieOptionsForClear(request))
      .clearCookie(CSRF_COOKIE, csrfCookieOptionsForClear(request))
      .clearCookie(CSRF_COOKIE, legacyCsrfCookieOptionsForClear());
    return reply.code(204).send();
  });

  app.post("/api/v1/documents/:documentType", async (request, reply) => {
    const auth = await authenticate(request, reply, repository);

    if (!auth || !requireCsrf(request, reply, auth)) {
      return;
    }

    const documentType = DocumentTypeSchema.parse((request.params as { documentType?: unknown }).documentType);
    const document = parseDocumentRequest(documentType, request.body);
    const job = repository.createJob(
      auth.session.userId,
      documentType,
      documentKey(documentType, document),
      JSON.stringify(document)
    );
    repository.addAudit("publish.queued", {
      userId: auth.session.userId,
      jobId: job.id,
      ipAddress: requestIp(request),
      details: { documentType, operation: document.operation }
    });

    return reply.code(202).send({ job: toPublicJob(job) });
  });

  app.get("/api/v1/jobs/:jobId", async (request, reply) => {
    const auth = await authenticate(request, reply, repository);

    if (!auth) {
      return;
    }

    const jobId = z.string().uuid().parse((request.params as { jobId?: unknown }).jobId);
    const job = repository.getJobForUser(jobId, auth.session.userId);

    if (!job) {
      return reply.code(404).send({ error: "No se encontró el trabajo solicitado." });
    }

    return { job: toPublicJob(job) };
  });

  return app;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const repository = new Repository(config.databasePath);
  await repository.ensureBootstrapUser(config.adminUsername, config.adminPassword);
  repository.pruneExpiredSessions();
  repository.failInterruptedJobs();

  const runner = new PipelineRunner(config);
  await runner.verifyProjectLayout();

  const app = await buildServer(config, repository);
  const worker = new PublishWorker(config, repository, runner, app.log);
  worker.start();

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "Deteniendo la API");
    await worker.stop();
    await app.close();
    repository.close();
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  try {
    await app.listen({ host: config.host, port: config.port });
  } catch (error) {
    app.log.error(error, "No se pudo iniciar la API");
    await worker.stop();
    repository.close();
    process.exitCode = 1;
  }
}

void main();
