import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import {
  getAllEnrollments,
  deleteEnrollment,
} from '../../services/enrollmentService';
import { getAllLedgers, recordPayment } from '../../services/ledgerService';
import { AccountDialog, CredentialsDialog } from '../../components/ui/AccountDialog';
import { resetStudentPassword, saveEnrollmentWithAccount, type TemporaryCredentials } from '../../services/accountApi';
import { getAllUsers } from '../../services/userService';
import { getAllPrograms, getAllSections } from '../../services/programService';
import { EnrollmentRecord, UserProfile, Program, Section, StudentLedger } from '../../types';
import { UserCheck, Edit, Trash2, KeyRound, Receipt, CreditCard } from 'lucide-react';

export const StudentEnrollmentPage: React.FC = () => {
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EnrollmentRecord | null>(null);

  const [credentials, setCredentials] = useState<TemporaryCredentials | null>(null);
  const [resetTarget, setResetTarget] = useState<EnrollmentRecord | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [enrollmentError, setEnrollmentError] = useState('');

  // Form
  const [accountMode, setAccountMode] = useState<'new' | 'existing'>('new');
  const [studentFirstName, setStudentFirstName] = useState('');
  const [studentLastName, setStudentLastName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [studentId, setStudentId] = useState('');
  const [programId, setProgramId] = useState('');
  const [yearLevel, setYearLevel] = useState<number>(1);
  const [sectionId, setSectionId] = useState('');
  const [studentType, setStudentType] = useState<'regular' | 'evening'>('regular');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [semester, setSemester] = useState('1st Semester');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ledger Management State
  const [ledgers, setLedgers] = useState<StudentLedger[]>([]);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [selectedLedger, setSelectedLedger] = useState<StudentLedger | null>(null);
  const [payAmount, setPayAmount] = useState(1000);
  const [payMethod, setPayMethod] = useState<'payment_cash' | 'payment_online'>('payment_cash');
  const [payRef, setPayRef] = useState('');
  const [payDesc, setPayDesc] = useState('Tuition & Fee Payment');

  const { success, error } = useToast();

  const loadData = useCallback(async () => {
    try {
      const [eList, uList, pList, sList, lList] = await Promise.all([
        getAllEnrollments(),
        getAllUsers(),
        getAllPrograms(),
        getAllSections(),
        getAllLedgers(),
      ]);
      setEnrollments(eList);
      setStudents(uList.filter(u => u.role === 'student' && u.status === 'active'));
      setPrograms(pList);
      setSections(sList);
      setLedgers(lList);
    } catch {
      error('Could not refresh enrollment records. Try reloading this page.');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLedger || payAmount <= 0) {
      error('Please enter a valid payment amount.');
      return;
    }

    try {
      await recordPayment(selectedLedger.studentId, payAmount, payMethod, payRef, payDesc);
      success(`Official payment of $${payAmount} recorded for ${selectedLedger.studentName}.`);
      setSelectedLedger(null);
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to record payment receipt.');
    }
  };

  const openEnrollModal = () => {
    setEditingRecord(null);
    setEnrollmentError('');
    setAccountMode('new');
    setStudentFirstName('');
    setStudentLastName('');
    setStudentNumber('');
    setStudentEmail('');
    setStudentId('');
    setProgramId(programs[0]?.id || '');
    setYearLevel(1);
    setSectionId(sections.find(section => section.programId === programs[0]?.id && section.yearLevel === 1)?.id || '');
    setStudentType('regular');
    setIsModalOpen(true);
  };

  const openEditModal = (rec: EnrollmentRecord) => {
    setEditingRecord(rec);
    setEnrollmentError('');
    setAccountMode('existing');
    setStudentId(rec.studentId);
    setProgramId(rec.programId);
    setYearLevel(rec.yearLevel);
    setSectionId(rec.sectionId);
    setStudentType(rec.studentType || 'regular');
    setAcademicYear(rec.academicYear);
    setSemester(rec.semester);
    setIsModalOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setEnrollmentError('');
    setIsSubmitting(true);
    try {
      const identity = editingRecord || accountMode === 'existing'
        ? {studentUid: studentId, enrollmentId: editingRecord?.id}
        : {student: {firstName: studentFirstName, lastName: studentLastName, idNumber: studentNumber, email: studentEmail}};
      const result = await saveEnrollmentWithAccount({
        ...identity, programId, yearLevel, sectionId: undefined, studentType, status: editingRecord?.status || 'enrolled', academicYear, semester,
      });
      setIsModalOpen(false);
      if (result.credentials) setCredentials(result.credentials);
      success(editingRecord ? 'Enrollment updated.' : 'Student enrolled successfully.');
      await loadData();
    } catch (cause) {
      setEnrollmentError(cause instanceof Error ? cause.message : 'Could not save the enrollment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetTarget || isResetting) return;
    setResetError('');
    setIsResetting(true);
    try {
      await resetStudentPassword(resetTarget.studentIdNumber);
      setResetTarget(null);
      success('Password reset email sent to the student account.');
    } catch (cause) {
      setResetError(cause instanceof Error ? cause.message : 'Could not reset the password.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove enrollment record for ${name}?`)) return;
    try {
      await deleteEnrollment(id);
      success('Enrollment record removed.');
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to remove record.');
    }
  };

  const filtered = enrollments.filter(e => {
    const matchesSearch =
      e.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.studentIdNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.programCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.sectionName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const columns = [
    {
      key: 'student',
      header: 'Student',
      render: (e: EnrollmentRecord) => (
        <div>
          <div className="font-bold text-slate-800">{e.studentName}</div>
          <div className="text-xs text-slate-400 font-mono">{e.studentIdNumber}</div>
        </div>
      ),
    },
    {
      key: 'program',
      header: 'Program & Year',
      render: (e: EnrollmentRecord) => (
        <div>
          <span className="font-semibold text-slate-700">{e.programCode}</span>
          <span className="text-xs text-slate-400 ml-1.5">Yr {e.yearLevel}</span>
        </div>
      ),
    },
    {
      key: 'section',
      header: 'Assigned Section',
      render: (e: EnrollmentRecord) => <span className="font-medium text-slate-700">{e.sectionName}</span>,
    },
    {
      key: 'term',
      header: 'Term',
      render: (e: EnrollmentRecord) => (
        <span className="text-xs text-slate-500">
          {e.academicYear} ({e.semester})
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (e: EnrollmentRecord) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button type="button" variant="ghost" size="sm"
            onClick={() => { setResetError(''); setResetTarget(e); }}
            icon={<KeyRound className="size-4" />}>
            Reset Password
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(e)}
            icon={<Edit className="w-3.5 h-3.5 text-slate-500" />}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(e.id, e.studentName)}
            className="text-rose-600 hover:text-rose-700"
            icon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Remove
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="credential-theme space-y-6">
      <PageHeader
        title="Student Enrollment"
        subtitle="Official institutional registration, cohort allocations, and academic standing."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsLedgerModalOpen(true)} icon={<Receipt className="w-4 h-4" />}>
              Manage Student Ledgers
            </Button>
            <Button variant="primary" size="sm" disabled={loading} onClick={openEnrollModal} icon={<UserCheck className="w-4 h-4" />}>
              Register Student Enrollment
            </Button>
          </>
        }
      />

      {loading && <p className="text-sm text-slate-600" role="status">Loading records…</p>}
      <Table
        label="Student enrollments"
        data={filtered}
        columns={columns}
        keyExtractor={e => e.id}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by student, ID, program, or section..."
      />

      {resetTarget && (
        <AccountDialog title="Reset student password?" busy={isResetting} onClose={() => setResetTarget(null)}>
          <p className="text-sm leading-relaxed text-slate-700">
            Reset the password for <strong>{resetTarget.studentName}</strong> ({resetTarget.studentIdNumber})?
            Firebase will email a secure password reset link to the student account. The student can choose a new password from that link.
          </p>
          {resetError && <p role="alert" className="mt-3 text-sm text-rose-700">{resetError}</p>}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={isResetting} onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button type="button" isLoading={isResetting} onClick={handlePasswordReset}>Reset password</Button>
          </div>
        </AccountDialog>
      )}
      {credentials && <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />}

      <Modal
        isOpen={isModalOpen}
        onClose={() => { if (!isSubmitting) setIsModalOpen(false); }}
        title={editingRecord ? 'Update Student Enrollment' : 'Official Student Enrollment'}
        subtitle="Registrar Student Record Authority"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {editingRecord ? (
            <p className="rounded-lg bg-blue-50 p-3 text-sm text-[#142D59]">
              <strong>{editingRecord.studentName}</strong> · {editingRecord.studentIdNumber}
            </p>
          ) : (
            <>
              <Select label="Student account" value={accountMode}
                onChange={event => setAccountMode(event.target.value === 'existing' ? 'existing' : 'new')}>
                <option value="new">Create account for a new student</option>
                <option value="existing">Enroll an existing student</option>
              </Select>
              {accountMode === 'new' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="First name" value={studentFirstName} maxLength={120}
                    onChange={event => setStudentFirstName(event.target.value)} required />
                  <Input label="Last name" value={studentLastName} maxLength={120}
                    onChange={event => setStudentLastName(event.target.value)} required />
                  <Input label="Student ID Number" value={studentNumber} placeholder="2026-0001" maxLength={40}
                    helperText="The student will use this ID to sign in."
                    onChange={event => setStudentNumber(event.target.value)} required />
                  <Input label="Contact email (optional)" type="email" value={studentEmail}
                    onChange={event => setStudentEmail(event.target.value)} />
                </div>
              ) : (
                <Select label="Existing student" value={studentId} onChange={event => setStudentId(event.target.value)} required>
                  <option value="">Select a student</option>
                  {students.map(student => (
                    <option key={student.uid} value={student.uid}>{student.fullName} ({student.idNumber})</option>
                  ))}
                </Select>
              )}
            </>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Academic Program"
              value={programId}
              onChange={e => { setProgramId(e.target.value); setSectionId(''); }}
              required
            >
              <option value="">Select program...</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </Select>

            <Select
              label="Year Level"
              value={yearLevel}
              onChange={e => { setYearLevel(Number(e.target.value)); setSectionId(''); }}
            >
              <option value={1}>1st Year</option>
              <option value={2}>2nd Year</option>
              <option value={3}>3rd Year</option>
              <option value={4}>4th Year</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select label="Student Type" value={studentType} onChange={e => setStudentType(e.target.value as 'regular' | 'evening')}>
              <option value="regular">Regular</option>
              <option value="evening">Evening</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Academic Year"
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              placeholder="2026-2027"
              required
            />
            <Select
              label="Semester"
              value={semester}
              onChange={e => setSemester(e.target.value)}
            >
              <option value="1st Semester">1st Semester</option>
              <option value="2nd Semester">2nd Semester</option>
              <option value="Summer">Summer</option>
            </Select>
          </div>

          {enrollmentError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{enrollmentError}</p>}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" size="sm" disabled={isSubmitting} onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              {editingRecord ? 'Save Changes' : 'Confirm Enrollment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Ledger Accounts Modal for Registrar */}
      <Modal
        isOpen={isLedgerModalOpen}
        onClose={() => setIsLedgerModalOpen(false)}
        title="Student Financial Ledgers & Accounts"
        subtitle="Registrar Financial Authority: Review balances and record official receipts"
        maxWidth="2xl"
      >
        <div className="space-y-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-xs">
                <tr>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3 text-right">Assessment</th>
                  <th className="py-2.5 px-3 text-right">Total Paid</th>
                  <th className="py-2.5 px-3 text-right">Balance</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgers.map(led => (
                  <tr key={led.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800">{led.studentName}</div>
                      <div className="text-[11px] font-mono text-slate-400">{led.studentIdNumber}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono">${led.totalAssessment.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700 font-semibold">
                      ${led.totalPaid.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#142D59]">
                      ${led.remainingBalance.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant={led.status === 'paid' ? 'success' : led.status === 'partial' ? 'warning' : 'danger'}>
                        {led.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedLedger(led);
                          setPayAmount(led.remainingBalance > 0 ? Math.min(1000, led.remainingBalance) : 500);
                          setPayRef(`OR-${Math.floor(10000 + Math.random() * 90000)}`);
                        }}
                        icon={<CreditCard className="w-3.5 h-3.5" />}
                      >
                        Record Payment
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Record Payment Submodal */}
      <Modal
        isOpen={Boolean(selectedLedger)}
        onClose={() => setSelectedLedger(null)}
        title={`Record Official Payment: ${selectedLedger?.studentName}`}
        subtitle={`Remaining Balance: $${selectedLedger?.remainingBalance.toLocaleString()}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <Input
            label="Payment Amount ($)"
            type="number"
            min={1}
            max={selectedLedger?.remainingBalance || 10000}
            value={payAmount}
            onChange={e => setPayAmount(Number(e.target.value))}
            required
          />

          <Select
            label="Payment Method"
            value={payMethod}
            onChange={e => setPayMethod(e.target.value as any)}
          >
            <option value="payment_cash">Cashier Desk (Cash)</option>
            <option value="payment_online">Online Banking / Wire Transfer</option>
          </Select>

          <Input
            label="Official Receipt (OR) / Reference No."
            value={payRef}
            onChange={e => setPayRef(e.target.value)}
            placeholder="OR-2026-9041"
            required
          />

          <Input
            label="Payment Description / Particulars"
            value={payDesc}
            onChange={e => setPayDesc(e.target.value)}
            placeholder="Midterm Tuition Installment"
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedLedger(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Confirm & Issue Official Receipt
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
