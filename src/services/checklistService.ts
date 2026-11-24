import { ChecklistSubjectItem, SubjectCompletionStatus } from '../types';
import { getGradesByStudent } from './gradeService';
import { getSchedulesByStudent } from './scheduleService';

// Comprehensive Curriculum Database for BSCS and BSIT programs across 4 Year Levels
export const MASTER_CURRICULUM: Record<string, Omit<ChecklistSubjectItem, 'status' | 'grade' | 'rating'>[]> = {
  BSCS: [
    // Year 1 - 1st Sem
    { id: 'cs-101', code: 'CS101', title: 'Introduction to Programming & Problem Solving', units: 3, yearLevel: 1, semester: '1st Semester' },
    { id: 'math-101', code: 'MATH101', title: 'Discrete Mathematics', units: 3, yearLevel: 1, semester: '1st Semester' },
    { id: 'eng-101', code: 'ENG101', title: 'Purposive Communication', units: 3, yearLevel: 1, semester: '1st Semester' },
    { id: 'pe-101', code: 'PE101', title: 'Physical Fitness & Wellness', units: 2, yearLevel: 1, semester: '1st Semester' },
    // Year 1 - 2nd Sem
    { id: 'cs-102', code: 'CS102', title: 'Data Structures and Algorithms', units: 3, yearLevel: 1, semester: '2nd Semester', prerequisites: ['CS101'] },
    { id: 'cs-103', code: 'CS103', title: 'Object-Oriented Programming', units: 3, yearLevel: 1, semester: '2nd Semester', prerequisites: ['CS101'] },
    { id: 'math-102', code: 'MATH102', title: 'Calculus for Computing', units: 3, yearLevel: 1, semester: '2nd Semester', prerequisites: ['MATH101'] },
    { id: 'pe-102', code: 'PE102', title: 'Rhythmic Activities', units: 2, yearLevel: 1, semester: '2nd Semester' },
    // Year 2 - 1st Sem
    { id: 'cs-201', code: 'CS201', title: 'Design and Analysis of Algorithms', units: 3, yearLevel: 2, semester: '1st Semester', prerequisites: ['CS102'] },
    { id: 'cs-202', code: 'CS202', title: 'Computer Architecture & Organization', units: 3, yearLevel: 2, semester: '1st Semester', prerequisites: ['CS101'] },
    { id: 'cs-203', code: 'CS203', title: 'Theory of Computation & Automata', units: 3, yearLevel: 2, semester: '1st Semester', prerequisites: ['MATH101'] },
    { id: 'stat-201', code: 'STAT201', title: 'Probability & Statistics for Computing', units: 3, yearLevel: 2, semester: '1st Semester', prerequisites: ['MATH102'] },
    // Year 2 - 2nd Sem
    { id: 'cs-204', code: 'CS204', title: 'Operating Systems Principles', units: 3, yearLevel: 2, semester: '2nd Semester', prerequisites: ['CS202'] },
    { id: 'cs-205', code: 'CS205', title: 'Software Engineering 1', units: 3, yearLevel: 2, semester: '2nd Semester', prerequisites: ['CS103'] },
    { id: 'cs-206', code: 'CS206', title: 'Database Systems & Architecture', units: 3, yearLevel: 2, semester: '2nd Semester', prerequisites: ['CS102'] },
    // Year 3 - 1st Sem
    { id: 'cs-301', code: 'CS301', title: 'Artificial Intelligence & Machine Learning', units: 3, yearLevel: 3, semester: '1st Semester', prerequisites: ['CS201', 'STAT201'] },
    { id: 'cs-302', code: 'CS302', title: 'Computer Networks & Security', units: 3, yearLevel: 3, semester: '1st Semester', prerequisites: ['CS204'] },
    { id: 'cs-303', code: 'CS303', title: 'Software Engineering 2 (Full-stack)', units: 3, yearLevel: 3, semester: '1st Semester', prerequisites: ['CS205'] },
    // Year 3 - 2nd Sem
    { id: 'cs-304', code: 'CS304', title: 'Compiler Design & Theory', units: 3, yearLevel: 3, semester: '2nd Semester', prerequisites: ['CS203'] },
    { id: 'cs-305', code: 'CS305', title: 'Distributed Systems & Cloud Computing', units: 3, yearLevel: 3, semester: '2nd Semester', prerequisites: ['CS302'] },
    { id: 'cs-306', code: 'CS306', title: 'Capstone Project 1 (Thesis Proposal)', units: 3, yearLevel: 3, semester: '2nd Semester', prerequisites: ['CS303'] },
    // Year 4 - 1st Sem
    { id: 'cs-401', code: 'CS401', title: 'Capstone Project 2 (Implementation & Defense)', units: 3, yearLevel: 4, semester: '1st Semester', prerequisites: ['CS306'] },
    { id: 'cs-402', code: 'CS402', title: 'Information Assurance & Cybersecurity', units: 3, yearLevel: 4, semester: '1st Semester', prerequisites: ['CS302'] },
    // Year 4 - 2nd Sem
    { id: 'cs-403', code: 'CS403', title: 'Practicum / Industry Internship (500 Hours)', units: 6, yearLevel: 4, semester: '2nd Semester' },
  ],
  BSIT: [
    // Year 1 - 1st Sem
    { id: 'it-101', code: 'IT101', title: 'Web Systems and Technologies', units: 3, yearLevel: 1, semester: '1st Semester' },
    { id: 'it-102', code: 'IT102', title: 'Introduction to Computing Infrastructure', units: 3, yearLevel: 1, semester: '1st Semester' },
    { id: 'math-it101', code: 'MATH101', title: 'Discrete Mathematics', units: 3, yearLevel: 1, semester: '1st Semester' },
    { id: 'pe-101', code: 'PE101', title: 'Physical Fitness & Wellness', units: 2, yearLevel: 1, semester: '1st Semester' },
    // Year 1 - 2nd Sem
    { id: 'it-103', code: 'IT103', title: 'Database Management Systems 1', units: 3, yearLevel: 1, semester: '2nd Semester', prerequisites: ['IT101'] },
    { id: 'it-104', code: 'IT104', title: 'Networking 1 (Fundamentals & Routing)', units: 3, yearLevel: 1, semester: '2nd Semester', prerequisites: ['IT102'] },
    { id: 'it-105', code: 'IT105', title: 'Computer Programming in Java', units: 3, yearLevel: 1, semester: '2nd Semester' },
    // Year 2 - 1st Sem
    { id: 'it-201', code: 'IT201', title: 'Advanced Web Applications (React & Node)', units: 3, yearLevel: 2, semester: '1st Semester', prerequisites: ['IT101'] },
    { id: 'it-202', code: 'IT202', title: 'Networking 2 (Switching & Wireless)', units: 3, yearLevel: 2, semester: '1st Semester', prerequisites: ['IT104'] },
    { id: 'it-203', code: 'IT203', title: 'Data Management & SQL Optimization', units: 3, yearLevel: 2, semester: '1st Semester', prerequisites: ['IT103'] },
    // Year 2 - 2nd Sem
    { id: 'it-204', code: 'IT204', title: 'Systems Administration & Maintenance', units: 3, yearLevel: 2, semester: '2nd Semester', prerequisites: ['IT202'] },
    { id: 'it-205', code: 'IT205', title: 'Mobile Applications Development', units: 3, yearLevel: 2, semester: '2nd Semester', prerequisites: ['IT201'] },
    // Year 3 - 1st Sem
    { id: 'it-301', code: 'IT301', title: 'Cloud Infrastructure & DevOps', units: 3, yearLevel: 3, semester: '1st Semester', prerequisites: ['IT204'] },
    { id: 'it-302', code: 'IT302', title: 'Information Security & Risk Management', units: 3, yearLevel: 3, semester: '1st Semester', prerequisites: ['IT202'] },
    // Year 3 - 2nd Sem
    { id: 'it-303', code: 'IT303', title: 'IT Capstone Project 1', units: 3, yearLevel: 3, semester: '2nd Semester', prerequisites: ['IT301'] },
    // Year 4
    { id: 'it-401', code: 'IT401', title: 'IT Capstone Project 2', units: 3, yearLevel: 4, semester: '1st Semester', prerequisites: ['IT303'] },
    { id: 'it-402', code: 'IT402', title: 'IT Industry Internship (500 Hours)', units: 6, yearLevel: 4, semester: '2nd Semester' },
  ],
};

