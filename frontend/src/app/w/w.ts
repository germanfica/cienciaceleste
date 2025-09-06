import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'w',
  standalone: true,
  template: `<ng-content></ng-content>`,
  host: {
    '[id]': 'id',
    '[attr.data-w]': 'dataW',
    '(click)': 'handleClick($event)',
  }
})
export class W {
  @Input() id?: string;
  @Input('data-w') dataW?: number;

  @Output() wordClick = new EventEmitter<string>();

  handleClick(e: Event) {
    if (this.id) this.wordClick.emit(this.id);
  }
}
