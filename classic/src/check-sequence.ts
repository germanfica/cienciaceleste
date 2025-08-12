// src/check-sequence.ts
// ID Sequence Checker for Markdown files.
// Scans a directory, extracts sequential numeric IDs from filenames like:
//   id-1_pagina-10__SOME-TITLE.md
// Reports where the numeric sequence breaks, which IDs are missing, and duplicates.
// Optionally checks page sequences per ID.
//
// Formal English. Strict TypeScript. NodeNext ESM.
//
// Usage (after build):
//   node ./dist/check-sequence.js --dir ./docs --out ./sequence-report.json --checkPages false
//
// Notes:
// - The script assumes the ID is indicated with a token like "id-<number>".
// - By default it searches for ".md" files only.
// - It does not infer the expected pages per ID unless --checkPages is provided.

import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import os from "node:os";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// --------------------------- Types ---------------------------

interface CliArgs {
    dir: string;              // Root directory to scan
    out: string | null;       // Optional JSON report path
    pattern: string;          // Glob pattern relative to dir
    concurrency: number;      // Max concurrent file stats (mainly for large dirs)
    checkPages: boolean;      // If true, also check "pagina-<n>" sequences per ID
    pageStartAt: number;      // Starting page number when checking pages
    caseInsensitive: boolean; // If true, match id-/pagina- tokens case-insensitively
}

interface FileInfo {
    file: string;     // absolute path
    rel: string;      // relative to dir
    id: number | null;
    page: number | null;
}

interface Gap {
    after: number;        // last present id before the gap (0 if gap starts at 1)
    missing: number[];    // concrete missing IDs within this gap (compact ranges printed later)
}

interface PageGap {
    id: number;
    missing: number[];    // missing page numbers for this id
}

interface Report {
    dir: string;
    scannedFiles: number;
    idsPresent: number[];        // sorted unique
    minId: number | null;
    maxId: number | null;
    missingIds: number[];        // sorted
    idGaps: Gap[];               // grouped gaps
    duplicateIds: Array<{ id: number; count: number; files: string[] }>;
    unparsableFiles: string[];   // files without an id token
    pageGaps: PageGap[];         // only when checkPages=true
    generatedAt: string;
}

// --------------------------- CLI ---------------------------

const parseCli = (): CliArgs => (
    yargs(hideBin(process.argv))
        .scriptName("check-sequence")
        .usage("$0 --dir <folder> [options]")
        .options({
            dir: { type: "string", demandOption: true, describe: "Directory to recursively scan" },
            out: { type: "string", default: "", describe: "Optional JSON report output path" },
            pattern: { type: "string", default: "**/*.md", describe: "Glob pattern relative to --dir" },
            concurrency: { type: "number", default: Math.max(2, Math.min(8, os.cpus().length)), describe: "Max concurrent file operations" },
            checkPages: { type: "boolean", default: false, describe: "Check page sequences (pagina-<n>) per ID" },
            pageStartAt: { type: "number", default: 1, describe: "Starting page number when checking pages" },
            caseInsensitive: { type: "boolean", default: true, describe: "Case-insensitive matching for id-/pagina- tokens" },
        })
        .strict()
        .help()
        .parseSync() as unknown as CliArgs
);

// ------------------------ Core helpers ----------------------

function compileRegexes(caseInsensitive: boolean): { idRe: RegExp; pageRe: RegExp } {
    const flags = caseInsensitive ? "i" : "";
    // Match id-<digits> optionally separated by non-digits
    const idRe = new RegExp(String.raw`(?:^|[^\p{L}\p{N}])id-(\d+)`, flags + "u");
    const pageRe = new RegExp(String.raw`(?:^|[^\p{L}\p{N}])pagina-(\d+)`, flags + "u");
    return { idRe, pageRe };
}

async function collectFiles(dir: string, pattern: string): Promise<string[]> {
    const abs = path.resolve(dir);
    const glob = path.join(abs, pattern).replace(/\\/g, "/");
    const entries = await fg(glob, { onlyFiles: true, unique: true, dot: false, followSymbolicLinks: true });
    return entries.map(p => path.resolve(p));
}

function extractInfo(filePath: string, root: string, idRe: RegExp, pageRe: RegExp): FileInfo {
    const rel = path.relative(root, filePath);
    const base = path.basename(filePath);
    const idMatch = base.match(idRe);
    const pageMatch = base.match(pageRe);
    const id = idMatch ? Number(idMatch[1]) : null;
    const page = pageMatch ? Number(pageMatch[1]) : null;
    return { file: filePath, rel, id, page };
}

function uniqueSorted(nums: number[]): number[] {
    return Array.from(new Set(nums)).sort((a, b) => a - b);
}

function computeIdGaps(ids: number[]): { missing: number[]; gaps: Gap[] } {
    if (ids.length === 0) return { missing: [], gaps: [] };
    const min = Math.min(...ids);
    const max = Math.max(...ids);
    const present = new Set(ids);
    const missing: number[] = [];
    const gaps: Gap[] = [];

    let gapStart: number | null = null;
    let lastPresent = 0;

    for (let n = Math.min(1, min); n <= max; n++) {
        if (!present.has(n)) {
            missing.push(n);
            if (gapStart === null) gapStart = n;
        } else {
            if (gapStart !== null) {
                const after = lastPresent;
                const gapNums: number[] = [];
                for (let k = gapStart; k < n; k++) gapNums.push(k);
                gaps.push({ after, missing: gapNums });
                gapStart = null;
            }
            lastPresent = n;
        }
    }
    if (gapStart !== null) {
        const after = lastPresent;
        const gapNums: number[] = [];
        for (let k = gapStart; k <= max; k++) gapNums.push(k);
        gaps.push({ after, missing: gapNums });
    }

    return { missing, gaps };
}

