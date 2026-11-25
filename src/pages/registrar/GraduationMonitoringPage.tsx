import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../context/ToastContext';
import { getAllUsers } from '../../services/userService';
import { getAllEnrollments } from '../../services/enrollmentService';
import { getAllGrades } from '../../services/gradeService';
import { getCredentialRequirements } from '../../services/registrarWorkflowService';
import { getAllCurriculums } from '../../services/curriculumService';
import { getAllSubjects } from '../../services/subjectService';
import type { CredentialRequirement, EnrollmentRecord, StudentGrade, UserProfile, Curriculum, Subject } from '../../types';

type Candidate = {student: UserProfile; enrollment?: EnrollmentRecord; completed: number; total: number; remaining: number; missingCredentials: number; eligible: boolean};

export function GraduationMonitoringPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [credentials, setCredentials] = useState<CredentialRequirement[]>([]);
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [program, setProgram] = useState('all');
  const [year, setYear] = useState('4');
  const [loading, setLoading] = useState(true);
  const { error } = useToast();
  const load = async () => { setLoading(true); try { const [u, e, g, c, curricula, subjectList] = await Promise.all([getAllUsers(), getAllEnrollments(), getAllGrades(), getCredentialRequirements(), getAllCurriculums(), getAllSubjects()]); setUsers(u); setEnrollments(e); setGrades(g); setCredentials(c); setCurriculums(curricula); setSubjects(subjectList); } catch { error('Could not load graduation records.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const candidates = useMemo<Candidate[]>(() => users.filter(user => user.role === 'student').map(student => {
    const enrollment = enrollments.find(item => item.studentId === student.uid);
    const code = (student.programCode || enrollment?.programCode || '').toUpperCase();
    const curriculum = curriculums.find(item => item.programCode.toUpperCase() === code && (!student.studentType || item.studentType === student.studentType));
    const curriculumSubjects = curriculum ? subjects.filter(item => curriculum.subjectIds.includes(item.id)) : [];
    const passed = grades.filter(item => item.studentId === student.uid && item.remarks === 'Passed' && (item.verificationStatus === undefined || item.verificationStatus === 'verified'));
    const passedCodes = new Set(passed.map(item => item.subjectCode.toUpperCase()));
    const completed = curriculumSubjects.filter(item => passedCodes.has(item.code.toUpperCase())).reduce((sum, item) => sum + item.units, 0);
    const total = curriculumSubjects.reduce((sum, item) => sum + item.units, 0);
    const missingCredentials = credentials.filter(item => item.studentId === student.uid && item.status !== 'verified').length;
    return {student, enrollment, completed, total, remaining: Math.max(0, total - completed), missingCredentials, eligible: completed >= total && missingCredentials === 0};
  }), [users, enrollments, grades, credentials, curriculums, subjects]);
  const filtered = candidates.filter(item => (program === 'all' || (item.student.programCode || item.enrollment?.programCode) === program) && (year === 'all' || String(item.student.yearLevel || item.enrollment?.yearLevel || '') === year));
  const programs = [...new Set(candidates.map(item => item.student.programCode || item.enrollment?.programCode).filter(Boolean))] as string[];
  return <div className="space-y-6"><PageHeader title="Graduation Monitoring" subtitle="Review curriculum completion, verified grades, missing credentials, and graduation readiness." actions={<Button variant="outline" icon={<RefreshCw className="size-4" />} onClick={() => void load()}>Refresh</Button>} />
    <Card><CardContent className="grid gap-3 sm:grid-cols-2"><Select label="Program" value={program} onChange={event => setProgram(event.target.value)}><option value="all">All programs</option>{programs.map(item => <option key={item} value={item}>{item}</option>)}</Select><Select label="Year level" value={year} onChange={event => setYear(event.target.value)}><option value="all">All year levels</option>{[1, 2, 3, 4].map(item => <option key={item} value={item}>Year {item}</option>)}</Select></CardContent></Card>
    <Card><CardHeader><div><CardTitle>Graduation candidates</CardTitle><p className="text-sm text-slate-600">A fourth-year student is not automatically eligible; all curriculum and credential requirements must be complete.</p></div></CardHeader><CardContent>{loading ? <p role="status">Loading candidates…</p> : filtered.length === 0 ? <div className="py-8 text-center text-sm text-slate-600"><GraduationCap className="mx-auto mb-2 size-8 text-royal" />No students match the selected filters.</div> : <div className="space-y-3">{filtered.map(item => <div key={item.student.uid} className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-center"><div><p className="font-semibold text-navy">{item.student.fullName}</p><p className="text-xs text-slate-600">{item.student.idNumber} · {item.student.programCode || item.enrollment?.programCode || 'Program not assigned'} · Year {item.student.yearLevel || item.enrollment?.yearLevel || '—'}</p></div><div><p className="text-sm font-semibold text-navy">{item.completed}/{item.total} units</p><p className="text-xs text-slate-600">{item.remaining} remaining</p></div><div><p className="text-sm font-semibold text-navy">{item.missingCredentials}</p><p className="text-xs text-slate-600">missing credentials</p></div><Badge variant={item.eligible ? 'success' : 'warning'}>{item.eligible ? 'Eligible' : 'Needs review'}</Badge></div>)}</div>}</CardContent></Card>
  </div>;
}
