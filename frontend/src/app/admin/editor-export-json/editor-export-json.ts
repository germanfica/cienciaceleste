import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  Input,
  signal
} from "@angular/core";
import { firstValueFrom, Observable } from "rxjs";
import { DocIndexPage } from "../../doc-viewer/doc-types";
import { DOCS, DocsApi } from "../../doc-viewer/docs.api";

export type EditorDocumentType = "rollo" | "minirollo" | "ley";

export type WriteRolloRequest = {
  operation: "create" | "replace";
  id: number;
  pagina: number;
  titulo: string;
  contenido: string;
  autor?: string | null;
};

export type WriteMinirolloRequest = {
  operation: "create" | "replace";
  id: number;
  pagina: number;
  titulo: string;
  contenido: string;
  autor?: string | null;
};

export type WriteLeyRequest =
  | {
      operation: "create";
      pagina: number;
      shownNumber: number;
      contenido: string;
    }
  | {
      operation: "update";
      pagina: number;
      indexInPage: number;
      contenido: string;
    };

export type EditorWriteRequest =
  | WriteRolloRequest
  | WriteMinirolloRequest
  | WriteLeyRequest;

type WritableFile = {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
};

type SaveFileHandle = {
  createWritable(): Promise<WritableFile>;
};

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<SaveFileHandle>;
};

@Component({
  selector: "app-editor-export-json",
  standalone: true,
  templateUrl: "./editor-export-json.html",
  styleUrl: "./editor-export-json.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditorExportJson {
  @Input({ required: true }) documentType!: EditorDocumentType;
  @Input({ required: true }) isNewDocument!: boolean;
  @Input() id: number | null = null;
  @Input() pagina: number | null = null;
  @Input() titulo = "";
  @Input({ required: true }) contenido = "";
  @Input() autor: string | null | undefined = undefined;
  @Input() shownNumber: number | null = null;
  @Input() indexInPage: number | null = null;
  @Input() disabled = false;

  readonly exportError = signal("");
  readonly exporting = signal(false);

  constructor(@Inject(DOCS) private readonly docs: DocsApi) {}

  async exportarJson(): Promise<void> {
    if (this.disabled || this.exporting()) {
      return;
    }

    this.exportError.set("");
    this.exporting.set(true);

    try {
      const request = await this.buildWriteRequest();
      const json = JSON.stringify(request, null, 2) + "\n";
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const fileName = this.buildFileName(request);

      await this.saveBlob(blob, fileName);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      this.exportError.set(
        error instanceof Error
          ? error.message
          : "No se pudo exportar el archivo JSON."
      );
    } finally {
      this.exporting.set(false);
    }
  }

  private async buildWriteRequest(): Promise<EditorWriteRequest> {
    const contenido = this.requiredText(this.contenido, "El contenido");
    const firstIndexPage = await firstValueFrom(this.getIndexPage(1));
    const pageSize = this.positiveInteger(
      firstIndexPage.pageSize,
      "El tamaño de página del índice"
    );

    if (this.isNewDocument) {
      const lastId = this.nonNegativeInteger(
        firstIndexPage.totalIds,
        "El último ID del índice"
      );
      const nextId = lastId + 1;
      const pagina = Math.ceil(nextId / pageSize);

      if (this.documentType === "ley") {
        return {
          operation: "create",
          pagina,
          shownNumber: nextId,
          contenido
        };
      }

      return this.buildRolloRequest(nextId, pagina, "create", contenido);
    }

    const id = this.positiveInteger(this.id, "El ID");
    const pagina = Math.ceil(id / pageSize);

    if (this.documentType === "ley") {
      const indexPage =
        pagina === firstIndexPage.page
          ? firstIndexPage
          : await firstValueFrom(this.getIndexPage(pagina));
      const itemIndex = indexPage.items.findIndex(item => item.id === id);

      if (itemIndex < 0) {
        throw new Error(
          `La divina ley ${id} no fue encontrada en la página ${pagina} del índice.`
        );
      }

      return {
        operation: "update",
        pagina,
        indexInPage: itemIndex + 1,
        contenido
      };
    }

    return this.buildRolloRequest(id, pagina, "replace", contenido);
  }

  private buildRolloRequest(
    id: number,
    pagina: number,
    operation: "create" | "replace",
    contenido: string
  ): WriteRolloRequest | WriteMinirolloRequest {
    const request: WriteRolloRequest | WriteMinirolloRequest = {
      operation,
      id,
      pagina,
      titulo: this.requiredText(this.titulo, "El título"),
      contenido
    };

    if (this.autor !== undefined) {
      request.autor = this.optionalText(this.autor, "El autor");
    }

    return request;
  }

  private getIndexPage(page: number): Observable<DocIndexPage> {
    switch (this.documentType) {
      case "minirollo":
        return this.docs.getMiniRolloIndexPageRemote(page);

      case "ley":
        return this.docs.getDivinaLeyIndexPageRemote(page);

      default:
        return this.docs.getRolloIndexPageRemote(page);
    }
  }

  private buildFileName(request: EditorWriteRequest): string {
    if ("shownNumber" in request) {
      return `write-ley-create-${request.shownNumber}.json`;
    }

    if ("indexInPage" in request) {
      return `write-ley-update-${this.id}.json`;
    }

    return `write-${this.documentType}-${request.operation}-${request.id}.json`;
  }

  private async saveBlob(blob: Blob, fileName: string): Promise<void> {
    const pickerWindow = window as SaveFilePickerWindow;

    if (pickerWindow.showSaveFilePicker) {
      const handle = await pickerWindow.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: "Archivo JSON",
            accept: { "application/json": [".json"] }
          }
        ]
      });
      const writable = await handle.createWritable();

      await writable.write(blob);
      await writable.close();
      return;
    }

    this.downloadBlob(blob, fileName);
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private positiveInteger(value: number | null, label: string): number {
    const number = Number(value);

    if (value === null || !Number.isInteger(number) || number <= 0) {
      throw new Error(`${label} debe ser un entero mayor que cero.`);
    }

    return number;
  }

  private nonNegativeInteger(value: number, label: string): number {
    const number = Number(value);

    if (!Number.isInteger(number) || number < 0) {
      throw new Error(`${label} debe ser un entero mayor o igual que cero.`);
    }

    return number;
  }

  private requiredText(value: string, label: string): string {
    const text = value.replace(/\r\n?/g, "\n").trim();

    if (!text) {
      throw new Error(`${label} no puede estar vacío.`);
    }

    if (text.includes("\0")) {
      throw new Error(`${label} contiene un carácter nulo.`);
    }

    return text;
  }

  private optionalText(value: string | null, label: string): string | null {
    if (value === null || value === "") {
      return null;
    }

    return this.requiredText(value, label);
  }
}
