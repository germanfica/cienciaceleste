import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('cienciaceleste');

  // signal para controlar si el botón se muestra
  protected deferredPrompt: any = null;
  protected canInstall = signal(false);

  constructor() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredPrompt = event;
      this.canInstall.set(true);
      console.log('PWA install prompt listo');
    });
  }

  installPwa() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('PWA instalada 🚀');
        } else {
          console.log('Instalación cancelada ❌');
        }
        this.deferredPrompt = null;
        this.canInstall.set(false);
      });
    }
  }
}
