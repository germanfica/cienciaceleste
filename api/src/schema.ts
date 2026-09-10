import { z } from "zod";
import { DEFAULT_AUTHOR, documentTypes } from "./types.js";

const positiveInteger = z.number().int().positive();

const content = z
  .string()
  .max(1_000_000)
  .transform(value => value.replace(/\r\n?/g, "\n").trim())
  .refine(value => value.length > 0, "El contenido no puede estar vacío.")
  .refine(value => !value.includes("\0"), "El contenido contiene un carácter nulo.");

const title = z
  .string()
  .max(10_000)
  .transform(value => value.replace(/\r\n?/g, "\n").trim())
  .refine(value => value.length > 0, "El título no puede estar vacío.")
  .refine(value => !value.includes("\0"), "El título contiene un carácter nulo.");

const author = z
  .string()
  .max(200)
  .transform(value => value.trim())
  .refine(value => value === DEFAULT_AUTHOR, `El autor debe ser ${DEFAULT_AUTHOR}.`)
  .transform(() => DEFAULT_AUTHOR as typeof DEFAULT_AUTHOR);

const rolloRequest = z.object({
  operation: z.enum(["create", "replace"]),
  id: positiveInteger,
  pagina: positiveInteger,
  titulo: title,
  contenido: content,
  autor: author
}).strict();

const leyRequest = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("create"),
    pagina: positiveInteger,
    shownNumber: positiveInteger,
    contenido: content
  }).strict(),
  z.object({
    operation: z.literal("update"),
    pagina: positiveInteger,
    indexInPage: positiveInteger.max(100),
    contenido: content
  }).strict()
]);

export const LoginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(12).max(4_096)
}).strict();

export const DocumentTypeSchema = z.enum(documentTypes);

export function parseDocumentRequest(documentType: unknown, request: unknown) {
  const type = DocumentTypeSchema.parse(documentType);

  switch (type) {
    case "rollo":
    case "minirollo":
      return rolloRequest.parse(request);
    case "ley":
      return leyRequest.parse(request);
  }
}
