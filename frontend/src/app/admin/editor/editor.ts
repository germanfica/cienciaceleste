import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Inject,
  OnDestroy,
  OnInit,
  signal
} from "@angular/core";
import { DOCUMENT } from "@angular/common";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { combineLatest, EMPTY, Subscription, map, switchMap, throwError } from "rxjs";
import { Footer } from "../../footer/footer";
import { Block, DocJson, Inline } from "../../doc-viewer/md-types";
import { DOCS, DocsApi } from "../../doc-viewer/docs.api";
import { EditorExportJson } from "../editor-export-json/editor-export-json";

type MediaItem = { path: string; name: string; bytes: number; type: string };
type ContentPart = { kind: "text" | "image"; text: string; src: string; alt: string; start: number; end: number };

type DocumentType = "rollo" | "minirollo" | "ley";

const DEFAULT_AUTHOR = "El Alfa y la Omega";

@Component({
  selector: "app-editor",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Footer, EditorExportJson],
  templateUrl: "./editor.html",
  styleUrl: "./editor.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Editor implements OnInit, OnDestroy {
  readonly documentId = signal<number | null>(null);
  readonly isNewDocument = signal(false);
  readonly documentType = signal<DocumentType>("rollo");
  readonly titulo = signal("");
  readonly contenido = signal("");
  readonly autor = DEFAULT_AUTHOR;
  readonly pagina = signal<number | null>(null);
  readonly shownNumber = signal<number | null>(null);
  readonly indexInPage = signal<number | null>(null);
  readonly cargando = signal(true);
  readonly error = signal("");

  readonly documentName = computed(() => {
    switch (this.documentType()) {
      case "minirollo":
        return "divino minirollo";

      case "ley":
        return "divina ley";

      default:
        return "divino rollo";
    }
  });
  readonly documentNameWithArticle = computed(() =>
    this.documentType() === "ley" ? "la divina ley" : `el ${this.documentName()}`
  );
  readonly newDocumentHeading = computed(() =>
    this.documentType() === "ley" ? "Nueva divina ley" : `Nuevo ${this.documentName()}`
  );
  readonly documentGenitiveName = computed(() =>
    this.documentType() === "ley" ? "de la divina ley" : `del ${this.documentName()}`
  );
  readonly documentListName = computed(() => {
    switch (this.documentType()) {
      case "minirollo":
        return "divinos minirollos";

      case "ley":
        return "divinas leyes";

      default:
        return "divinos rollos";
    }
  });
  readonly publicListPath = computed(() => {
    switch (this.documentType()) {
      case "minirollo":
        return "/divinos-minirollos";

      case "ley":
        return "/divinas-leyes";

      default:
        return "/divinos-rollos";
    }
  });
  readonly adminListPath = computed(() => {
    switch (this.documentType()) {
      case "minirollo":
        return "/admin/divinos-minirollos";

      case "ley":
        return "/admin/divinas-leyes";

      default:
        return "/admin/divinos-rollos";
    }
  });

  readonly sourceMode = signal(false);
  readonly galleryOpen = signal(false);
  readonly mediaLoading = signal(false);
  readonly mediaError = signal("");
  readonly mediaQuery = signal("");
  readonly mediaItems = signal<MediaItem[]>([]);
  readonly mediaPage = signal(0);
  readonly filteredMedia = computed(() => this.mediaItems().filter(item =>
    item.name.toLowerCase().includes(this.mediaQuery().toLowerCase())));
  readonly visibleMedia = computed(() => this.filteredMedia().slice(this.mediaPage() * 40, (this.mediaPage() + 1) * 40));
  readonly contentParts = computed(() => this.splitContent(this.contenido()));
  private insertionPoint: number | null = null;
  private mediaAbort?: AbortController;

  private normalizeVisualText(value: string): string {
    return value.replace(/\s+/g, " ");
  }

  private normalizeVisualContent(): void {
    if (this.sourceMode() || this.documentType() !== "rollo") return;
    const parts = this.splitContent(this.contenido());
    this.contenido.set(parts.map(part => part.kind === "image"
      ? part.text.trim()
      : this.normalizeVisualText(part.text).trim())
      .filter(Boolean).join("\n\n"));
    this.insertionPoint = null;
  }

  toggleSourceMode(): void {
    this.sourceMode.set(!this.sourceMode());
    this.normalizeVisualContent();
    this.insertionPoint = null;
  }

  private splitContent(value: string): ContentPart[] {
    const result: ContentPart[] = [];
    const expression = /^!\[([^\]\r\n]*)\]\(([^\r\n]+)\)[ \t]*$/gm;
    // Keep image separators outside editable ranges. The textareas must never
    // own the newlines required to serialize an image as a Markdown block.
    const appendText = (from: number, to: number, afterImage: boolean, beforeImage: boolean): void => {
      let start = from;
      let end = to;
      if (afterImage) start += /^(?:\r?\n){1,2}/.exec(value.slice(start, end))?.[0].length ?? 0;
      if (beforeImage) end -= /(?:\r?\n){1,2}$/.exec(value.slice(start, end))?.[0].length ?? 0;
      result.push({ kind: "text", text: value.slice(start, end), src: "", alt: "", start, end });
    };
    let start = 0;
    let afterImage = false;
    for (const match of value.matchAll(expression)) {
      const index = match.index!;
      const src = this.imageUrl(match[2] ?? "");
      if (!src) continue;
      appendText(start, index, afterImage, true);
      const end = index + match[0].length;
      result.push({ kind: "image", text: match[0], src, alt: match[1] ?? "", start: index, end });
      start = end;
      afterImage = true;
    }
    appendText(start, value.length, afterImage, false);
    return result;
  }

  imageUrl(value: string): string {
    try {
      const url = new URL(value, this.document.baseURI);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch { return ""; }
  }

  updatePart(part: ContentPart, event: Event): void {
    const input = event.target as HTMLTextAreaElement;
    // Wait for composition to finish before modifying text entered with an IME.
    if ((event as InputEvent).isComposing) return;
    const value = this.contenido();
    const raw = input.value;
    const text = this.normalizeVisualText(raw);
    const caret = this.normalizeVisualText(raw.slice(0, input.selectionStart)).length;
    const selectionEnd = this.normalizeVisualText(raw.slice(0, input.selectionEnd)).length;
    const direction = input.selectionDirection;
    // Update the DOM even if normalization leaves the signal unchanged (for
    // example, when typing a second space). Preserve the selection position.
    if (raw !== text) {
      input.value = text;
      input.setSelectionRange(caret, selectionEnd, direction);
    }
    let before = value.slice(0, part.start);
    let after = value.slice(part.end);
    // Older source may contain only one newline (or none at the document
    // edges). Supply paragraph separators without putting them in the input.
    if (before) {
      const count = /(?:\r?\n)*$/.exec(before)?.[0].match(/\n/g)?.length ?? 0;
      before += "\n".repeat(Math.max(0, 2 - count));
    }
    if (after) {
      const count = /^(?:\r?\n)*/.exec(after)?.[0].match(/\n/g)?.length ?? 0;
      after = "\n".repeat(Math.max(0, 2 - count)) + after;
    }
    this.contenido.set(before + text + after);
    this.insertionPoint = before.length + caret;
  }

  rememberCaret(event: Event, start = 0): void {
    this.insertionPoint = start + (event.target as HTMLTextAreaElement).selectionStart;
  }

  removeImage(part: ContentPart): void {
    this.contenido.update(value => value.slice(0, part.start) + value.slice(part.end));
    this.insertionPoint = part.start;
    this.normalizeVisualContent();
  }

  async openGallery(): Promise<void> {
    this.galleryOpen.set(true);
    await this.reloadMedia();
  }

  async reloadMedia(): Promise<void> {
    this.mediaAbort?.abort();
    const controller = new AbortController();
    this.mediaAbort = controller;
    this.mediaLoading.set(true);
    this.mediaError.set("");
    try {
      const response = await fetch(new URL("media/index.json", this.document.baseURI), { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("No se pudo cargar el índice. Ejecutá npm run gulp -- media:index y recargá la galería.");
      const data: unknown = await response.json();
      const index = data as { version?: unknown; items?: unknown };
      if (!index || index.version !== 1 || !Array.isArray(index.items)) throw new Error("El índice multimedia no tiene un formato válido.");
      const items: MediaItem[] = [];
      for (const raw of index.items) {
        const item = raw as Partial<MediaItem> | null;
        if (!item || typeof item.path !== "string" || typeof item.name !== "string" || typeof item.bytes !== "number" || typeof item.type !== "string") continue;
        // Only app-relative files from the static index, with no URL scheme or traversal.
        if (!/^(?:[^/:?#\\]+\/)*[^/:?#\\]+$/.test(item.path)) continue;
        let segments: string[];
        try { segments = item.path.split("/").map(segment => decodeURIComponent(segment)); } catch { continue; }
        if (segments.some(segment => segment === "." || segment === ".." || /[\\/\x00-\x1f]/.test(segment))) continue;
        items.push(item as MediaItem);
      }
      this.mediaItems.set(items);
      this.mediaPage.set(0);
    } catch (error) {
      if (!controller.signal.aborted) this.mediaError.set(error instanceof Error ? error.message : "No se pudo cargar la galería.");
    } finally {
      if (!controller.signal.aborted) this.mediaLoading.set(false);
    }
  }

  insertImage(item: MediaItem): void {
    const value = this.contenido();
    const point = Math.min(this.insertionPoint ?? value.length, value.length);
    const alt = item.name.replace(/[\[\]\r\n]/g, " ");
    const markdown = `\n\n![${alt}](${item.path})\n\n`;
    this.contenido.set(value.slice(0, point) + markdown + value.slice(point));
    this.insertionPoint = point + markdown.length;
    this.galleryOpen.set(false);
    this.normalizeVisualContent();
  }

  private readonly sub = new Subscription();

  constructor(
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly route: ActivatedRoute,
    @Inject(DOCS) private readonly docs: DocsApi
  ) {}

  ngOnInit(): void {
    this.sub.add(
      combineLatest([this.route.paramMap, this.route.data])
        .pipe(
          map(([params, data]) => ({
            routeId: params.get("id"),
            documentType: this.parseDocumentType(data["documentType"])
          })),
          switchMap(({ routeId, documentType }) => {
            this.documentType.set(documentType);
            this.insertionPoint = null;
            this.galleryOpen.set(false);

            if (routeId === "nuevo") {
              this.documentId.set(null);
              this.isNewDocument.set(true);
              this.titulo.set("");
              this.contenido.set("");
              this.cargando.set(false);
              this.error.set("");
              return EMPTY;
            }

            const id = Number(routeId);

            if (!Number.isInteger(id) || id <= 0) {
              return throwError(() => new Error(`El ID ${this.documentGenitiveName()} no es válido.`));
            }

            this.documentId.set(id);
            this.isNewDocument.set(false);
            this.cargando.set(true);
            this.error.set("");

            switch (documentType) {
              case "minirollo":
                return this.docs.getMiniRolloDoc(id);

              case "ley":
                return this.docs.getLeyDoc(id);

              default:
                return this.docs.getRolloDoc(id);
            }
          })
        )
        .subscribe({
          next: doc => {
            this.cargarDocumento(doc);
            this.normalizeVisualContent();
            this.cargando.set(false);
          },
          error: () => {
            this.cargando.set(false);
            const adjective = this.documentType() === "ley" ? "solicitada" : "solicitado";
            this.error.set(`No se pudo cargar ${this.documentNameWithArticle()} ${adjective}.`);
          }
        })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.mediaAbort?.abort();
  }

  private parseDocumentType(value: unknown): DocumentType {
    if (value === "minirollo" || value === "ley") {
      return value;
    }

    return "rollo";
  }

  private cargarDocumento(doc: DocJson): void {
    //this.autor.set(doc.autor?.trim() || DEFAULT_AUTHOR);
    if (this.documentType() === "ley") {
      this.titulo.set("");
      this.contenido.set(doc.titulo ?? "");
      return;
    }

    this.titulo.set(doc.titulo ?? "");
    this.contenido.set(
      doc.bloques
        .filter(block => block.t !== "h1" && block.t !== "author")
        .map(block => this.bloqueATexto(block))
        .filter(Boolean)
        .join("\n\n")
    );
  }

  private bloqueATexto(block: Block): string {
    switch (block.t) {
      case "p":
        return this.inlinesATexto(block.inlines);

      case "blockquote":
        return this.inlinesATexto(block.inlines)
          .split("\n")
          .map(line => `> ${line}`)
          .join("\n");

      case "ul":
        return block.items
          .map(item => `- ${this.inlinesATexto(item)}`)
          .join("\n");

      case "ol":
        return block.items
          .map((item, index) => `${index + 1}. ${this.inlinesATexto(item)}`)
          .join("\n");

      case "code":
        return `\`\`\`${block.lang ?? ""}\n${block.code}\n\`\`\``;

      case "img":
        return `![${block.alt ?? ""}](${block.src})`;

      default:
        return "";
    }
  }

  private inlinesATexto(inlines: Inline[]): string {
    return inlines
      .map(inline => {
        switch (inline.t) {
          case "strong":
            return `**${inline.text}**`;

          case "em":
            return `*${inline.text}*`;

          case "code":
            return `\`${inline.text}\``;

          case "link":
            return `[${inline.text}](${inline.href})`;

          default:
            return inline.text;
        }
      })
      .join("");
  }
}
