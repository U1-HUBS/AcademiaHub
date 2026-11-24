import { StudentGrade } from '../types';
import { fetchCollection, fetchDocById, saveDoc, updateDocById } from './storage';

export async function getAllGrades(): Promise<StudentGrade[]> {
  return fetchCollection<StudentGrade>('grades');
}

export async function getGradesBySchedule(scheduleId: string): Promise<StudentGrade[]> {
  const all = await getAllGrades();
  return all.filter(g => g.scheduleId === scheduleId);
}

export async function getGradesByStudent(studentId: string): Promise<StudentGrade[]> {
  const all = await getAllGrades();
  return all.filter(g => g.studentId === studentId);
}

/**
 * Calculates weighted score and converts to letter grade / collegiate rating:
 * e.g. 1.0 (98-100), 1.25 (95-97), 1.5 (92-94), 1.75 (89-91), 2.0 (86-88),
 * 2.25 (83-85), 2.5 (80-82), 2.75 (77-79), 3.0 (75-76), 5.0 (<75 Failed)
 */
export function computeFinalRating(scores: {
  quizzes?: number;
  activities?: number;
  midterm?: number;
  final?: number;
}): { computedRating: number; letterGrade: string; remarks: 'Passed' | 'Failed' | 'In Progress' } {
  const q = scores.quizzes ?? 0;
  const a = scores.activities ?? 0;
  const m = scores.midterm ?? 0;
  const f = scores.final ?? 0;

  // Standard Formula: Quizzes 20%, Activities 30%, Midterm 25%, Final 25%
  const totalWeight = 0.2 + 0.3 + 0.25 + 0.25;
  const computed = Number(((q * 0.2 + a * 0.3 + m * 0.25 + f * 0.25) / totalWeight).toFixed(1));

  let letter = '1.0';
  let remarks: 'Passed' | 'Failed' | 'In Progress' = 'Passed';

  if (computed >= 98) letter = '1.0';
  else if (computed >= 95) letter = '1.25';
  else if (computed >= 92) letter = '1.50';
  else if (computed >= 89) letter = '1.75';
  else if (computed >= 86) letter = '2.00';
  else if (computed >= 83) letter = '2.25';
  else if (computed >= 80) letter = '2.50';
  else if (computed >= 77) letter = '2.75';
  else if (computed >= 75) letter = '3.00';
  else {
    letter = '5.00';
    remarks = 'Failed';
  }

  return { computedRating: computed, letterGrade: letter, remarks };
}

export async function saveOrUpdateGrade(data: {
  scheduleId: string;
  subjectCode: string;
  subjectTitle: string;
  units: number;
  studentId: string;
  studentName: string;
  studentIdNumber: string;
  quizzesScore?: number;
  activitiesScore?: number;
  midtermGrade?: number;
  finalGrade?: number;
  submittedBy: string;
}): Promise<StudentGrade> {
  const id = `${data.scheduleId}_${data.studentId}`;
  const calc = computeFinalRating({
    quizzes: data.quizzesScore,
    activities: data.activitiesScore,
    midterm: data.midtermGrade,
    final: data.finalGrade,
  });

  const gradeDoc: StudentGrade = {
    id,
    scheduleId: data.scheduleId,
    subjectCode: data.subjectCode,
    subjectTitle: data.subjectTitle,
    units: data.units,
    studentId: data.studentId,
    studentName: data.studentName,
    studentIdNumber: data.studentIdNumber,
    quizzesScore: data.quizzesScore,
    activitiesScore: data.activitiesScore,
    midtermGrade: data.midtermGrade,
    finalGrade: data.finalGrade,
    computedRating: calc.computedRating,
    letterGrade: calc.letterGrade,
    remarks: calc.remarks,
    submittedBy: data.submittedBy,
    updatedAt: new Date().toISOString(),
  };

  await saveDoc('grades', id, gradeDoc);
  return gradeDoc;
}

/**
 * Calculates cumulative GPA across all completed subjects
 */
export function calculateCumulativeGPA(grades: StudentGrade[]): { gpa: number; totalUnits: number } {
  if (grades.length === 0) return { gpa: 0, totalUnits: 0 };

  let totalQualityPoints = 0;
  let totalUnits = 0;

  for (const g of grades) {
    if (g.letterGrade && g.units) {
      const numRating = parseFloat(g.letterGrade);
      if (!isNaN(numRating)) {
        totalQualityPoints += numRating * g.units;
        totalUnits += g.units;
      }
    }
  }

  const gpa = totalUnits > 0 ? Number((totalQualityPoints / totalUnits).toFixed(2)) : 0;
  return { gpa, totalUnits };
}
