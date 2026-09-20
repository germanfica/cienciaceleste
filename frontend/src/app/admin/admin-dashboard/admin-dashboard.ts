import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Footer } from '../../footer/footer';
import { AdminMenu } from '../admin-menu/admin-menu';

@Component({
  selector: 'app-admin-dashboard',
  imports: [RouterModule, Footer, AdminMenu],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboard {}
