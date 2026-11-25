import { useEffect, useMemo, useState } from 'react';
import { FileCheck2, Landmark, RefreshCw, Search } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../context/ToastContext';
import { getWorkflowRequests, updateWorkflowRequest, getCredentialRequirements, updateCredentialRequirement } from '../../services/registrarWorkflowService';
import { getAllGrades, updateGradeVerification } from '../../services/gradeService';
import { getAllLedgers } from '../../services/ledgerService';
import { getFeeConfigurations, saveFeeConfiguration } from '../../services/feeService';
import { getAllUsers } from '../../services/userService';
import { getAllPrograms } from '../../services/programService';
import { getAllEnrollments } from '../../services/enrollmentService';
import { StudentFinanceView } from './StudentFinanceView';
import type { CredentialRequirement, RegistrarWorkflowRequest, StudentGrade, StudentLedger, UserProfile, TuitionFeeConfiguration, Program, EnrollmentRecord } from '../../types';

type WorkflowMode = 'grades' | 'requests' | 'credentials' | 'finance';
const labels: Record<WorkflowMode, {title: string; subtitle: string}> = {
  grades: {title: 'Grades & Records', subtitle: 'Verify submitted grades before they become official academic records.'},
  requests: {title: 'Student Requests', subtitle: 'Review add/drop and document requests using clear status actions.'},
  credentials: {title: 'Student Credentials', subtitle: 'Track missing requirements and verify submitted credentials.'},
  finance: {title: 'Student Finance', subtitle: 'Review statement-of-account coordination and student ledger summaries.'},
};

