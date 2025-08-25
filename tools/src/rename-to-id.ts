// src/rename-to-id.ts
// Markdown Renamer — scans a "complete" folder produced by the dedup step and
// renames files to the form "<id>.md" based on the known filename pattern
// (e.g., "id-123_pagina-4__Some-Title.md" -> "123.md").
//
// - TypeScript 5.9.x, strict-friendly code.
// - Formal English comments and logs.
// - Safe by default: dry-run enabled unless --commit is provided.
// - Handles name collisions via --conflict strategy.
//
// Usage (after build):
//   node ./dist/rename-to-id.js --dir ./complete --commit
//   node ./dist/rename-to-id.js --dir ./complete --pattern "**/*.md" --conflict suffix --concurrency 8 --commit
//
// Suggested package.json script:
//   "rename:id": "npm run build && node ./dist/rename-to-id.js --dir ./complete --commit"
//
// Notes:
// - The script extracts the numeric id using /id-(\d+)/ from the current filename.
// - If multiple files share the same id, collisions are resolved according to --conflict:
//     * "suffix" (default): 123.md, 123 (2).md, 123 (3).md, ...
//     * "overwrite": overwrites an existing target
//     * "skip": leaves the source untouched when a target already exists

import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

type Nullable<T> = T | null;
type ConflictStrategy = "suffix" | "overwrite" | "skip";

interface CliArgs {
    /** Directory that contains the markdown files produced by the dedup step (usually "./complete"). */
    dir: string;
    /** fast-glob pattern to select files relative to --dir. */
    pattern: string;
    /** Max concurrent file operations. */
    concurrency: number;
    /** Collision policy when the target "<id>.md" already exists. */
    conflict: ConflictStrategy;
    /** If true, actually performs the renames (disables dry-run). */
    commit: boolean;
    /** If true, prints the plan without touching the filesystem. */
    dryRun: boolean;
}

/** Parse command line flags with strict typing. */
const parseCli = (): CliArgs =>
    yargs(hideBin(process.argv))
        .scriptName("md-rename-to-id")
        .usage("$0 --dir <complete-folder> [options]")
        .options({
            dir: {
                type: "string",
                default: "./complete",
                describe: "Folder containing the processed markdown files",
            },
            pattern: {
                type: "string",
                default: "**/*.md",
                describe: "fast-glob pattern to match files relative to --dir",
            },
            concurrency: {
                type: "number",
                default: 8,
                describe: "Max concurrent file operations",
            },
            conflict: {
                type: "string",
                choices: ["suffix", "overwrite", "skip"] as const,
                default: "suffix",
                describe: "Collision policy for existing target files",
            },
            dryRun: {
                type: "boolean",
                default: true,
                describe: "Only print the planned renames; do not modify files",
            },
            commit: {
                type: "boolean",
                default: false,
                describe: "Execute renames (sets --dryRun=false)",
            },
        })
        .strict()
        .help()
        .parseSync() as CliArgs;

/**
 * Minimal typed concurrency limiter that works with strict type-checking.
 * We store resolve/reject as (unknown) => void and wrap the generic
 * resolve/reject when enqueuing to avoid variance issues.
 */
const pLimit = (n: number) => {
    let active = 0;
    const queue: Array<{
        job: () => Promise<unknown>;
        resolve: (v: unknown) => void;
        reject: (e: unknown) => void;
    }> = [];

    const next = (): void => {
        if (active >= n || queue.length === 0) return;
        active++;
        const item = queue.shift();
        if (!item) {
            active--;
            return;
        }
        const { job, resolve, reject } = item;
        job()
            .then((res) => {
                active--;
                resolve(res);
                next();
            })
            .catch((err) => {
                active--;
                reject(err);
                next();
            });
    };

    return <T>(job: () => Promise<T>): Promise<T> =>
        new Promise<T>((resolve, reject) => {
            queue.push({
                job: job as () => Promise<unknown>,
                resolve: (v: unknown) => resolve(v as T),
                reject: (e: unknown) => reject(e as unknown as never),
            });
            next();
        });
};

/** Readable existence check (fs.access throws if not found). */
const exists = async (p: string): Promise<boolean> => {
    try {
        await fs.access(p);
        return true;
    } catch {
        return false;
    }
};

/**
 * Extract { id, pagina } from a file basename following the known pattern:
 *   "id-<id>_pagina-<pagina>__<title>.md"
 * This function is tolerant and only requires "id-<id>" to succeed.
 */
const extractIdPaginaFromName = (
    baseName: string
): { id: Nullable<string>; pagina: Nullable<string> } => {
    // Strip an optional " (n)" suffix before the extension (dedup could add it).
    const name = baseName.replace(/\s\(\d+\)(?=\.md$)/i, "");
    const idMatch = name.match(/id-(\d+)/i);
    const paginaMatch = name.match(/pagina-(\d+)/i);
    return {
        id: idMatch?.[1] ?? null,
        pagina: paginaMatch?.[1] ?? null,
    };
};

