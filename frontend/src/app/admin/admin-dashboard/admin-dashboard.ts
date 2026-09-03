import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Footer } from '../../footer/footer';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterModule, Footer],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboard {}
