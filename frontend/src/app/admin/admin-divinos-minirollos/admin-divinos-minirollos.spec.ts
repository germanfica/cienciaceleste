import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminDivinosMinirollos } from './admin-divinos-minirollos';

describe('AdminDivinosMinirollos', () => {
  let component: AdminDivinosMinirollos;
  let fixture: ComponentFixture<AdminDivinosMinirollos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDivinosMinirollos],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDivinosMinirollos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
