// src/clean-dedup.fixed.ts
// Markdown Duplicate Cleaner — scans a directory tree, identifies exact duplicate
// .md files by normalized content, and moves unique files to a "complete" folder
// while moving/deleting duplicates. Formal English. Strict TypeScript. NodeNext ESM.
//
// Fixes vs. previous version:
// - Avoids assigning `undefined` to optional properties with `exactOptionalPropertyTypes: true`
//   by using a discriminated union for FilePlan.
// - Respects `noUncheckedIndexedAccess: true` inside the concurrency helper.
//
// Usage (after build):
//   node ./dist/clean-dedup.fixed.js \
//     --src ./notes \
//     --dest ./complete \
//     --duplicates ./duplicates \
//     --delete-duplicates false \
//     --flatten true \
//     --concurrency 8 \
//     --ignore-front-matter true \
//     --collapse-blank-lines true \
//     --dry-run
//   # Execute actions:
//   node ./dist/clean-dedup.fixed.js --src ./notes --dest ./complete --duplicates ./duplicates --commit

import fs from "node:fs/promises";
import fscb from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import fg from "fast-glob";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// --------------------------- Types ---------------------------

interface CliArgs {
  src: string;               // Source directory to scan
  dest: string;              // Destination "complete" directory
  duplicates: string;        // Destination for duplicate files (if not deleting)
  deleteDuplicates: boolean; // If true, delete duplicates instead of moving
  flatten: boolean;          // If true, place all outputs directly under dest/duplicates
  concurrency: number;       // Max concurrent file reads/moves
  maxBytes: number;          // Skip files larger than this many bytes
  ignoreFrontMatter: boolean;// Ignore YAML front matter for hashing
  collapseBlankLines: boolean;// Collapse multiple blank lines into one
  normalizeEol: boolean;     // Convert CRLF/CR to LF
  trimTrailingSpaces: boolean;// Trim trailing spaces on each line
  stripBom: boolean;         // Remove UTF-8 BOM
  dryRun: boolean;           // Preview actions only
  commit: boolean;           // Execute actions
}

// Discriminated union avoids `undefined` assignments under exactOptionalPropertyTypes
interface FilePlanBase {
  srcPath: string;
  size: number;
  hash: string;          // SHA-256 hex over normalized content
  isDuplicate: boolean;
}
interface FilePlanMoveUnique extends FilePlanBase { action: "move-unique"; targetPath: string; }
interface FilePlanMoveDuplicate extends FilePlanBase { action: "move-duplicate"; targetPath: string; }
interface FilePlanDeleteDuplicate extends FilePlanBase { action: "delete-duplicate"; }
interface FilePlanSkip extends FilePlanBase { action: "skip"; }

type FilePlan =
  | FilePlanMoveUnique
  | FilePlanMoveDuplicate
  | FilePlanDeleteDuplicate
  | FilePlanSkip;

interface Summary {
  totalFound: number;
  totalScanned: number;
  totalBytes: number;
  uniqueCount: number;
  duplicateCount: number;
  movedUnique: number;
  movedDuplicates: number;
  deletedDuplicates: number;
  skipped: number;
  dest: string;
  duplicatesDir: string;
}

// --------------------------- CLI ---------------------------

