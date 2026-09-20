export const DEFAULT_AUTHOR = "El Alfa y la Omega";

export const documentTypes = ["rollo", "minirollo", "ley"] as const;
export type DocumentType = (typeof documentTypes)[number];

export type WriteRolloRequest = {
  operation: "create" | "replace";
  id: number;
  pagina: number;
  titulo: string;
  contenido: string;
  autor: typeof DEFAULT_AUTHOR;
};

export type WriteMinirolloRequest = WriteRolloRequest;

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

export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export type JobRecord = {
  id: string;
  userId: string;
  documentType: DocumentType;
  requestJson: string;
  status: JobStatus;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  output: string | null;
  error: string | null;
};

export type PublicJob = Omit<JobRecord, "userId" | "requestJson">;
