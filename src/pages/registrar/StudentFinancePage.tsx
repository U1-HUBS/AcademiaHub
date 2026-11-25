import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { getAllPrograms } from '../../services/programService';
import { getAllEnrollments } from '../../services/enrollmentService';
import { getAllUsers } from '../../services/userService';
import { getAllLedgers } from '../../services/ledgerService';
import { getFeeConfigurations } from '../../services/feeService';
import { StudentFinanceView } from './StudentFinanceView';
import type { EnrollmentRecord, Program, StudentLedger, TuitionFeeConfiguration, UserProfile } from '../../types';

export function StudentFinancePage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [ledgers, setLedgers] = useState<StudentLedger[]>([]);
  const [feeConfig, setFeeConfig] = useState<TuitionFeeConfiguration>({ id: 'default', academicYear: '2026-2027', semester: '1st Semester', tuitionPerUnit: 0, laboratoryFeePerSubject: 0, miscellaneousFee: 0, otherCharges: 0, updatedAt: '' });
  const { error } = useToast();
  const load = async () => {
    try {
      const [nextPrograms, nextUsers, nextEnrollments, nextLedgers, fees] = await Promise.all([getAllPrograms(), getAllUsers(), getAllEnrollments(), getAllLedgers(), getFeeConfigurations()]);
      setPrograms(nextPrograms); setUsers(nextUsers); setEnrollments(nextEnrollments); setLedgers(nextLedgers); if (fees[0]) setFeeConfig(fees[0]);
    } catch { error('Could not load student finance records.'); }
  };
  useEffect(() => { void load(); }, []);
  return <div className="space-y-6"><PageHeader title="Student Finance" subtitle="Select a program, find an enrolled student, and review the exact amount due." actions={<Button variant="outline" icon={<RefreshCw className="size-4" />} onClick={() => void load()}>Refresh</Button>} /><StudentFinanceView programs={programs} users={users} enrollments={enrollments} ledgers={ledgers} academicYear={feeConfig.academicYear} semester={feeConfig.semester} onLedgerChange={updated => setLedgers(current => current.some(item => item.id === updated.id) ? current.map(item => item.id === updated.id ? updated : item) : [...current, updated])} /></div>;
}