const parseCli = (): CliArgs => (
  yargs(hideBin(process.argv))
    .scriptName("md-deduper")
    .usage("$0 --src <dir> [options]")
    .options({
      src: { type: "string", demandOption: true, describe: "Source directory to recursively scan for .md files" },
      dest: { type: "string", default: "./complete", describe: "Destination folder for unique files" },
      duplicates: { type: "string", default: "./duplicates", describe: "Destination folder for duplicates (when not deleting)" },
      deleteDuplicates: { type: "boolean", default: false, describe: "Delete duplicates instead of moving them to --duplicates" },
      flatten: { type: "boolean", default: true, describe: "Flatten directory structure under output folders" },
      concurrency: { type: "number", default: Math.max(2, Math.min(8, os.cpus().length)), describe: "Max concurrent file operations" },
      maxBytes: { type: "number", default: 5 * 1024 * 1024, describe: "Skip .md files larger than this (bytes)" },
      ignoreFrontMatter: { type: "boolean", default: true, describe: "Ignore YAML front matter when hashing" },
      collapseBlankLines: { type: "boolean", default: true, describe: "Collapse multiple blank lines into one" },
      normalizeEol: { type: "boolean", default: true, describe: "Normalize line endings to LF (\\n)" },
      trimTrailingSpaces: { type: "boolean", default: true, describe: "Trim trailing whitespace on each line" },
      stripBom: { type: "boolean", default: true, describe: "Strip UTF-8 BOM if present" },
      dryRun: { type: "boolean", default: true, describe: "Only print the plan; no files are modified" },
      commit: { type: "boolean", default: false, describe: "Execute the planned moves/deletions (disables --dry-run)" },
    })
    .strict()
    .help()
    .parseSync() as unknown as CliArgs
);

// ---------------------- Normalization -----------------------

function stripUtf8Bom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

function removeFrontMatter(s: string): string {
  // Remove leading YAML front matter delimited by --- ... --- at the top of file
  const m = s.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return m ? s.slice(m[0].length) : s;
}

function normalizeMarkdown(content: string, opts: Pick<CliArgs,
  "ignoreFrontMatter" | "collapseBlankLines" | "normalizeEol" | "trimTrailingSpaces" | "stripBom">
): string {
  let s = content;
  if (opts.stripBom) s = stripUtf8Bom(s);
  if (opts.normalizeEol) s = s.replace(/\r\n?|\u2028|\u2029/g, "\n");
  if (opts.trimTrailingSpaces) s = s.split("\n").map(l => l.replace(/\s+$/u, "")).join("\n");
  if (opts.ignoreFrontMatter) s = removeFrontMatter(s);
  s = s.trim();
  if (opts.collapseBlankLines) s = s.replace(/\n{3,}/g, "\n\n");
  return s;
}

function sha256Hex(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

// ---------------------- File Collection ---------------------

async function findMarkdownFiles(root: string): Promise<string[]> {
  const pattern = path.join(root, "**/*.md").replace(/\\/g, "/");
  const entries = await fg(pattern, { dot: false, onlyFiles: true, unique: true, followSymbolicLinks: true });
  return entries.map(p => path.resolve(p));
}

// Concurrency helper compatible with noUncheckedIndexedAccess
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length) as R[];
  let next = 0;
  const worker = async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) break;
      const item = items[i];
      if (item === undefined) continue; // satisfies noUncheckedIndexedAccess
      out[i] = await fn(item as T, i);
    }
  };
  const workers: Promise<void>[] = [];
  const count = Math.min(limit, items.length);
  for (let k = 0; k < count; k++) workers.push(worker());
  await Promise.all(workers);
  return out;
}

// ---------------------- Planning Phase ----------------------

async function planFiles(files: string[], args: CliArgs): Promise<FilePlan[]> {
  const seen = new Map<string, string>(); // hash -> canonical file kept
  const plans: FilePlan[] = [];

  await mapLimit(files, args.concurrency, async (srcPath) => {
    try {
      const st = await fs.stat(srcPath);
      if (!st.isFile()) {
        plans.push({ srcPath, size: 0, hash: "", isDuplicate: false, action: "skip" });
        return;
      }
      if (st.size > args.maxBytes) {
        plans.push({ srcPath, size: st.size, hash: "", isDuplicate: false, action: "skip" });
        return;
      }
      const data = await fs.readFile(srcPath, { encoding: "utf8" });
      const normalized = normalizeMarkdown(data, args);
      const hash = sha256Hex(normalized);
      const dupOf = seen.get(hash);

      if (dupOf) {
        if (args.deleteDuplicates) {
          plans.push({ srcPath, size: st.size, hash, isDuplicate: true, action: "delete-duplicate" });
        } else {
          const targetPath = await computeTargetPath(srcPath, args.duplicates, args.flatten);
          plans.push({ srcPath, size: st.size, hash, isDuplicate: true, action: "move-duplicate", targetPath });
        }
      } else {
        seen.set(hash, srcPath);
        const targetPath = await computeTargetPath(srcPath, args.dest, args.flatten);
        plans.push({ srcPath, size: st.size, hash, isDuplicate: false, action: "move-unique", targetPath });
      }
    } catch (err) {
      console.error(`Failed to analyze ${srcPath}:`, (err as Error).message);
      plans.push({ srcPath, size: 0, hash: "", isDuplicate: false, action: "skip" });
    }
  });

  return plans;
}

