import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminRollos } from './admin-rollos';

describe('AdminRollos', () => {
  let component: AdminRollos;
  let fixture: ComponentFixture<AdminRollos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRollos],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRollos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
