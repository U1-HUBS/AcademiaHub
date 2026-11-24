import { Assessment, Submission } from '../types';
import { fetchCollection, fetchDocById, saveDoc, updateDocById, deleteDocById } from './storage';

// Assessments
export async function getAllAssessments(): Promise<Assessment[]> {
  return fetchCollection<Assessment>('assessments');
}

export async function getAssessmentsBySchedule(scheduleId: string): Promise<Assessment[]> {
  const all = await getAllAssessments();
  return all.filter(a => a.scheduleId === scheduleId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createAssessment(data: Omit<Assessment, 'id' | 'createdAt'>): Promise<Assessment> {
  const id = `asmt-${Date.now().toString(36)}`;
  const asmt: Assessment = {
    ...data,
    id,
    createdAt: new Date().toISOString(),
  };
  await saveDoc('assessments', id, asmt);
  return asmt;
}

export async function updateAssessment(id: string, updates: Partial<Assessment>): Promise<void> {
  await updateDocById('assessments', id, updates);
}

export async function deleteAssessment(id: string): Promise<void> {
  await deleteDocById('assessments', id);
}

// Submissions
export async function getAllSubmissions(): Promise<Submission[]> {
  return fetchCollection<Submission>('submissions');
}

export async function getSubmissionsByAssessment(assessmentId: string): Promise<Submission[]> {
  const all = await getAllSubmissions();
  return all.filter(s => s.assessmentId === assessmentId);
}

export async function getSubmissionsByStudent(studentId: string): Promise<Submission[]> {
  const all = await getAllSubmissions();
  return all.filter(s => s.studentId === studentId);
}

export async function submitAssessment(data: {
  assessmentId: string;
  scheduleId: string;
  studentId: string;
  studentName: string;
  studentIdNumber: string;
  content: string;
  linkUrl?: string;
}): Promise<Submission> {
  const all = await getAllSubmissions();
  const existing = all.find(s => s.assessmentId === data.assessmentId && s.studentId === data.studentId);

  const id = existing ? existing.id : `sub-${Date.now().toString(36)}`;
  const sub: Submission = {
    ...data,
    id,
    submittedAt: new Date().toISOString(),
    status: existing?.score !== undefined ? 'graded' : 'pending',
    score: existing?.score,
    feedback: existing?.feedback,
  };

  await saveDoc('submissions', id, sub);
  return sub;
}

export async function gradeSubmission(
  submissionId: string,
  score: number,
  feedback?: string
): Promise<void> {
  await updateDocById('submissions', submissionId, {
    score,
    feedback: feedback || '',
    status: 'graded',
  });
}