// ---------------------- Execution Phase ---------------------

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function moveFileSafe(src: string, dest: string): Promise<void> {
  await ensureDir(path.dirname(dest));
  try {
    await fs.rename(src, dest);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EXDEV" || code === "EACCES" || code === "EPERM") {
      await new Promise<void>((resolve, reject) => {
        const rd = fscb.createReadStream(src);
        const wr = fscb.createWriteStream(dest);
        rd.on("error", reject);
        wr.on("error", reject);
        wr.on("close", resolve);
        rd.pipe(wr);
      });
      await fs.unlink(src);
    } else {
      throw err;
    }
  }
}

async function computeTargetPath(srcPath: string, baseOut: string, flatten: boolean): Promise<string> {
  const name = path.basename(srcPath);
  if (flatten) {
    let target = path.resolve(baseOut, name);
    let i = 1;
    while (await exists(target)) {
      const parsed = path.parse(name);
      target = path.resolve(baseOut, `${parsed.name} (${i++})${parsed.ext}`);
    }
    return target;
  }
  const relFromCwd = path.relative(process.cwd(), srcPath);
  return path.resolve(baseOut, relFromCwd);
}

async function exists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

async function executePlans(plans: FilePlan[], args: CliArgs): Promise<Summary> {
  let movedUnique = 0, movedDuplicates = 0, deletedDuplicates = 0, skipped = 0;
  let totalBytes = 0, totalScanned = 0;

  for (const p of plans) totalBytes += p.size;
  totalScanned = plans.filter(p => p.action !== "skip").length;

  if (args.commit) args.dryRun = false;

  if (args.dryRun) {
    const toMoveU = plans.filter(p => p.action === "move-unique").length;
    const toMoveD = plans.filter(p => p.action === "move-duplicate").length;
    const toDelD = plans.filter(p => p.action === "delete-duplicate").length;
    console.log(`[DRY-RUN] Unique to move: ${toMoveU}, Duplicates to move: ${toMoveD}, Duplicates to delete: ${toDelD}`);
  } else {
    for (const plan of plans) {
      try {
        if (plan.action === "move-unique") {
          await moveFileSafe(plan.srcPath, plan.targetPath);
          movedUnique++;
        } else if (plan.action === "move-duplicate") {
          await moveFileSafe(plan.srcPath, plan.targetPath);
          movedDuplicates++;
        } else if (plan.action === "delete-duplicate") {
          await fs.unlink(plan.srcPath);
          deletedDuplicates++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`Failed action for ${plan.srcPath}:`, (err as Error).message);
        skipped++;
      }
    }
  }

  const uniqueCount = plans.filter(p => p.action === "move-unique").length;
  const duplicateCount = plans.filter(p => p.action === "move-duplicate" || p.action === "delete-duplicate").length;

  return {
    totalFound: plans.length,
    totalScanned,
    totalBytes,
    uniqueCount,
    duplicateCount,
    movedUnique,
    movedDuplicates,
    deletedDuplicates,
    skipped,
    dest: path.resolve(args.dest),
    duplicatesDir: path.resolve(args.duplicates),
  };
}

// --------------------------- Main ---------------------------

async function main(): Promise<void> {
  const args = parseCli();

  const files = await findMarkdownFiles(args.src);
  console.log(`Found ${files.length} .md files under ${path.resolve(args.src)}.`);

  const plans = await planFiles(files, args);

  if (!args.dryRun) {
    if (!args.deleteDuplicates) await ensureDir(args.duplicates);
    await ensureDir(args.dest);
  }

  const summary = await executePlans(plans, args);
  console.log("Summary:");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
