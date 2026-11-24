export type UserRole = 'registrar' | 'program_chair' | 'teacher' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  fullName: string;
  idNumber: string; // e.g. REG-2026-001, CHR-2026-010, TCH-2026-042, STU-2026-1001
  programId?: string; // For program_chair and student
  programCode?: string;
  yearLevel?: number; // 1, 2, 3, 4 (for students)
  sectionId?: string;
  sectionName?: string;
  phone?: string;
  status: 'active' | 'deactivated';
  mustChangePassword?: boolean;
  studentIdLogin?: boolean;
  studentAuthEmail?: string;
  credentialsValidAfter?: number;
  authProvisioned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Program {
  id: string;
  code: string; // e.g. BSCS, BSIT, BSEE
  name: string; // Bachelor of Science in Computer Science
  chairId?: string; // Assigned Program Chair UID
  chairName?: string;
  description: string;
  department: string;
  active: boolean;
  createdAt: string;
}

export interface Section {
  id: string;
  name: string; // e.g. BSCS 1-A
  programId: string;
  programCode: string;
  yearLevel: number; // 1-4
  academicYear: string; // e.g. 2026-2027
  adviserId?: string;
  adviserName?: string;
  maxCapacity: number;
}

export interface Subject {
  id: string;
  code: string; // e.g. CS101
  title: string; // Data Structures and Algorithms
  units: number; // e.g. 3
  lectureHours: number;
  labHours: number;
  programId: string;
  programCode: string;
  yearLevel?: number; // 1, 2, 3, 4
  semester?: '1st Semester' | '2nd Semester' | 'Summer';
  prerequisites?: string[];
  description?: string;
}

export interface Schedule {
  id: string;
  subjectId: string;
  subjectCode: string;
  subjectTitle: string;
  units: number;
  teacherId: string;
  teacherName: string;
  programId: string;
  programCode: string;
  sectionId: string;
  sectionName: string;
  room: string;
  days: string[]; // e.g. ['Monday', 'Wednesday', 'Friday']
  startTime: string; // HH:mm format e.g. '08:00'
  endTime: string; // HH:mm format e.g. '09:30'
  maxCapacity: number;
  enrolledStudentIds: string[];
  academicYear: string;
  semester: string; // '1st Semester', '2nd Semester', 'Summer'
  createdAt: string;
}

export interface EnrollmentRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentIdNumber: string;
  studentEmail: string;
  programId: string;
  programCode: string;
  yearLevel: number;
  sectionId: string;
  sectionName: string;
  status: 'enrolled' | 'regular' | 'irregular' | 'dropped' | 'graduated';
  academicYear: string;
  semester: string;
  enrolledAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceStudentEntry {
  studentId: string;
  studentName: string;
  studentIdNumber: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface AttendanceSession {
  id: string;
  scheduleId: string;
  subjectCode: string;
  sectionName: string;
  date: string; // YYYY-MM-DD
  topic?: string;
  takenBy: string; // Teacher UID
  takenByName: string;
  records: { [studentId: string]: AttendanceStudentEntry };
  createdAt: string;
}

export type AssessmentType = 'quiz' | 'assignment' | 'exam' | 'project';

export interface Assessment {
  id: string;
  scheduleId: string;
  subjectCode: string;
  sectionName: string;
  title: string;
  type: AssessmentType;
  maxScore: number;
  weight: number; // percentage weighting, e.g. 20 for 20%
  dueDate: string; // YYYY-MM-DDTHH:mm
  description: string;
  createdBy: string; // Teacher UID
  createdByName: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  assessmentId: string;
  scheduleId: string;
  studentId: string;
  studentName: string;
  studentIdNumber: string;
  submittedAt: string;
  content: string;
  linkUrl?: string;
  score?: number;
  feedback?: string;
  status: 'pending' | 'graded';
}

export interface StudentGrade {
  id: string; // `${scheduleId}_${studentId}`
  scheduleId: string;
  subjectCode: string;
  subjectTitle: string;
  units: number;
  studentId: string;
  studentName: string;
  studentIdNumber: string;
  quizzesScore?: number; // 0-100
  activitiesScore?: number; // 0-100
  midtermGrade?: number; // 0-100
  finalGrade?: number; // 0-100
  computedRating?: number; // Weighted final score 0-100
  letterGrade?: string; // 1.0, 1.25, 1.5, ... or A, B, C, D, F
  remarks: 'Passed' | 'Failed' | 'Incomplete' | 'In Progress';
  submittedBy: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  scheduleId?: string; // Empty if campus-wide
  subjectCode?: string;
  programId?: string; // Empty if campus-wide
  programCode?: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  targetRole?: 'all' | 'students' | 'teachers';
  priority: 'normal' | 'important' | 'urgent';
  createdAt: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  type?: 'room' | 'teacher' | 'section';
  message?: string;
  conflictingSchedule?: Schedule;
}

// -------------------------------------------------------------
// New Feature 1: Student Ledger Models
// -------------------------------------------------------------
export interface LedgerTransaction {
  id: string;
  date: string;
  referenceNo: string;
  type: 'assessment' | 'payment';
  category: 'tuition' | 'miscellaneous' | 'laboratory' | 'registration' | 'payment_cash' | 'payment_online' | 'discount';
  description: string;
  amount: number;
  academicYear: string;
  semester: string;
}

export interface StudentLedger {
  id: string; // studentId
  studentId: string;
  studentName: string;
  studentIdNumber: string;
  programCode: string;
  academicYear: string;
  semester: string;
  tuitionFee: number;
  miscellaneousFee: number;
  otherCharges: number;
  totalAssessment: number;
  totalPaid: number;
  remainingBalance: number;
  status: 'paid' | 'partial' | 'unpaid';
  transactions: LedgerTransaction[];
  updatedAt: string;
}

// -------------------------------------------------------------
// New Feature 2: Subject Checklist Models
// -------------------------------------------------------------
export type SubjectCompletionStatus = 'completed' | 'in_progress' | 'not_taken' | 'failed';

export interface ChecklistSubjectItem {
  id: string;
  code: string;
  title: string;
  units: number;
  yearLevel: number;
  semester: '1st Semester' | '2nd Semester' | 'Summer';
  prerequisites?: string[];
  status: SubjectCompletionStatus;
  grade?: string;
  rating?: number;
}
