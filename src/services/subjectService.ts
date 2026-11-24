import { Subject } from '../types';
import { fetchCollection, fetchDocById, saveDoc, updateDocById, deleteDocById } from './storage';

export async function getAllSubjects(): Promise<Subject[]> {
  return fetchCollection<Subject>('subjects');
}

export async function getSubjectsByProgram(programId: string): Promise<Subject[]> {
  const all = await getAllSubjects();
  return all.filter(s => s.programId === programId);
}

export async function createSubject(data: Omit<Subject, 'id'>): Promise<Subject> {
  const id = `subj-${Date.now().toString(36)}`;
  const newSubj: Subject = {
    ...data,
    id,
  };
  await saveDoc('subjects', id, newSubj);
  return newSubj;
}

export async function updateSubject(id: string, updates: Partial<Subject>): Promise<void> {
  await updateDocById('subjects', id, updates);
}

export async function deleteSubject(id: string): Promise<void> {
  await deleteDocById('subjects', id);
}
