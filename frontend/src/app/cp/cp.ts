import { Component, ElementRef, Input } from '@angular/core';

@Component({
  selector: 'cp',
  standalone: true,
  template: ``,
  exportAs: 'cp',   // 👈 Esto es la clave
  host: {
    '[id]': 'id',
    '[attr.data-for]': 'dataFor',
  }
})
export class Cp {
  @Input() id?: string;
  @Input('data-for') dataFor?: string;

  constructor(public el: ElementRef<HTMLElement>) { }
}