function groupDuplicates(fileInfos: FileInfo[]): Array<{ id: number; count: number; files: string[] }> {
    const byId = new Map<number, string[]>();
    for (const f of fileInfos) {
        if (f.id === null) continue;
        const arr = byId.get(f.id) || [];
        arr.push(f.rel);
        byId.set(f.id, arr);
    }
    const dup: Array<{ id: number; count: number; files: string[] }> = [];
    for (const [id, files] of byId.entries()) {
        if (files.length > 1) dup.push({ id, count: files.length, files: files.sort() });
    }
    dup.sort((a, b) => a.id - b.id);
    return dup;
}

function computePageGaps(fileInfos: FileInfo[], pageStartAt: number): PageGap[] {
    const byId = new Map<number, number[]>();
    for (const f of fileInfos) {
        if (f.id === null || f.page === null) continue;
        const arr = byId.get(f.id) || [];
        arr.push(f.page);
        byId.set(f.id, arr);
    }
    const out: PageGap[] = [];
    for (const [id, pages] of byId.entries()) {
        const uniq = uniqueSorted(pages);
        const present = new Set(uniq);
        const min = Math.min(...uniq, pageStartAt);
        const max = Math.max(...uniq);
        const missing: number[] = [];
        for (let p = min; p <= max; p++) if (!present.has(p)) missing.push(p);
        if (missing.length) out.push({ id, missing });
    }
    out.sort((a, b) => a.id - b.id);
    return out;
}

function compactRanges(nums: number[]): string {
    if (nums.length === 0) return "";

    const ranges: string[] = [];
    const first = nums[0];
    if (first === undefined) return ""; // protección extra si está "noUncheckedIndexedAccess"

    let start = first;
    let prev = first;

    for (let i = 1; i < nums.length; i++) {
        const n = nums[i];
        if (n === undefined) continue; // evita error en strict

        if (n === prev + 1) {
            prev = n;
        } else {
            ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
            start = prev = n;
        }
    }

    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    return ranges.join(", ");
}

// --------------------------- Main ---------------------------

async function main(): Promise<void> {
    const args = parseCli();
    const root = path.resolve(args.dir);
    const files = await collectFiles(root, args.pattern);
    const { idRe, pageRe } = compileRegexes(args.caseInsensitive);

    const infos: FileInfo[] = files.map(f => extractInfo(f, root, idRe, pageRe));

    const unparsable = infos.filter(i => i.id === null).map(i => i.rel).sort();
    const ids = uniqueSorted(infos.filter(i => i.id !== null).map(i => i.id as number));

    const minId: number | null = ids.length === 0 ? null : (ids[0]!);
    const maxId: number | null = ids.length === 0 ? null : (ids[ids.length - 1]!);

    const { missing: missingIds, gaps: idGaps } = computeIdGaps(ids);
    const duplicates = groupDuplicates(infos);
    const pageGaps = args.checkPages ? computePageGaps(infos, args.pageStartAt) : [];

    // Human-readable output
    console.log(`Scanned ${files.length} files under ${root}.`);
    console.log(`IDs present: ${ids.length}${ids.length ? ` (min ${ids[0]}, max ${ids[ids.length - 1]})` : ""}`);

    if (missingIds.length) {
        console.log(`Missing ID count: ${missingIds.length}`);
        console.log(`Missing ranges: ${compactRanges(missingIds)}`);
        console.log("Break points:");
        for (const g of idGaps) {
            const afterTxt = g.after === 0 ? "before 1" : `after ${g.after}`;
            console.log(`  Gap ${afterTxt}: ${compactRanges(g.missing)}`);
        }
    } else {
        console.log("No missing IDs within the observed min..max range.");
    }

    if (duplicates.length) {
        console.log("Duplicate IDs (multiple files share the same ID):");
        for (const d of duplicates) {
            console.log(`  id-${d.id}: ${d.count} files`);
            for (const f of d.files) console.log(`    - ${f}`);
        }
    }

    if (unparsable.length) {
        console.log("Files without an 'id-<n>' token:");
        for (const r of unparsable) console.log(`  - ${r}`);
    }

    if (args.checkPages && pageGaps.length) {
        console.log("Page gaps by ID:");
        for (const pg of pageGaps) {
            console.log(`  id-${pg.id}: missing pages ${compactRanges(pg.missing)}`);
        }
    }

    const report: Report = {
        dir: root,
        scannedFiles: files.length,
        idsPresent: ids,
        minId,
        maxId,
        missingIds,
        idGaps,
        duplicateIds: duplicates,
        unparsableFiles: unparsable,
        pageGaps,
        generatedAt: new Date().toISOString(),
    };

    if (args.out && args.out.trim().length > 0) {
        const outPath = path.resolve(args.out);
        await fs.writeFile(outPath, JSON.stringify(report, null, 2), { encoding: "utf8" });
        console.log(`Report written to ${outPath}`);
    }
}

main().catch(err => {
    console.error(err);
    process.exitCode = 1;
});