/**
 * Compute a non-conflicting destination path for "<id>.md" using the given policy.
 * - "suffix": produce "id.md", "id (2).md", "id (3).md", ...
 * - "overwrite": return "id.md" (caller will overwrite)
 * - "skip": return "id.md" (caller will detect collision and skip)
 */
const computeTargetPath = async (
    dir: string,
    id: string,
    conflict: ConflictStrategy
): Promise<string> => {
    const base = path.resolve(dir, `${id}.md`);
    if (!(await exists(base))) return base;

    if (conflict === "overwrite" || conflict === "skip") {
        return base;
    }

    // conflict === "suffix"
    let i = 2;
    // Avoid unbounded loop on extremely hostile directories (practical safety).
    const MAX_TRIES = 10_000; // practical safety cap
    while (i < MAX_TRIES) {
        const candidate = path.resolve(dir, `${id} (${i}).md`);
        if (!(await exists(candidate))) {
            return candidate;
        }
        i++;
    }
    // Fallback to base (caller will likely fail); practically unreachable.
    return base;
};

/** Perform a single rename according to the chosen policy. */
const renameOne = async (
    srcAbs: string,
    targetAbs: string,
    conflict: ConflictStrategy,
    dryRun: boolean
): Promise<"renamed" | "skipped-existing" | "overwritten" | "noop"> => {
    if (srcAbs === targetAbs) return "noop";

    const targetExists = await exists(targetAbs);

    if (dryRun) {
        // Just simulate, but still report what would happen.
        if (targetExists) {
            if (conflict === "skip") return "skipped-existing";
            if (conflict === "overwrite") return "overwritten";
        }
        return "renamed";
    }

    // Execute real rename with overwrite/skip semantics.
    if (targetExists) {
        if (conflict === "skip") return "skipped-existing";
        if (conflict === "overwrite") {
            await fs.rm(targetAbs, { force: true });
            await fs.rename(srcAbs, targetAbs);
            return "overwritten";
        }
        // "suffix" should not hit here because computeTargetPath found a free name.
    }

    await fs.rename(srcAbs, targetAbs);
    return "renamed";
};

/** Main workflow. */
const run = async (): Promise<void> => {
    const args = parseCli();
    if (args.commit) args.dryRun = false;

    const { dir, pattern, concurrency, conflict, dryRun } = args;

    const absDir = path.resolve(dir);
    const files = await fg(pattern, {
        cwd: absDir,
        absolute: true,
        onlyFiles: true,
        caseSensitiveMatch: false,
    });

    if (files.length === 0) {
        console.warn("No files matched the provided pattern.");
        return;
    }

    const limit = pLimit(Math.max(1, concurrency));

    let renamed = 0;
    let overwritten = 0;
    let skippedExisting = 0;
    let skippedNoId = 0;
    let noop = 0;
    let errors = 0;

    await Promise.all(
        files.map((srcAbs) =>
            limit(async () => {
                try {
                    const baseName = path.basename(srcAbs);
                    const { id } = extractIdPaginaFromName(baseName);

                    if (!id) {
                        skippedNoId++;
                        console.warn(`Skipping (no id): ${baseName}`);
                        return;
                    }

                    const targetAbs = await computeTargetPath(absDir, id, conflict);

                    // If already exactly "<id>.md" and no collision handling needed, no-op.
                    if (srcAbs === targetAbs) {
                        noop++;
                        return;
                    }

                    // Log intended action
                    if (dryRun) {
                        const relSrc = path.relative(absDir, srcAbs);
                        const relDst = path.relative(absDir, targetAbs);
                        console.log(`[DRY-RUN] ${relSrc} -> ${relDst}`);
                    }

                    const outcome = await renameOne(srcAbs, targetAbs, conflict, dryRun);
                    if (outcome === "renamed") renamed++;
                    else if (outcome === "overwritten") overwritten++;
                    else if (outcome === "skipped-existing") {
                        skippedExisting++;
                        const relDst = path.relative(absDir, targetAbs);
                        console.warn(`Skipped (exists): ${relDst}`);
                    } else {
                        noop++;
                    }
                } catch (err) {
                    errors++;
                    const msg = err instanceof Error ? err.message : String(err);
                    console.error(`Error: ${msg}`);
                }
            })
        )
    );

    const rel = (p: string) => path.relative(process.cwd(), p) || ".";
    console.log(
        `Done. Dir: ${rel(absDir)} | Renamed: ${renamed} | Overwritten: ${overwritten} | Skipped (exists): ${skippedExisting} | Skipped (no id): ${skippedNoId} | No-op: ${noop} | Errors: ${errors} | Mode: ${dryRun ? "DRY-RUN" : "COMMIT"
        }`
    );
};

run().catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Unexpected failure: ${msg}`);
    process.exit(1);
});
