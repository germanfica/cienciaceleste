import { spawn } from "node:child_process";
import { access, chmod, mkdir, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import type { Config } from "./config.js";
import type { JobRecord } from "./types.js";

const MAX_LOG_BYTES = 128 * 1024;

const writeTaskByDocumentType = {
  rollo: "write:rollo",
  minirollo: "write:minirollo",
  ley: "write:ley"
} as const;

export class PipelineError extends Error {
  constructor(
    message: string,
    readonly output: string
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

type CommandResult = {
  output: string;
};

function appendBounded(current: string, chunk: Buffer): string {
  const next = current + chunk.toString("utf8");

  if (Buffer.byteLength(next, "utf8") <= MAX_LOG_BYTES) {
    return next;
  }

  const marker = "\n[se omitió la parte inicial del log por límite de tamaño]\n";
  const remaining = Buffer.from(next, "utf8").subarray(-MAX_LOG_BYTES + Buffer.byteLength(marker, "utf8"));
  return marker + remaining.toString("utf8");
}

function combineOutput(previous: string, next: string): string {
  return previous
    ? appendBounded(previous, Buffer.from(`\n${next}`, "utf8"))
    : next;
}

function runCommand(
  command: string,
  args: readonly string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number; onOutput: (output: string) => void }
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    let output = `$ ${command} ${args.join(" ")}\n`;
    let timedOut = false;
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    const report = (chunk: Buffer) => {
      output = appendBounded(output, chunk);
      options.onOutput(output);
    };

    child.stdout.on("data", report);
    child.stderr.on("data", report);

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5_000).unref();
    }, options.timeoutMs);

    child.once("error", error => {
      clearTimeout(timer);
      reject(new PipelineError(`No se pudo iniciar ${command}: ${error.message}`, output));
    });

    child.once("close", (code, signal) => {
      clearTimeout(timer);

      if (code === 0 && !timedOut) {
        resolve({ output });
        return;
      }

      const reason = timedOut
        ? `El comando superó el límite de ${options.timeoutMs} ms.`
        : `El comando terminó con código ${code ?? "desconocido"}${signal ? ` (${signal})` : ""}.`;
      reject(new PipelineError(reason, output));
    });
  });
}

export class PipelineRunner {
  constructor(private readonly config: Config) {}

  async verifyProjectLayout(): Promise<void> {
    await access(join(this.config.projectRoot, "package.json"), constants.R_OK);
  }

  async run(job: JobRecord, onOutput: (output: string) => void): Promise<string> {
    await mkdir(this.config.requestsDir, { recursive: true, mode: 0o700 });
    const requestPath = join(this.config.requestsDir, `${job.id}.json`);
    let output = "";

    try {
      await writeFile(requestPath, `${job.requestJson}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
      await chmod(requestPath, 0o600);

      const environment: NodeJS.ProcessEnv = {
        ...process.env,
        DOC_INPUT: requestPath,
        CI: "1"
      };

      const writeResult = await runCommand(
        "npm",
        ["run", "gulp", "--", writeTaskByDocumentType[job.documentType]],
        {
          cwd: this.config.projectRoot,
          env: environment,
          timeoutMs: this.config.pipelineTimeoutMs,
          onOutput
        }
      );
      output = writeResult.output;

      const buildResult = await runCommand(
        "npm",
        ["run", "gulp", "--", this.config.docsBuildTask],
        {
          cwd: this.config.projectRoot,
          env: environment,
          timeoutMs: this.config.pipelineTimeoutMs,
          onOutput: next => onOutput(combineOutput(output, next))
        }
      );
      output = combineOutput(output, buildResult.output);

      if (this.config.deployEnabled) {
        const deployResult = await runCommand(
          "npm",
          ["run", this.config.deployScript],
          {
            cwd: this.config.projectRoot,
            env: environment,
            timeoutMs: this.config.pipelineTimeoutMs,
            onOutput: next => onOutput(combineOutput(output, next))
          }
        );
        output = combineOutput(output, deployResult.output);
      }

      return output;
    } catch (error) {
      if (error instanceof PipelineError) {
        throw new PipelineError(error.message, combineOutput(output, error.output));
      }

      const message = error instanceof Error ? error.message : "Falló la publicación.";
      throw new PipelineError(message, output);
    } finally {
      await rm(requestPath, { force: true });
    }
  }
}
