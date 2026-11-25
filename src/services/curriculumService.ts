import { Curriculum } from '../types';
import { fetchCollection, saveDoc, updateDocById } from './storage';

export const getAllCurriculums = () => fetchCollection<Curriculum>('curriculums');

export async function createCurriculum(data: Omit<Curriculum, 'id'>): Promise<Curriculum> {
  const curriculum: Curriculum = { ...data, id: `curr-${Date.now().toString(36)}` };
  await saveDoc('curriculums', curriculum.id, curriculum);
  return curriculum;
}

export async function updateCurriculum(id: string, updates: Partial<Curriculum>) {
  await updateDocById('curriculums', id, { ...updates, updatedAt: new Date().toISOString() });
}
