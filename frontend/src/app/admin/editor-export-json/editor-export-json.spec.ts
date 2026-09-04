import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorExportJson } from './editor-export-json';

describe('EditorExportJson', () => {
  let component: EditorExportJson;
  let fixture: ComponentFixture<EditorExportJson>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorExportJson],
    }).compileComponents();

    fixture = TestBed.createComponent(EditorExportJson);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
