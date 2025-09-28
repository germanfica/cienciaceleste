import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Footer } from "../footer/footer";

@Component({
  selector: 'app-home',
  imports: [RouterModule, Footer],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {

}
