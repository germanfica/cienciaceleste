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
import { combineLatest, Subscription, map, switchMap, throwError } from "rxjs";
import { Footer } from "../../footer/footer";
import { Block, DocJson, Inline } from "../../doc-viewer/md-types";
import { DOCS, DocsApi } from "../../doc-viewer/docs.api";

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
  readonly documentType = signal<"rollo" | "minirollo">("rollo");
  readonly titulo = signal("");
  readonly contenido = signal("");
  readonly cargando = signal(true);
  readonly error = signal("");

  readonly documentName = computed(() =>
    this.documentType() === "minirollo" ? "divino minirollo" : "divino rollo"
  );
  readonly publicListPath = computed(() =>
    this.documentType() === "minirollo" ? "/divinos-minirollos" : "/divinos-rollos"
  );
  readonly adminListPath = computed(() =>
    this.documentType() === "minirollo" ? "/admin/divinos-minirollos" : "/admin/divinos-rollos"
  );

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
            id: Number(params.get("id")),
            documentType: data["documentType"] === "minirollo" ? "minirollo" as const : "rollo" as const
          })),
          switchMap(({ id, documentType }) => {
            this.documentType.set(documentType);

            if (!Number.isInteger(id) || id <= 0) {
              return throwError(() => new Error(`El ID del ${this.documentName()} no es válido.`));
            }

            this.documentId.set(id);
            this.cargando.set(true);
            this.error.set("");

            return documentType === "minirollo"
              ? this.docs.getMiniRolloDoc(id)
              : this.docs.getRolloDoc(id);
          })
        )
        .subscribe({
          next: doc => {
            this.cargarDocumento(doc);
            this.cargando.set(false);
          },
          error: () => {
            this.cargando.set(false);
            this.error.set(`No se pudo cargar el ${this.documentName()} solicitado.`);
          }
        })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private cargarDocumento(doc: DocJson): void {
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
