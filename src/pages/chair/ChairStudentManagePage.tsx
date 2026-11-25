import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { getAllUsers } from '../../services/userService';
import { getAllPrograms } from '../../services/programService';
import { getAllEnrollments } from '../../services/enrollmentService';
import { getAllSchedules, addStudentToSchedule } from '../../services/scheduleService';
import { getAllSubjects } from '../../services/subjectService';
import { getAllCurriculums } from '../../services/curriculumService';
import { getAllGrades } from '../../services/gradeService';
import { UserProfile, Program, EnrollmentRecord, Schedule, Subject, Curriculum, StudentGrade } from '../../types';
import { UserCheck, Search, Filter, ShieldCheck, Mail, Phone, BookOpen, Eye, CheckCircle2, XCircle } from 'lucide-react';

export const ChairStudentManagePage: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [program, setProgram] = useState<Program | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [savingSubject, setSavingSubject] = useState(false);
  const [detailsStudent, setDetailsStudent] = useState<UserProfile | null>(null);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectYearFilter, setSubjectYearFilter] = useState('all');
  const [subjectSemesterFilter, setSubjectSemesterFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allUsers, allPrograms, allEnrollments, allSchedules, allSubjects, allCurriculums, allGrades] = await Promise.all([
        getAllUsers(),
        getAllPrograms(),
        getAllEnrollments(),
        getAllSchedules(),
        getAllSubjects(),
        getAllCurriculums(),
        getAllGrades(),
      ]);

      const myProg = allPrograms.find(p =>
        p.id === user?.programId ||
        p.chairId === user?.uid ||
        p.code.toUpperCase() === (user?.programCode || '').toUpperCase()
      ) || null;
      setProgram(myProg);

      if (myProg) {
        const progStudents = allUsers.filter(
          u => u.role === 'student' && (u.programId === myProg.id || u.programCode === myProg.code)
        );
        const progEnrollments = allEnrollments.filter(e => e.programId === myProg.id || e.programCode === myProg.code);

        setStudents(progStudents);
        setEnrollments(progEnrollments);
        const programSchedules = allSchedules.filter(schedule =>
          schedule.programId === myProg.id ||
          schedule.programCode.toUpperCase() === myProg.code.toUpperCase()
        );
        setSchedules(programSchedules);
        setSubjects(allSubjects.filter(subject => subject.programId === myProg.id || subject.programCode.toUpperCase() === myProg.code.toUpperCase()));
        setCurriculums(allCurriculums.filter(curriculum => curriculum.programId === myProg.id || curriculum.programCode.toUpperCase() === myProg.code.toUpperCase()));
        setGrades(allGrades);
      }
    } finally {
      setLoading(false);
    }
  };

  const openAddSubject = (student: UserProfile) => {
    setSelectedStudent(student);
    setSelectedScheduleId('');
  };

  const handleAddSubject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStudent || !selectedScheduleId) return;
    setSavingSubject(true);
    try {
      await addStudentToSchedule(selectedScheduleId, selectedStudent.uid);
      const schedule = schedules.find(item => item.id === selectedScheduleId);
      setSchedules(items => items.map(item => item.id === selectedScheduleId ? {...item, enrolledStudentIds: [...item.enrolledStudentIds, selectedStudent.uid]} : item));
      setSelectedStudent(null);
      alert(`${schedule?.subjectCode || 'Subject'} added to ${selectedStudent.fullName}.`);
    } catch (cause) {
      alert(cause instanceof Error ? cause.message : 'Could not add the subject.');
    } finally { setSavingSubject(false); }
  };

  const selectedStudentSubjectIds = selectedStudent
    ? new Set(schedules.filter(schedule => schedule.enrolledStudentIds.includes(selectedStudent.uid)).map(schedule => schedule.subjectId))
    : new Set<string>();
  const selectedStudentGradeCodes = selectedStudent
    ? new Set(grades.filter(grade => grade.studentId === selectedStudent.uid).map(grade => grade.subjectCode.toUpperCase()))
    : new Set<string>();
  const selectedCurriculumSubjectIds = selectedStudent
    ? new Set(curriculums.filter(curriculum => !selectedStudent.studentType || curriculum.studentType === selectedStudent.studentType).flatMap(curriculum => curriculum.subjectIds))
    : new Set<string>();
  const availableSchedules = schedules.filter(schedule =>
    !selectedStudentSubjectIds.has(schedule.subjectId) &&
    !selectedStudentGradeCodes.has(schedule.subjectCode.toUpperCase()) &&
    // The Registrar-approved schedule is the authoritative offering. Keep it
    // available even when the legacy curriculum link is incomplete.
    Boolean(schedule.subjectId || schedule.subjectCode)
  );
  // A subject with an approved class schedule is assignable even when an older
  // curriculum record has not been linked to it yet. This keeps the schedule
  // collection—the Chair's official class source—from hiding valid offerings.
  // Build the assignment choices from the actual schedule records. A schedule
  // is the authoritative class offering and must remain assignable even when
  // the subject catalog/curriculum link is stale or missing.
  const availableCurriculumSubjects = availableSchedules.map(schedule => ({
    id: schedule.subjectId,
    code: schedule.subjectCode,
    title: schedule.subjectTitle,
  } as Subject));

  const assignmentSchedules = availableSchedules.filter(schedule => {
    const subject = subjects.find(item => item.id === schedule.subjectId || item.code.toUpperCase() === schedule.subjectCode.toUpperCase());
    const text = `${schedule.subjectCode} ${schedule.subjectTitle}`.toLowerCase();
    return (!subjectSearch || text.includes(subjectSearch.toLowerCase())) &&
      (subjectYearFilter === 'all' || String(subject?.yearLevel || '') === subjectYearFilter) &&
      (subjectSemesterFilter === 'all' || schedule.semester === subjectSemesterFilter);
  });

  const studentEnrollment = detailsStudent ? enrollments.find(item => item.studentId === detailsStudent.uid) : null;
  const studentSchedules = detailsStudent ? schedules.filter(schedule => schedule.enrolledStudentIds.includes(detailsStudent.uid)) : [];
  const studentGrades = detailsStudent ? grades.filter(grade => grade.studentId === detailsStudent.uid) : [];
  const completedGrades = studentGrades.filter(grade => (grade.remarks || '').toLowerCase().includes('pass') || Number(grade.computedRating || 0) >= 75);
  const failedGrades = studentGrades.filter(grade => (grade.remarks || '').toLowerCase().includes('fail') || Number(grade.computedRating || 0) < 75);
  const completedCodes = new Set(completedGrades.map(grade => grade.subjectCode.toUpperCase()));
  const scheduledCodes = new Set(studentSchedules.map(schedule => schedule.subjectCode.toUpperCase()));
  const remainingUnits = subjects.filter(subject => !completedCodes.has(subject.code.toUpperCase()) && !scheduledCodes.has(subject.code.toUpperCase())).reduce((sum, subject) => sum + subject.units, 0);

  const filtered = students.filter(s => {
    const matchesYear = yearFilter === 'all' || s.yearLevel === Number(yearFilter);
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      s.fullName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.idNumber.toLowerCase().includes(q);

    return matchesYear && matchesSearch;
  });

  const columns = [
    {
      key: 'name',
      header: 'Student Name & Email',
      render: (s: UserProfile) => (
        <div>
          <div className="font-bold text-slate-900">{s.fullName}</div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
            <Mail className="w-3 h-3" />
            <span>{s.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'idNumber',
      header: 'ID Number',
      render: (s: UserProfile) => (
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
          {s.idNumber}
        </span>
      ),
    },
    {
      key: 'yearLevel',
      header: 'Year Level',
      render: (s: UserProfile) => <Badge variant="navy">Year {s.yearLevel || 1}</Badge>,
    },
    {
      key: 'enrollmentStatus',
      header: 'Official Standing',
      render: (s: UserProfile) => {
        const enr = enrollments.find(e => e.studentId === s.uid);
        if (!enr) {
          return <Badge variant="neutral">Not Enrolled</Badge>;
        }
        return (
          <Badge variant={enr.status === 'irregular' ? 'warning' : 'success'}>
            {enr.status.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      header: 'Account Status',
      render: (s: UserProfile) => (
        <Badge variant={s.status === 'active' ? 'success' : 'danger'}>
          {s.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (s: UserProfile) => <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" icon={<Eye className="size-4" />} onClick={() => setDetailsStudent(s)}>Academic details</Button><Button type="button" size="sm" icon={<BookOpen className="size-4" />} onClick={() => openAddSubject(s)}>Add Subject</Button></div>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <PageHeader
        title="Student Management"
        subtitle={`Official student roster and academic standing for ${program?.name || 'Department'}`}
        actions={
          <div className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-xs">
            Total Department Students: <span className="text-[#142D59] font-black">{students.length}</span>
          </div>
        }
      />

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
        <Select
          label="Filter by Year Level"
          value={yearFilter}
          onChange={e => setYearFilter(e.target.value)}
        >
          <option value="all">All Year Levels</option>
          <option value="1">1st Year</option>
          <option value="2">2nd Year</option>
          <option value="3">3rd Year</option>
          <option value="4">4th Year</option>
          <option value="5">5th Year</option>
        </Select>
      </div>

      {/* Table */}
      <Table
        label="Program students"
        data={filtered}
        columns={columns}
        keyExtractor={s => s.uid}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search student by name, email, or student ID..."
      />

      <Modal isOpen={Boolean(selectedStudent)} onClose={() => { if (!savingSubject) setSelectedStudent(null); }} title={`Add subject for ${selectedStudent?.fullName || 'student'}`} subtitle="Assign an approved class schedule to this student">
        <form onSubmit={handleAddSubject} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3"><Input label="Search subject" value={subjectSearch} onChange={event => setSubjectSearch(event.target.value)} placeholder="Code or title" /><Select label="Year level" value={subjectYearFilter} onChange={event => setSubjectYearFilter(event.target.value)}><option value="all">All years</option><option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option><option value="5">Year 5</option></Select><Select label="Semester" value={subjectSemesterFilter} onChange={event => setSubjectSemesterFilter(event.target.value)}><option value="all">All semesters</option><option>1st Semester</option><option>2nd Semester</option><option>Summer</option></Select></div>
          <Select label="Subject / Class Schedule" value={selectedScheduleId} onChange={event => setSelectedScheduleId(event.target.value)} required>
            <option value="">Select a subject</option>
            {assignmentSchedules.map(scheduleRecord => {
              const subject = {...scheduleRecord, title: scheduleRecord.subjectTitle, code: scheduleRecord.subjectCode};
              const subjectSchedules = [scheduleRecord];
              return subjectSchedules.length > 0
                ? subjectSchedules.map(schedule => <option key={schedule.id} value={schedule.id}>{subject.title} ({subject.code}) · {schedule.days.join(', ')} {schedule.startTime}</option>)
                : <option key={`unavailable-${subject.id}`} value="" disabled>{subject.title} ({subject.code}) · No class schedule yet</option>;
            })}
          </Select>
          {selectedStudent && availableCurriculumSubjects.length === 0 && <p className="rounded-lg border border-slate-200 bg-blue-50 px-3 py-2 text-sm text-navy">No remaining curriculum subjects are available. The student may already be enrolled or have a recorded grade for the remaining subjects.</p>}
          {selectedStudent && availableCurriculumSubjects.length > 0 && availableSchedules.length === 0 && <p className="rounded-lg border border-slate-200 bg-blue-50 px-3 py-2 text-sm text-navy">The remaining subjects are in the curriculum, but class schedules have not been created yet.</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button type="button" variant="outline" disabled={savingSubject} onClick={() => setSelectedStudent(null)}>Cancel</Button><Button type="submit" isLoading={savingSubject} icon={<BookOpen className="size-4" />}>Add Subject</Button></div>
        </form>
      </Modal>

      <Modal maxWidth="4xl" isOpen={Boolean(detailsStudent)} onClose={() => setDetailsStudent(null)} title={detailsStudent?.fullName || 'Academic details'} subtitle="Academic record from Registrar data">
        {detailsStudent && <div className="space-y-5">
          <div className="grid gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm sm:grid-cols-4"><div><p className="text-xs uppercase text-blue-700">Student ID</p><p className="font-semibold text-navy">{detailsStudent.idNumber}</p></div><div><p className="text-xs uppercase text-blue-700">Program</p><p className="font-semibold text-navy">{detailsStudent.programCode || program?.code}</p></div><div><p className="text-xs uppercase text-blue-700">Year / section</p><p className="font-semibold text-navy">Year {detailsStudent.yearLevel || 1} · {detailsStudent.sectionName || studentEnrollment?.sectionName || 'Not assigned'}</p></div><div><p className="text-xs uppercase text-blue-700">Enrollment</p><p className="font-semibold text-navy">{studentEnrollment?.academicYear || '—'} · {studentEnrollment?.semester || '—'}</p></div></div>
          <div className="grid gap-3 sm:grid-cols-4"><div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Current subjects</p><p className="text-xl font-bold text-navy">{studentSchedules.length}</p></div><div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Completed</p><p className="text-xl font-bold text-navy">{completedGrades.length}</p></div><div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Failed</p><p className="text-xl font-bold text-navy">{failedGrades.length}</p></div><div className="rounded-lg border border-slate-200 p-3"><p className="text-xs text-slate-500">Remaining units</p><p className="text-xl font-bold text-navy">{remainingUnits}</p></div></div>
          <div className="grid gap-5 md:grid-cols-2"><div><h3 className="mb-2 font-semibold text-navy">Current subjects</h3><div className="space-y-2">{studentSchedules.map(item => <div key={item.id} className="rounded-lg border border-slate-200 p-3"><p className="font-semibold text-navy">{item.subjectCode} · {item.subjectTitle}</p><p className="text-xs text-slate-600">{item.units} units · {item.sectionName} · {item.teacherName}</p></div>)}{!studentSchedules.length && <p className="text-sm text-slate-600">No current subjects.</p>}</div></div><div><h3 className="mb-2 font-semibold text-navy">Verified grades</h3><div className="space-y-2">{studentGrades.map(item => <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3"><span><strong>{item.subjectCode}</strong><span className="ml-2 text-xs text-slate-600">{item.subjectTitle}</span></span>{failedGrades.includes(item) ? <XCircle className="size-4 text-blue-700" /> : <CheckCircle2 className="size-4 text-blue-700" />}</div>)}{!studentGrades.length && <p className="text-sm text-slate-600">No verified grades.</p>}</div></div></div>
        </div>}
      </Modal>
    </div>
  );
};
