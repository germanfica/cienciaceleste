import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DivinasLeyes } from './divinas-leyes';

describe('DivinasLeyes', () => {
  let component: DivinasLeyes;
  let fixture: ComponentFixture<DivinasLeyes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DivinasLeyes]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DivinasLeyes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
