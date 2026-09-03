import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  signal
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { Subscription, map, switchMap, throwError } from "rxjs";
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
  readonly rolloId = signal<number | null>(null);
  readonly titulo = signal("");
  readonly contenido = signal("");
  readonly cargando = signal(true);
  readonly error = signal("");

  private readonly sub = new Subscription();

  constructor(
    private readonly route: ActivatedRoute,
    @Inject(DOCS) private readonly docs: DocsApi
  ) {}

  ngOnInit(): void {
    this.sub.add(
      this.route.paramMap
        .pipe(
          map(params => Number(params.get("id"))),
          switchMap(id => {
            if (!Number.isInteger(id) || id <= 0) {
              return throwError(() => new Error("El ID del divino rollo no es válido."));
            }

            this.rolloId.set(id);
            this.cargando.set(true);
            this.error.set("");

            return this.docs.getRolloDoc(id);
          })
        )
        .subscribe({
          next: doc => {
            this.cargarDocumento(doc);
            this.cargando.set(false);
          },
          error: () => {
            this.cargando.set(false);
            this.error.set("No se pudo cargar el divino rollo solicitado.");
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
