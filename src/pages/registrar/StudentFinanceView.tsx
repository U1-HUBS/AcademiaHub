import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CreditCard, FileText, Printer, Search, UserRound } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import type { EnrollmentRecord, Program, StudentLedger, UserProfile } from '../../types';
import { recordPayment, recalculateStudentLedger } from '../../services/ledgerService';
import { getStudentLedger } from '../../services/ledgerService';
import { useToast } from '../../context/ToastContext';
import { recordStudentPaymentSecure } from '../../services/paymentAutomation';

interface Props {
  programs: Program[];
  users: UserProfile[];
  enrollments: EnrollmentRecord[];
  ledgers: StudentLedger[];
  academicYear: string;
  semester: string;
  onLedgerChange: (ledger: StudentLedger) => void;
}

const money = (value: number) => `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function StudentFinanceView({ programs, users, enrollments, ledgers, academicYear, semester, onLedgerChange }: Props) {
  const [programId, setProgramId] = useState('');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [year, setYear] = useState(academicYear);
  const [term, setTerm] = useState(semester);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [saving, setSaving] = useState(false);
  const { success, error } = useToast();

  const activeEnrollments = useMemo(() => enrollments.filter(item => ['enrolled', 'regular', 'irregular'].includes(item.status) && item.academicYear === year && item.semester === term && (!programId || item.programId === programId)), [enrollments, programId, year, term]);
  const students = useMemo(() => activeEnrollments.map(enrollment => {
    const user = users.find(item => item.uid === enrollment.studentId);
    const ledger = ledgers.find(item => item.studentId === enrollment.studentId);
    return { enrollment, user, ledger };
  }).filter(item => item.user), [activeEnrollments, users, ledgers]);
  const visibleStudents = students.filter(item => {
    const text = `${item.user?.fullName} ${item.user?.idNumber}`.toLowerCase();
    const matchesSearch = !query.trim() || text.includes(query.trim().toLowerCase());
    const matchesStatus = status === 'all' || item.ledger?.status === status;
    return matchesSearch && matchesStatus;
  });
  const selected = studentId ? students.find(item => item.user?.uid === studentId) : undefined;
  const selectedLedger = selected?.ledger;

  useEffect(() => {
    let cancelled = false;
    const refreshVisibleBalances = async () => {
      const refreshed = await Promise.all(activeEnrollments.map(async enrollment => {
        try { return await recalculateStudentLedger(enrollment.studentId, year, term, false); }
        catch { return null; }
      }));
      if (!cancelled) refreshed.filter((item): item is StudentLedger => Boolean(item)).forEach(onLedgerChange);
    };
    if (programId && activeEnrollments.length) void refreshVisibleBalances();
    return () => { cancelled = true; };
  }, [activeEnrollments, programId, year, term]);

  const openLedger = async (uid: string) => {
    try {
      const current = await getStudentLedger(uid);
      if (!current) throw new Error('Ledger record not found for this student.');
      const fresh = await recalculateStudentLedger(uid, year, term, false);
      onLedgerChange(fresh);
      setStudentId(uid);
    } catch (cause) { error(cause instanceof Error ? cause.message : 'Could not open this ledger.'); }
  };

  const savePayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!studentId || !Number(paymentAmount) || Number(paymentAmount) <= 0) return;
    setSaving(true);
    try {
      const secure = await recordStudentPaymentSecure(studentId, Number(paymentAmount), paymentReference, 'Official payment');
      const updated = secure || await recordPayment(studentId, Number(paymentAmount), 'payment_cash', paymentReference, 'Official payment');
      onLedgerChange(updated); setPaymentOpen(false); setPaymentAmount(''); setPaymentReference(''); success('Payment recorded and balance updated.');
    } catch (cause) { error(cause instanceof Error ? cause.message : 'Could not record payment.'); }
    finally { setSaving(false); }
  };

  if (selected && selectedLedger) return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="outline" icon={<ArrowLeft className="size-4" />} onClick={() => setStudentId(null)}>Back to student list</Button>
      <div className="flex gap-2"><Button variant="outline" icon={<Printer className="size-4" />} onClick={() => window.print()}>Print statement</Button><Button icon={<CreditCard className="size-4" />} onClick={() => setPaymentOpen(true)}>Record payment</Button></div>
    </div>
    <Card><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Individual student ledger</p><CardTitle>{selected.user?.fullName}</CardTitle><p className="mt-1 text-sm text-slate-600">{selected.user?.idNumber} · {selected.user?.programCode || 'Program'} · {year} · {term}</p></div><Badge variant="navy">{selectedLedger.status.toUpperCase()}</Badge></div></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-semibold uppercase text-blue-700">Total assessment</p><p className="mt-1 text-2xl font-bold text-navy">{money(selectedLedger.totalAssessment)}</p></div><div className="rounded-lg border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-semibold uppercase text-blue-700">Payments made</p><p className="mt-1 text-2xl font-bold text-navy">{money(selectedLedger.totalPaid)}</p></div><div className="rounded-lg border border-blue-100 bg-blue-50 p-4"><p className="text-xs font-semibold uppercase text-blue-700">Remaining balance</p><p className="mt-1 text-2xl font-bold text-navy">{money(selectedLedger.remainingBalance)}</p></div></div></CardContent></Card>
    <Card><CardHeader><CardTitle>Enrolled subjects and charges</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="py-3">Subject</th><th className="py-3 text-center">Units</th><th className="py-3 text-right">Tuition</th><th className="py-3 text-right">Laboratory</th></tr></thead><tbody className="divide-y divide-slate-100">{(selectedLedger.subjectCharges || []).map(item => <tr key={item.subjectId}><td className="py-3"><p className="font-semibold text-navy">{item.subjectCode}</p><p className="text-xs text-slate-600">{item.subjectTitle}</p></td><td className="py-3 text-center">{item.units}</td><td className="py-3 text-right">{money(item.tuition)}</td><td className="py-3 text-right">{money(item.laboratory)}</td></tr>)}</tbody></table></div>{!(selectedLedger.subjectCharges || []).length && <p className="py-6 text-center text-sm text-slate-600">No current subject charges are available.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle>Assessment breakdown</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><tbody className="divide-y divide-slate-100"><tr><td className="py-3 font-semibold">Tuition</td><td className="py-3 text-slate-600">Official enrolled subject units</td><td className="py-3 text-right font-semibold">{money(selectedLedger.tuitionFee)}</td></tr><tr><td className="py-3 font-semibold">Laboratory and other charges</td><td className="py-3 text-slate-600">Laboratory fees and configured charges</td><td className="py-3 text-right font-semibold">{money(selectedLedger.otherCharges)}</td></tr><tr><td className="py-3 font-semibold">Miscellaneous</td><td className="py-3 text-slate-600">Approved school miscellaneous fee</td><td className="py-3 text-right font-semibold">{money(selectedLedger.miscellaneousFee)}</td></tr></tbody><tfoot className="border-t-2 border-slate-200"><tr><td colSpan={2} className="py-3 text-right font-bold">Total assessment</td><td className="py-3 text-right font-bold text-navy">{money(selectedLedger.totalAssessment)}</td></tr></tfoot></table></div></CardContent></Card>
    <Card><CardHeader><CardTitle>Payment history</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="py-3">Date</th><th className="py-3">Reference</th><th className="py-3">Details</th><th className="py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{selectedLedger.transactions.filter(item => item.type === 'payment').map(item => <tr key={item.id}><td className="py-3">{item.date}</td><td className="py-3 font-mono">{item.referenceNo}</td><td className="py-3">{item.description}</td><td className="py-3 text-right font-semibold">{money(item.amount)}</td></tr>)}</tbody></table></div>{selectedLedger.transactions.every(item => item.type !== 'payment') && <p className="py-6 text-center text-sm text-slate-600">No payments recorded for this term.</p>}</CardContent></Card>
    <Modal isOpen={paymentOpen} onClose={() => setPaymentOpen(false)} title="Record student payment" subtitle={`${selected.user?.fullName} · ${money(selectedLedger.remainingBalance)} remaining`}><form onSubmit={savePayment} className="space-y-4"><Input label="Payment amount (₱)" type="number" min="0.01" step="0.01" value={paymentAmount} onChange={event => setPaymentAmount(event.target.value)} required /><Input label="Reference number" value={paymentReference} onChange={event => setPaymentReference(event.target.value)} placeholder="Optional — generated if blank" /><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button><Button type="submit" isLoading={saving}>Save payment</Button></div></form></Modal>
  </div>;

  return <div className="space-y-5"><Card><CardHeader><div><CardTitle>1. Select academic program</CardTitle><p className="mt-1 text-sm text-slate-600">Choose a program to narrow the finance records to its officially enrolled students.</p></div></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-3"><Select label="Academic program" value={programId} onChange={event => setProgramId(event.target.value)}><option value="">Select a program</option>{programs.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</Select><Input label="Academic year" value={year} onChange={event => setYear(event.target.value)} /><Select label="Semester" value={term} onChange={event => setTerm(event.target.value)}><option>1st Semester</option><option>2nd Semester</option><option>Summer</option></Select></div></CardContent></Card>{programId && <Card><CardHeader><div><CardTitle>2. Find a student</CardTitle><p className="mt-1 text-sm text-slate-600">{visibleStudents.length} officially enrolled student{visibleStudents.length === 1 ? '' : 's'} in the selected program.</p></div></CardHeader><CardContent><div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px]"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-blue-700" /><Input aria-label="Search students" placeholder="Search Student ID or name" value={query} onChange={event => setQuery(event.target.value)} className="pl-9" /></div><Select label="Payment status" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option><option value="paid">Paid</option><option value="partial">Partially paid</option><option value="unpaid">Unpaid</option></Select></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="py-3">Student</th><th className="py-3">Student ID</th><th className="py-3 text-right">Assessment</th><th className="py-3 text-right">Paid</th><th className="py-3 text-right">Balance</th><th className="py-3 text-center">Status</th><th className="py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{visibleStudents.map(item => <tr key={item.user?.uid}><td className="py-3 font-semibold text-navy">{item.user?.fullName}</td><td className="py-3 font-mono text-xs">{item.user?.idNumber}</td><td className="py-3 text-right">{money(item.ledger?.totalAssessment || 0)}</td><td className="py-3 text-right">{money(item.ledger?.totalPaid || 0)}</td><td className="py-3 text-right font-bold text-navy">{money(item.ledger?.remainingBalance || 0)}</td><td className="py-3 text-center"><Badge variant="navy">{(item.ledger?.status || 'unpaid').toUpperCase()}</Badge></td><td className="py-3 text-right"><Button size="sm" icon={<FileText className="size-4" />} onClick={() => void openLedger(item.user!.uid)}>View ledger</Button></td></tr>)}</tbody></table></div>{visibleStudents.length === 0 && <div className="py-12 text-center"><UserRound className="mx-auto size-8 text-blue-700" /><p className="mt-2 font-semibold text-navy">No enrolled students found</p><p className="text-sm text-slate-600">Adjust the program, term, or search filters.</p></div>}</CardContent></Card>}{!programId && <div className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-8 text-center"><p className="font-semibold text-navy">Select a program to begin</p><p className="mt-1 text-sm text-slate-600">Student financial records will appear here after a program is selected.</p></div>}</div>;
}
