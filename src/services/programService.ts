import { Program, Section } from '../types';
import { fetchCollection, fetchDocById, saveDoc, updateDocById, deleteDocById } from './storage';

// Programs
export async function getAllPrograms(): Promise<Program[]> {
  return fetchCollection<Program>('programs');
}

export async function getProgramById(id: string): Promise<Program | null> {
  return fetchDocById<Program>('programs', id);
}

export async function createProgram(data: Omit<Program, 'id' | 'createdAt'>): Promise<Program> {
  const id = `prog-${Date.now().toString(36)}`;
  const newProg: Program = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
  };
  await saveDoc('programs', id, newProg);
  return newProg;
}

export async function updateProgram(id: string, updates: Partial<Program>): Promise<void> {
  await updateDocById('programs', id, updates);
}

export async function deleteProgram(id: string): Promise<void> {
  await deleteDocById('programs', id);
}

// Sections
export async function getAllSections(): Promise<Section[]> {
  return fetchCollection<Section>('sections');
}

export async function getSectionsByProgram(programId: string): Promise<Section[]> {
  const all = await getAllSections();
  return all.filter(s => s.programId === programId);
}

export async function createSection(data: Omit<Section, 'id'>): Promise<Section> {
  const id = `sec-${Date.now().toString(36)}`;
  const newSec: Section = {
    ...data,
    id,
  };
  await saveDoc('sections', id, newSec);
  return newSec;
}

export async function updateSection(id: string, updates: Partial<Section>): Promise<void> {
  await updateDocById('sections', id, updates);
}

export async function deleteSection(id: string): Promise<void> {
  await deleteDocById('sections', id);
}
