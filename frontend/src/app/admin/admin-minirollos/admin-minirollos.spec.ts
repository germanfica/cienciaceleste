import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminMinirollos } from './admin-minirollos';

describe('AdminMinirollos', () => {
  let component: AdminMinirollos;
  let fixture: ComponentFixture<AdminMinirollos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminMinirollos],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminMinirollos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
