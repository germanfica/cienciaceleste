import type { Config } from "./config.js";
import { Repository } from "./database.js";
import { PipelineError, PipelineRunner } from "./pipeline.js";

export class PublishWorker {
  private timer: NodeJS.Timeout | undefined;
  private processing = false;
  private stopped = false;
  private readonly idleWaiters: Array<() => void> = [];

  constructor(
    private readonly config: Config,
    private readonly repository: Repository,
    private readonly runner: PipelineRunner,
    private readonly log: { info: (data: unknown, message?: string) => void; error: (data: unknown, message?: string) => void }
  ) {}

  start(): void {
    this.stopped = false;
    this.schedule(0);
  }

  async stop(): Promise<void> {
    this.stopped = true;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    if (!this.processing) {
      return;
    }

    await new Promise<void>(resolve => this.idleWaiters.push(resolve));
  }

  private schedule(delay: number): void {
    if (this.stopped) {
      return;
    }

    this.timer = setTimeout(() => {
      void this.tick();
    }, delay);
  }

  private async tick(): Promise<void> {
    if (this.stopped || this.processing) {
      return;
    }

    this.processing = true;

    try {
      const job = this.repository.claimNextQueuedJob();

      if (!job) {
        this.schedule(this.config.jobPollIntervalMs);
        return;
      }

      this.repository.addAudit("publish.started", {
        userId: job.userId,
        jobId: job.id,
        details: { documentType: job.documentType }
      });
      this.log.info({ jobId: job.id, documentType: job.documentType }, "Comenzó una publicación");

      try {
        const output = await this.runner.run(job, () => undefined);
        this.repository.markJobSucceeded(job.id, output);
        this.repository.addAudit("publish.succeeded", {
          userId: job.userId,
          jobId: job.id,
          details: { documentType: job.documentType }
        });
        this.log.info({ jobId: job.id }, "Publicación completada");
      } catch (error) {
        const pipelineError = error instanceof PipelineError
          ? error
          : new PipelineError(error instanceof Error ? error.message : "Falló la publicación.", "");
        this.repository.markJobFailed(job.id, pipelineError.message, pipelineError.output);
        this.repository.addAudit("publish.failed", {
          userId: job.userId,
          jobId: job.id,
          details: { documentType: job.documentType, message: pipelineError.message }
        });
        this.log.error({ err: pipelineError, jobId: job.id }, "Falló una publicación");
      }

      this.schedule(0);
    } catch (error) {
      this.log.error({ err: error }, "Falló el worker de publicación");
      this.schedule(this.config.jobPollIntervalMs);
    } finally {
      this.processing = false;

      for (const resolve of this.idleWaiters.splice(0)) {
        resolve();
      }
    }
  }
}
