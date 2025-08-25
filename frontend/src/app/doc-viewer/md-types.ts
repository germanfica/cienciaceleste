// md-types.ts
export type Inline =
  | { t: "text"; text: string }
  | { t: "strong"; text: string }
  | { t: "em"; text: string }
  | { t: "code"; text: string }
  | { t: "link"; text: string; href: string };

export type Block =
  | { t: "h1"|"h2"|"h3"|"h4"|"h5"|"h6"; text: string; id?: string }
  | { t: "p"; inlines: Inline[] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; items: Inline[][] }
  | { t: "code"; lang?: string; code: string }
  | { t: "img"; src: string; alt?: string }
  | { t: "blockquote"; inlines: Inline[] }
  | { t: "author"; text: string };

export interface DocJson {
  id: string|number;
  titulo: string;
  autor: string;
  bloques: Block[];
}