export function RegistrarWorkflowPage({ mode }: { mode: WorkflowMode }) {
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [requests, setRequests] = useState<RegistrarWorkflowRequest[]>([]);
  const [credentials, setCredentials] = useState<CredentialRequirement[]>([]);
  const [ledgers, setLedgers] = useState<StudentLedger[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [search, setSearch] = useState('');
  const [requestStatus, setRequestStatus] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [feeConfig, setFeeConfig] = useState<TuitionFeeConfiguration>({id: 'default', academicYear: '2026-2027', semester: '1st Semester', tuitionPerUnit: 0, laboratoryFeePerSubject: 0, miscellaneousFee: 0, otherCharges: 0, updatedAt: ''});
  const [savingFees, setSavingFees] = useState(false);
  const { error, success } = useToast();

  const load = async () => {
    try {
      const [nextGrades, nextRequests, nextCredentials, nextLedgers, nextUsers, nextFees, nextPrograms, nextEnrollments] = await Promise.all([getAllGrades(), getWorkflowRequests(), getCredentialRequirements(), getAllLedgers(), getAllUsers(), getFeeConfigurations(), getAllPrograms(), getAllEnrollments()]);
      setGrades(nextGrades); setRequests(nextRequests); setCredentials(nextCredentials); setLedgers(nextLedgers); setUsers(nextUsers); setPrograms(nextPrograms); setEnrollments(nextEnrollments); if (nextFees[0]) setFeeConfig(nextFees[0]);
    } catch { error('Could not load this Registrar workflow.'); }
  };
  useEffect(() => { void load(); }, []);
  const query = search.trim().toLowerCase();
  const matches = (value: string) => !query || value.toLowerCase().includes(query);
  const studentProgram = (studentId: string) => users.find(user => user.uid === studentId)?.programCode || '';
  const programOptions = [...new Set([...users.map(user => user.programCode), ...ledgers.map(item => item.programCode)].filter(Boolean))].sort();
  const pendingGrades = useMemo(() => grades.filter(item => item.verificationStatus !== 'verified').filter(item => (programFilter === 'all' || studentProgram(item.studentId) === programFilter) && matches(`${item.subjectTitle} ${item.subjectCode} ${item.studentName}`)), [grades, query, programFilter, users]);
  const visibleRequests = requests.filter(item =>
    (requestStatus === 'all' || item.status === requestStatus) &&
    (programFilter === 'all' || studentProgram(item.studentId) === programFilter) &&
    matches(`${item.title} ${item.studentName} ${item.type} ${item.status} ${item.details}`)
  );
  const visibleCredentials = credentials.filter(item => (programFilter === 'all' || studentProgram(item.studentId) === programFilter) && matches(`${item.studentName} ${item.requirement} ${item.status}`));
  const visibleLedgers = ledgers.filter(item => programFilter === 'all' || item.programCode === programFilter);

  const verifyGrade = async (item: StudentGrade, status: StudentGrade['verificationStatus']) => {
    await updateGradeVerification(item.id, {verificationStatus: status});
    setGrades(current => current.map(row => row.id === item.id ? {...row, verificationStatus: status} : row));
    success(status === 'verified' ? 'Grade verified.' : 'Grade returned for correction.');
  };
  const updateRequest = async (item: RegistrarWorkflowRequest, status: RegistrarWorkflowRequest['status']) => {
    await updateWorkflowRequest(item.id, {status});
    setRequests(current => current.map(row => row.id === item.id ? {...row, status} : row));
    success('Request status updated.');
  };
  const verifyCredential = async (item: CredentialRequirement) => {
    await updateCredentialRequirement(item.id, {status: 'verified'});
    setCredentials(current => current.map(row => row.id === item.id ? {...row, status: 'verified'} : row));
    success('Credential verified.');
  };
  const saveFees = async (event: React.FormEvent) => {
    event.preventDefault(); setSavingFees(true);
    try { const saved = await saveFeeConfiguration(feeConfig); setFeeConfig(saved); success('Tuition and fee configuration saved.'); } catch { error('Could not save fee configuration.'); } finally { setSavingFees(false); }
  };
  const {title, subtitle} = labels[mode];
  return <div className="space-y-6">
    <PageHeader title={title} subtitle={subtitle} actions={<Button variant="outline" icon={<RefreshCw className="size-4" />} onClick={() => void load()}>Refresh</Button>} />
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="relative w-full max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy" /><Input aria-label="Search records" placeholder={mode === 'requests' ? 'Search student, request type, status, or details' : mode === 'finance' ? 'Search is not required for summary' : 'Search student, subject, or status'} value={search} onChange={event => setSearch(event.target.value)} className="pl-9" /></div><Select label="Filter by program" value={programFilter} onChange={event => setProgramFilter(event.target.value)}><option value="all">All programs</option>{programOptions.map(program => <option key={program} value={program}>{program}</option>)}</Select>{mode === 'requests' && <Select label="Filter by status" value={requestStatus} onChange={event => setRequestStatus(event.target.value)}><option value="all">All statuses</option><option value="submitted">Submitted</option><option value="under_review">Under review</option><option value="for_compliance">For compliance</option><option value="processing">Processing</option><option value="ready_for_pickup">Ready for pickup</option><option value="released">Released</option><option value="denied">Denied</option></Select>}</div>
    {mode === 'grades' && <Card><CardHeader><div><CardTitle>Pending verification</CardTitle><p className="text-sm text-slate-600">Submitted grades awaiting Registrar action.</p></div><Badge variant="navy">{pendingGrades.length} pending</Badge></CardHeader><CardContent><div className="space-y-3">{pendingGrades.map(item => <div key={item.id} className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-[1fr_auto_auto]"><div><p className="font-semibold text-navy">{item.subjectTitle || 'Subject title unavailable'}</p><p className="text-xs text-slate-600">{item.subjectCode} · {item.studentName} · {item.studentIdNumber}</p><p className="text-sm text-slate-600">{item.letterGrade || 'Pending'} · {item.remarks || 'Submitted by teacher'}</p></div><Button size="sm" onClick={() => void verifyGrade(item, 'verified')}>Verify</Button><Button size="sm" variant="outline" onClick={() => void verifyGrade(item, 'returned')}>Return for correction</Button></div>)}{pendingGrades.length === 0 && <p className="py-8 text-center text-sm text-slate-600">No grades are waiting for verification.</p>}</div></CardContent></Card>}
    {mode === 'requests' && <Card><CardHeader><div><CardTitle>Requests queue</CardTitle><p className="text-sm text-slate-600">Add/drop and document requests requiring action.</p></div><Badge variant="navy">{visibleRequests.length} requests</Badge></CardHeader><CardContent><div className="space-y-3">{visibleRequests.map(item => <div key={item.id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-navy">{item.title}</p><p className="text-sm text-slate-600">{item.studentName} · {item.type.replace('_', ' ')}</p><p className="mt-1 text-xs text-slate-600">{item.details}</p><p className="mt-2 text-xs text-slate-500">Submitted {new Date(item.createdAt).toLocaleDateString()}</p></div><Badge variant="info">{item.status.replace('_', ' ')}</Badge></div><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => void updateRequest(item, 'under_review')}>Review</Button><Button size="sm" onClick={() => void updateRequest(item, 'processing')}>Process</Button><Button size="sm" variant="outline" onClick={() => void updateRequest(item, 'denied')}>Deny</Button></div></div>)}</div>{visibleRequests.length === 0 && <p className="py-8 text-center text-sm text-slate-600">No requests match the search or status filter.</p>}</CardContent></Card>}
    {mode === 'credentials' && <Card><CardHeader><div><CardTitle>Credential requirements</CardTitle><p className="text-sm text-slate-600">Missing and submitted student documents.</p></div><Badge variant="navy">{visibleCredentials.length} records</Badge></CardHeader><CardContent><div className="space-y-3">{visibleCredentials.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4"><div><p className="font-semibold text-navy">{item.studentName}</p><p className="text-sm text-slate-600">{item.requirement}</p></div>{item.status === 'verified' ? <Badge variant="success">Verified</Badge> : <Button size="sm" onClick={() => void verifyCredential(item)}>Verify submission</Button>}</div>)}</div></CardContent></Card>}
    {mode === 'finance' && <div className="space-y-6"><Card><CardHeader><div><CardTitle>Tuition and fee configuration</CardTitle><p className="text-sm text-slate-600">Set approved rates before generating student assessments. Amounts are stored in Philippine Peso.</p></div></CardHeader><CardContent><form onSubmit={saveFees} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Input label="Academic year" value={feeConfig.academicYear} onChange={event => setFeeConfig({...feeConfig, academicYear: event.target.value})} required /><Select label="Semester" value={feeConfig.semester} onChange={event => setFeeConfig({...feeConfig, semester: event.target.value})}><option>1st Semester</option><option>2nd Semester</option><option>Summer</option></Select><Input label="Tuition per unit (₱)" type="number" min="0" step="0.01" value={feeConfig.tuitionPerUnit} onChange={event => setFeeConfig({...feeConfig, tuitionPerUnit: Number(event.target.value)})} required /><Input label="Laboratory fee per subject (₱)" type="number" min="0" step="0.01" value={feeConfig.laboratoryFeePerSubject} onChange={event => setFeeConfig({...feeConfig, laboratoryFeePerSubject: Number(event.target.value)})} required /><Input label="Miscellaneous fee (₱)" type="number" min="0" step="0.01" value={feeConfig.miscellaneousFee} onChange={event => setFeeConfig({...feeConfig, miscellaneousFee: Number(event.target.value)})} required /><Input label="Other charges (₱)" type="number" min="0" step="0.01" value={feeConfig.otherCharges} onChange={event => setFeeConfig({...feeConfig, otherCharges: Number(event.target.value)})} required /><div className="sm:col-span-2 lg:col-span-3"><Button type="submit" isLoading={savingFees}>Save approved rates</Button></div></form></CardContent></Card><div className="grid gap-6 lg:grid-cols-3"><Card><CardContent><Landmark className="mb-3 size-6 text-royal" /><p className="text-2xl font-bold text-navy">{visibleLedgers.length}</p><p className="text-sm text-slate-600">Student ledgers</p></CardContent></Card><Card><CardContent><p className="text-2xl font-bold text-navy">₱{visibleLedgers.reduce((sum, item) => sum + item.totalAssessment, 0).toLocaleString()}</p><p className="text-sm text-slate-600">Total assessed</p></CardContent></Card><Card><CardContent><p className="text-2xl font-bold text-navy">₱{visibleLedgers.reduce((sum, item) => sum + item.remainingBalance, 0).toLocaleString()}</p><p className="text-sm text-slate-600">Outstanding balance</p></CardContent></Card><Card className="lg:col-span-3"><CardHeader><div><CardTitle>Student ledger summary</CardTitle><p className="text-sm text-slate-600">Existing ledger records coordinated with Accounting.</p></div></CardHeader><CardContent><div className="divide-y divide-slate-100">{visibleLedgers.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold text-navy">{item.studentName}</p><p className="text-xs text-slate-600">{item.studentIdNumber} · {item.programCode}</p></div><span className="font-semibold text-navy">Balance: ₱{item.remainingBalance.toLocaleString()}</span></div>)}</div>{visibleLedgers.length === 0 && <p className="py-8 text-center text-sm text-slate-600">No ledger records match this program.</p>}</CardContent></Card></div></div>}
  </div>;
}
