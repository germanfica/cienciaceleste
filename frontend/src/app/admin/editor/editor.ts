import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Inject,
  OnDestroy,
  OnInit,
  signal
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { combineLatest, EMPTY, Subscription, map, switchMap, throwError } from "rxjs";
import { Footer } from "../../footer/footer";
import { Block, DocJson, Inline } from "../../doc-viewer/md-types";
import { DOCS, DocsApi } from "../../doc-viewer/docs.api";

type DocumentType = "rollo" | "minirollo" | "ley";

@Component({
  selector: "app-editor",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, Footer],
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

  private readonly sub = new Subscription();

  constructor(
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
  }

  private parseDocumentType(value: unknown): DocumentType {
    if (value === "minirollo" || value === "ley") {
      return value;
    }

    return "rollo";
  }

  private cargarDocumento(doc: DocJson): void {
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
