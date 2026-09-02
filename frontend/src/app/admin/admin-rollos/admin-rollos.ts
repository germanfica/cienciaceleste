import { ChangeDetectionStrategy, Component, Inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { Observable } from "rxjs";
import { DocIndexPage } from "../../doc-viewer/doc-types";
import { Pagination } from "../../doc-viewer/pagination";
import { Footer } from "../../footer/footer";
import { IndexPaginator } from "../../index-paginator/index-paginator";
import { DOCS, DocsApi } from "../../doc-viewer/docs.api";

interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

@Component({
  selector: "app-admin-rollos",
  imports: [CommonModule, RouterModule, Footer, IndexPaginator],
  providers: [Pagination],
  templateUrl: "./admin-rollos.html",
  styleUrl: "./admin-rollos.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminRollos implements OnInit {
  page$!: Observable<DocIndexPage>;
  pages$!: Observable<number[]>;
  searchTerm = "";

  constructor(
    @Inject(DOCS) private docs: DocsApi,
    private pagination: Pagination
  ) {}

  ngOnInit(): void {
    this.page$ = this.pagination.createPage$(page => this.docs.getRolloIndexPageRemote(page));
    this.pages$ = this.pagination.createPages$(this.page$);
  }

  onSearchInput(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
  }

  filterItems(items: DocIndexPage["items"]): DocIndexPage["items"] {
    const term = this.foldText(this.searchTerm).trim();

    if (!term) {
      return items;
    }

    return items.filter(item =>
      this.foldText(`${item.id} ${item.titulo}`).includes(term)
    );
  }

  highlightText(value: string): HighlightSegment[] {
    const term = this.foldText(this.searchTerm).trim();

    if (!term) {
      return [{ text: value, highlighted: false }];
    }

    const foldedCharacters: string[] = [];
    const sourceStarts: number[] = [];
    const sourceEnds: number[] = [];
    let sourceIndex = 0;

    for (const character of value) {
      const characterStart = sourceIndex;
      sourceIndex += character.length;

      const foldedCharacter = this.foldText(character);

      for (let index = 0; index < foldedCharacter.length; index += 1) {
        foldedCharacters.push(foldedCharacter[index]);
        sourceStarts.push(characterStart);
        sourceEnds.push(sourceIndex);
      }
    }

    const foldedValue = foldedCharacters.join("");
    const segments: HighlightSegment[] = [];
    let foldedIndex = 0;
    let sourceCursor = 0;

    while (foldedIndex < foldedValue.length) {
      const matchIndex = foldedValue.indexOf(term, foldedIndex);

      if (matchIndex === -1) {
        break;
      }

      const matchStart = sourceStarts[matchIndex];
      const matchEnd = sourceEnds[matchIndex + term.length - 1];

      if (matchStart > sourceCursor) {
        segments.push({
          text: value.slice(sourceCursor, matchStart),
          highlighted: false
        });
      }

      segments.push({
        text: value.slice(matchStart, matchEnd),
        highlighted: true
      });

      sourceCursor = matchEnd;
      foldedIndex = matchIndex + term.length;
    }

    if (sourceCursor < value.length) {
      segments.push({
        text: value.slice(sourceCursor),
        highlighted: false
      });
    }

    return segments.length > 0
      ? segments
      : [{ text: value, highlighted: false }];
  }

  deleteRollo(id: number): void {
    const confirmed = window.confirm(`¿Eliminar el divino rollo ${id}?`);

    if (!confirmed) {
      return;
    }

    window.alert("La eliminación todavía debe conectarse al almacenamiento de los rollos.");
  }

  trackItemId = (_: number, item: { id: number }): number => item.id;

  private foldText(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }
}
