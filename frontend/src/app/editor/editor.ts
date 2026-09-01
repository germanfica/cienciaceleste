import { Component, ChangeDetectionStrategy } from "@angular/core";
import { RouterModule } from "@angular/router";
import { CommonModule } from "@angular/common";
import { Footer } from "../footer/footer";

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, RouterModule, Footer],
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Editor {
}
