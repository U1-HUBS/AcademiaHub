import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, FileCheck2, GraduationCap, Landmark, RefreshCw, type LucideIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { getCredentialRequirements, getSubjectOfferings, getWorkflowRequests, saveCredentialRequirement, updateCredentialRequirement, updateWorkflowRequest } from '../../services/registrarWorkflowService';
import { getAllGrades, updateGradeVerification } from '../../services/gradeService';
import { getAllLedgers } from '../../services/ledgerService';
import { getAllSubjects } from '../../services/subjectService';
import { getAllPrograms } from '../../services/programService';
import { getAllUsers } from '../../services/userService';
import { saveOffering } from '../../services/registrarWorkflowService';
import type { CredentialRequirement, Program, StudentGrade, StudentLedger, RegistrarWorkflowRequest, Subject, SubjectOffering } from '../../types';

const statusLabel = (value: string) => value.replaceAll('_', ' ');

export function RegistrarOperationsPage() {
  const [offerings, setOfferings] = useState<SubjectOffering[]>([]);
  const [requests, setRequests] = useState<RegistrarWorkflowRequest[]>([]);
  const [credentials, setCredentials] = useState<CredentialRequirement[]>([]);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [ledgers, setLedgers] = useState<StudentLedger[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [programId, setProgramId] = useState('');
  const [yearLevel, setYearLevel] = useState('1');
  const [semester, setSemester] = useState('1st Semester');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [demandNote, setDemandNote] = useState('');
  const [savingOffering, setSavingOffering] = useState(false);
  const [students, setStudents] = useState<{uid: string; fullName: string; idNumber: string}[]>([]);
  const [credentialStudent, setCredentialStudent] = useState('');
  const [credentialName, setCredentialName] = useState('PSA Birth Certificate');
  const [savingCredential, setSavingCredential] = useState(false);
  const [loading, setLoading] = useState(true);
  const { error, success } = useToast();
  const { user } = useAuth();
  const load = async () => {
    setLoading(true);
    try {
      const [nextOfferings, nextRequests, nextCredentials, nextGrades, nextLedgers, nextSubjects, nextPrograms, nextUsers] = await Promise.all([getSubjectOfferings(), getWorkflowRequests(), getCredentialRequirements(), getAllGrades(), getAllLedgers(), getAllSubjects(), getAllPrograms(), getAllUsers()]);
      setOfferings(nextOfferings); setRequests(nextRequests); setCredentials(nextCredentials); setGrades(nextGrades); setLedgers(nextLedgers); setSubjects(nextSubjects); setPrograms(nextPrograms);
      setStudents(nextUsers.filter(item => item.role === 'student').map(item => ({uid: item.uid, fullName: item.fullName, idNumber: item.idNumber})));
    } catch { error('Could not load Registrar workflow records.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const reviewRequest = async (item: RegistrarWorkflowRequest, status: RegistrarWorkflowRequest['status'], remarks?: string) => {
    await updateWorkflowRequest(item.id, {status, remarks});
    setRequests(current => current.map(row => row.id === item.id ? {...row, status, remarks} : row));
    success('Request status updated.');
  };
  const verifyCredential = async (item: CredentialRequirement) => {
    await updateCredentialRequirement(item.id, {status: 'verified'});
    setCredentials(current => current.map(row => row.id === item.id ? {...row, status: 'verified'} : row));
    success('Credential marked as verified.');
  };
  const verifyGrade = async (item: StudentGrade, status: StudentGrade['verificationStatus']) => {
    if (!user) return;
    await updateGradeVerification(item.id, {verificationStatus: status, verifiedBy: user.uid});
    setGrades(current => current.map(row => row.id === item.id ? {...row, verificationStatus: status, verifiedBy: user.uid} : row));
    success(status === 'verified' ? 'Grade verified as an official record.' : 'Grade returned to the teacher.');
  };
  const createOffering = async (event: React.FormEvent) => {
    event.preventDefault();
    const subject = subjects.find(item => item.id === subjectId);
    const selectedProgram = programs.find(item => item.id === programId);
    if (!subject || !selectedProgram || savingOffering) return;
    setSavingOffering(true);
    const now = new Date().toISOString();
    const offering: SubjectOffering = {id: `offering-${Date.now()}`, subjectId: subject.id, subjectCode: subject.code, subjectTitle: subject.title, units: subject.units, programId: selectedProgram.id, programCode: selectedProgram.code, yearLevel: Number(yearLevel), academicYear, semester, demandNote: demandNote.trim(), status: 'proposed', createdAt: now, updatedAt: now};
    try { await saveOffering(offering); setOfferings(current => [offering, ...current]); setDemandNote(''); success('Subject offering proposed for Program Chair review.'); } catch { error('Could not save the subject offering.'); } finally { setSavingOffering(false); }
  };
  const createCredential = async (event: React.FormEvent) => {
    event.preventDefault();
    const student = students.find(item => item.uid === credentialStudent);
    if (!student || savingCredential) return;
    setSavingCredential(true);
    const item: CredentialRequirement = {id: `credential-${student.uid}-${Date.now()}`, studentId: student.uid, studentName: student.fullName, requirement: credentialName, status: 'missing', updatedAt: new Date().toISOString()};
    try { await saveCredentialRequirement(item); setCredentials(current => [item, ...current]); success('Missing credential requirement recorded.'); } catch { error('Could not record the credential requirement.'); } finally { setSavingCredential(false); }
  };
  return <div className="space-y-6">
    <PageHeader title="Registrar Operations" subtitle="Coordinate offerings, records, requests, credentials, and graduation readiness in one workspace."
      actions={<Button variant="outline" icon={<RefreshCw className="size-4" />} onClick={() => void load()}>Refresh</Button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {([
        ['Subject offerings', offerings.filter(item => item.status !== 'closed').length, ClipboardList],
        ['Open requests', requests.filter(item => !['released', 'denied'].includes(item.status)).length, FileCheck2],
        ['Missing credentials', credentials.filter(item => item.status === 'missing').length, GraduationCap],
        ['Verified records', credentials.filter(item => item.status === 'verified').length, CheckCircle2],
      ] as [string, number, LucideIcon][]).map(([label, value, Icon]) => <Card key={label}><CardContent className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-lg bg-blue-50 text-royal"><Icon className="size-5" /></div><div><p className="text-2xl font-bold text-navy">{value}</p><p className="text-xs text-slate-600">{label}</p></div></CardContent></Card>)}
    </div>
    <nav aria-label="Registrar operations shortcuts" className="portal-panel grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-5">
      {[
        ['#operations-workflows', 'Subject offerings', 'Propose and monitor subjects'],
        ['#operations-workflows', 'Requests for review', 'Process student requests'],
        ['#operations-workflows', 'Student credentials', 'Record and verify documents'],
        ['#operations-workflows', 'Grades verification', 'Approve official grades'],
        ['#operations-workflows', 'Finance coordination', 'View ledger totals'],
      ].map(([href, label, description]) => (
        <a key={href} href={href} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal">
          <span className="block text-sm font-bold text-navy">{label}</span>
          <span className="mt-0.5 block text-xs text-slate-600">{description}</span>
        </a>
      ))}
    </nav>
    <div id="operations-workflows" className="grid scroll-mt-6 gap-6 xl:grid-cols-2">
      <Card><CardHeader><div><CardTitle>Propose subject offering</CardTitle><p className="text-sm text-slate-600">Open only the subjects needed for the upcoming term.</p></div></CardHeader><CardContent><form onSubmit={createOffering} className="grid gap-3 sm:grid-cols-2"><Select label="Subject" value={subjectId} onChange={event => setSubjectId(event.target.value)} required><option value="">Select prospectus subject</option>{subjects.map(item => <option key={item.id} value={item.id}>{item.code} · {item.title}</option>)}</Select><Select label="Program" value={programId} onChange={event => setProgramId(event.target.value)} required><option value="">Select program</option>{programs.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</Select><Select label="Year level" value={yearLevel} onChange={event => setYearLevel(event.target.value)}><option value="1">Year 1</option><option value="2">Year 2</option><option value="3">Year 3</option><option value="4">Year 4</option></Select><Select label="Semester" value={semester} onChange={event => setSemester(event.target.value)}><option>1st Semester</option><option>2nd Semester</option><option>Summer</option></Select><Input label="Academic year" value={academicYear} onChange={event => setAcademicYear(event.target.value)} required /><Input label="Demand note (optional)" value={demandNote} onChange={event => setDemandNote(event.target.value)} placeholder="Expected demand or sequence note" /><div className="sm:col-span-2"><Button type="submit" isLoading={savingOffering}>Propose offering</Button></div></form></CardContent></Card>
      <Card><CardHeader><div><CardTitle>Subject offerings</CardTitle><p className="text-sm text-slate-600">Registrar proposals awaiting Program Chair review.</p></div></CardHeader><CardContent>{loading ? <p role="status">Loading records…</p> : offerings.length === 0 ? <p className="text-sm text-slate-600">No subject offerings have been proposed.</p> : <div className="space-y-3">{offerings.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"><div><p className="font-semibold text-navy">{item.subjectCode} · {item.subjectTitle}</p><p className="text-xs text-slate-600">{item.programCode} · Year {item.yearLevel} · {item.academicYear} · {item.semester}</p></div><Badge variant={item.status === 'approved' ? 'success' : 'info'}>{statusLabel(item.status)}</Badge></div>)}</div>}</CardContent></Card>
      <Card><CardHeader><div><CardTitle>Requests for review</CardTitle><p className="text-sm text-slate-600">Add/Drop and student document requests.</p></div></CardHeader><CardContent>{requests.length === 0 ? <p className="text-sm text-slate-600">No requests are waiting for review.</p> : <div className="space-y-3">{requests.map(item => <div key={item.id} className="rounded-lg border border-slate-200 p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-navy">{item.title}</p><p className="text-xs text-slate-600">{item.studentName} · {statusLabel(item.type)}</p>{item.details && <p className="mt-2 text-sm text-slate-700">{item.details}</p>}{item.remarks && <p className="mt-2 text-xs text-slate-600">Remarks: {item.remarks}</p>}</div><Badge variant="info">{statusLabel(item.status)}</Badge></div><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => void reviewRequest(item, 'under_review')}>Review</Button><Button size="sm" variant="outline" onClick={() => void reviewRequest(item, 'for_compliance', window.prompt('What requirement is missing?') || 'Additional requirement needed.')}>For compliance</Button><Button size="sm" onClick={() => void reviewRequest(item, 'processing')}>Process</Button><Button size="sm" variant="ghost" onClick={() => void reviewRequest(item, 'denied', window.prompt('Enter the reason for denial.') || 'Request denied after review.')}>Deny</Button></div></div>)}</div>}</CardContent></Card>
      <Card><CardHeader><div><CardTitle>Missing credentials</CardTitle><p className="text-sm text-slate-600">Track submitted and verified student requirements.</p></div></CardHeader><CardContent>{credentials.length === 0 ? <p className="text-sm text-slate-600">No credential requirements recorded.</p> : <div className="space-y-3">{credentials.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"><div><p className="font-semibold text-navy">{item.requirement}</p><p className="text-xs text-slate-600">{item.studentName}</p></div>{item.status === 'verified' ? <Badge variant="success">Verified</Badge> : <Button size="sm" onClick={() => void verifyCredential(item)}>Verify</Button>}</div>)}</div>}</CardContent></Card>
      <Card><CardHeader><div><CardTitle>Record missing credential</CardTitle><p className="text-sm text-slate-600">Notify the student through their portal status.</p></div></CardHeader><CardContent><form onSubmit={createCredential} className="grid gap-3 sm:grid-cols-2"><Select label="Student" value={credentialStudent} onChange={event => setCredentialStudent(event.target.value)} required><option value="">Select student</option>{students.map(item => <option key={item.uid} value={item.uid}>{item.fullName} · {item.idNumber}</option>)}</Select><Select label="Requirement" value={credentialName} onChange={event => setCredentialName(event.target.value)}><option>PSA Birth Certificate</option><option>Form 137 / Transcript of Records</option><option>Good Moral Certificate</option><option>Transfer Credentials</option><option>Other required document</option></Select><div className="sm:col-span-2"><Button type="submit" isLoading={savingCredential}>Add requirement</Button></div></form></CardContent></Card>
      <Card><CardHeader><div><CardTitle>Grades verification</CardTitle><p className="text-sm text-slate-600">Teacher submissions become official only after Registrar verification.</p></div></CardHeader><CardContent>{grades.filter(item => item.verificationStatus !== 'verified').length === 0 ? <p className="text-sm text-slate-600">No grades are waiting for verification.</p> : <div className="space-y-3">{grades.filter(item => item.verificationStatus !== 'verified').map(item => <div key={item.id} className="rounded-lg border border-slate-200 p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-navy">{item.subjectCode} · {item.studentName}</p><p className="text-xs text-slate-600">Rating: {item.letterGrade || 'Pending'} · {item.remarks}</p></div><Badge variant="info">{item.verificationStatus || 'submitted'}</Badge></div><div className="mt-3 flex gap-2"><Button size="sm" onClick={() => void verifyGrade(item, 'verified')}>Verify grade</Button><Button size="sm" variant="outline" onClick={() => void verifyGrade(item, 'returned')}>Return</Button></div></div>)}</div>}</CardContent></Card>
      <Card><CardHeader><div><CardTitle>Academic records and finance</CardTitle><p className="text-sm text-slate-600">Use existing grades, checklist, enrollment, and ledger records as the official source.</p></div></CardHeader><CardContent><div className="space-y-3 text-sm text-slate-700"><p><Landmark className="mr-2 inline size-4 text-royal" />Registrar verifies grades after teacher submission.</p><p><GraduationCap className="mr-2 inline size-4 text-royal" />Graduation readiness is based on completed curriculum and requirements.</p><p><CheckCircle2 className="mr-2 inline size-4 text-royal" />SOA balances remain coordinated through the existing student ledger.</p></div></CardContent></Card>
      <Card><CardHeader><div><CardTitle>Statement of Account coordination</CardTitle><p className="text-sm text-slate-600">Ledger summary for coordination with Accounting or Cashier.</p></div></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-3"><div><p className="text-2xl font-bold text-navy">{ledgers.length}</p><p className="text-xs text-slate-600">student ledgers</p></div><div><p className="text-2xl font-bold text-navy">{ledgers.reduce((sum, item) => sum + item.totalAssessment, 0).toLocaleString()}</p><p className="text-xs text-slate-600">total assessed</p></div><div><p className="text-2xl font-bold text-navy">{ledgers.reduce((sum, item) => sum + item.remainingBalance, 0).toLocaleString()}</p><p className="text-xs text-slate-600">outstanding balance</p></div></div></CardContent></Card>
    </div>
  </div>;
}