export interface CurriculumProgressSummary {
  subjects: ChecklistSubjectItem[];
  totalCurriculumUnits: number;
  completedUnits: number;
  inProgressUnits: number;
  remainingUnits: number;
  progressPercentage: number;
}

/**
 * Computes curriculum checklist progress for a given student
 */
export async function getStudentCurriculumProgress(
  studentId: string,
  programCode: string = 'BSCS'
): Promise<CurriculumProgressSummary> {
  const normProg = programCode.toUpperCase().includes('IT') ? 'BSIT' : 'BSCS';
  const masterSubjects = MASTER_CURRICULUM[normProg] || MASTER_CURRICULUM.BSCS;

  const [studentGrades, activeSchedules] = await Promise.all([
    getGradesByStudent(studentId),
    getSchedulesByStudent(studentId),
  ]);

  const enrolledCodes = activeSchedules.map(s => s.subjectCode.toUpperCase());

  let completedUnits = 0;
  let inProgressUnits = 0;
  let totalUnits = 0;

  const mappedSubjects: ChecklistSubjectItem[] = masterSubjects.map(sub => {
    totalUnits += sub.units;

    // Check if grade exists
    const grade = studentGrades.find(
      g => g.subjectCode.toUpperCase() === sub.code.toUpperCase()
    );

    let status: SubjectCompletionStatus = 'not_taken';
    let gradeLabel: string | undefined = undefined;
    let rating: number | undefined = undefined;

    if (grade) {
      gradeLabel = grade.letterGrade;
      rating = grade.computedRating;
      if (grade.remarks === 'Passed') {
        status = 'completed';
        completedUnits += sub.units;
      } else if (grade.remarks === 'Failed') {
        status = 'failed';
      } else {
        status = 'in_progress';
        inProgressUnits += sub.units;
      }
    } else if (enrolledCodes.includes(sub.code.toUpperCase())) {
      status = 'in_progress';
      inProgressUnits += sub.units;
    }

    return {
      ...sub,
      status,
      grade: gradeLabel,
      rating,
    };
  });

  const remainingUnits = Math.max(0, totalUnits - completedUnits);
  const progressPercentage =
    totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

  return {
    subjects: mappedSubjects,
    totalCurriculumUnits: totalUnits,
    completedUnits,
    inProgressUnits,
    remainingUnits,
    progressPercentage,
  };
}
