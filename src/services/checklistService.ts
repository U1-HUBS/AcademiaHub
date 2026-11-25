import { ChecklistSubjectItem, SubjectCompletionStatus } from '../types';
import { getGradesByStudent } from './gradeService';
import { getSchedulesByStudent } from './scheduleService';
import { getAllCurriculums } from './curriculumService';
import { getAllSubjects } from './subjectService';

export interface CurriculumProgressSummary {
  subjects: ChecklistSubjectItem[];
  totalCurriculumUnits: number;
  completedUnits: number;
  inProgressUnits: number;
  remainingUnits: number;
  progressPercentage: number;
}

/** Builds the checklist only from Registrar-maintained curriculum records. */
export async function getStudentCurriculumProgress(studentId: string, programCode?: string, studentType?: 'regular' | 'evening'): Promise<CurriculumProgressSummary> {
  const [curriculums, allSubjects, studentGrades, activeSchedules] = await Promise.all([
    getAllCurriculums(), getAllSubjects(), getGradesByStudent(studentId), getSchedulesByStudent(studentId),
  ]);
  const normalizedCode = programCode?.trim().toUpperCase();
  const curriculum = curriculums.find(item =>
    (!normalizedCode || item.programCode.toUpperCase() === normalizedCode) &&
    (!studentType || item.studentType === studentType)
  ) || curriculums.find(item => !normalizedCode || item.programCode.toUpperCase() === normalizedCode);
  const curriculumSubjects = curriculum ? allSubjects.filter(subject => curriculum.subjectIds.includes(subject.id)) : [];
  const enrolledCodes = activeSchedules.map(schedule => schedule.subjectCode.toUpperCase());
  let completedUnits = 0;
  let inProgressUnits = 0;
  const subjects: ChecklistSubjectItem[] = curriculumSubjects.map(subject => {
    const grade = studentGrades.find(item => item.subjectCode.toUpperCase() === subject.code.toUpperCase());
    let status: SubjectCompletionStatus = 'not_taken';
    if (grade?.remarks === 'Passed') { status = 'completed'; completedUnits += subject.units; }
    else if (grade?.remarks === 'Failed') status = 'failed';
    else if (grade || enrolledCodes.includes(subject.code.toUpperCase())) { status = 'in_progress'; inProgressUnits += subject.units; }
    return { id: subject.id, code: subject.code, title: subject.title, units: subject.units, yearLevel: subject.yearLevel || 1, semester: subject.semester || '1st Semester', prerequisites: subject.prerequisites, status, grade: grade?.letterGrade, rating: grade?.computedRating };
  });
  const totalCurriculumUnits = subjects.reduce((sum, subject) => sum + subject.units, 0);
  const remainingUnits = Math.max(0, totalCurriculumUnits - completedUnits);
  return { subjects, totalCurriculumUnits, completedUnits, inProgressUnits, remainingUnits, progressPercentage: totalCurriculumUnits ? Math.round((completedUnits / totalCurriculumUnits) * 100) : 0 };
}
