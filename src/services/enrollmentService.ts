import { EnrollmentRecord } from '../types';
import { fetchCollection, deleteDocById } from './storage';

export async function getAllEnrollments(): Promise<EnrollmentRecord[]> {
  return fetchCollection<EnrollmentRecord>('enrollments');
}

export async function getEnrollmentByStudentId(studentId: string): Promise<EnrollmentRecord | null> {
  const all = await getAllEnrollments();
  return all.find(e => e.studentId === studentId) || null;
}

export async function getEnrollmentsByProgram(programId: string): Promise<EnrollmentRecord[]> {
  const all = await getAllEnrollments();
  return all.filter(e => e.programId === programId);
}

export async function deleteEnrollment(id: string): Promise<void> {
  await deleteDocById('enrollments', id);
}
