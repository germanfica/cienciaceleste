import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminDivinasLeyes } from './admin-divinas-leyes';

describe('AdminDivinasLeyes', () => {
  let component: AdminDivinasLeyes;
  let fixture: ComponentFixture<AdminDivinasLeyes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminDivinasLeyes],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDivinasLeyes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
