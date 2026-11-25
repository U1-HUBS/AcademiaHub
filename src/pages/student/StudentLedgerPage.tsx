import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStudentLedger, initializeStudentLedger, recalculateStudentLedger } from '../../services/ledgerService';
import { StudentLedger } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  DollarSign,
  CreditCard,
  Receipt,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';

export const StudentLedgerPage: React.FC = () => {
  const { user } = useAuth();
  const [ledger, setLedger] = useState<StudentLedger | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLedger();
  }, [user]);

  const loadLedger = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let data = await getStudentLedger(user.uid);
      if (!data) {
        // Auto-initialize default student ledger
        data = await initializeStudentLedger();
      }
      // Subject assignments can change after the ledger snapshot was created.
      // Reconcile in memory so students see the current assessment without
      // attempting a ledger write (only the registrar may persist recalculations).
      data = await recalculateStudentLedger(data.studentId, data.academicYear, data.semester, false);
      setLedger(data);
    } catch (err: any) {
      console.warn('Failed to load ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="no-print">
        <PageHeader
          title="Student Account Ledger"
          subtitle="Official statement of student account, tuition assessments, payment history, and balance status."
          badge={
            ledger ? (
              <Badge variant={ledger.remainingBalance === 0 ? 'success' : 'warning'}>
                {ledger.remainingBalance === 0 ? 'Account Settled' : 'Balance Outstanding'}
              </Badge>
            ) : undefined
          }
          actions={
            <Button variant="outline" size="sm" onClick={handlePrint} icon={<Printer className="w-4 h-4" />}>
              Print Statement of Account
            </Button>
          }
        />
      </div>

      {/* Financial Status KPI Cards */}
      {ledger && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
          <StatCard
            title="Total Assessment"
            value={formatCurrency(ledger.totalAssessment)}
            subtitle={`Tuition + Misc + Fees`}
            icon={<Receipt className="w-5 h-5" />}
            color="navy"
          />
          <StatCard
            title="Total Payments Made"
            value={formatCurrency(ledger.totalPaid)}
            subtitle={`${ledger.transactions.filter(t => t.type === 'payment').length} Transactions`}
            icon={<CreditCard className="w-5 h-5" />}
            color="emerald"
          />
          <StatCard
            title="Remaining Balance"
            value={formatCurrency(ledger.remainingBalance)}
            subtitle={ledger.remainingBalance === 0 ? 'Account Fully Settled' : 'Outstanding Dues'}
            icon={<DollarSign className="w-5 h-5" />}
            color={ledger.remainingBalance === 0 ? 'blue' : 'amber'}
          />
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Account Standing</span>
            <div className="my-2">
              <Badge
                variant={ledger.status === 'paid' ? 'success' : ledger.status === 'partial' ? 'warning' : 'danger'}
                size="md"
              >
                {ledger.status === 'paid' ? 'FULLY PAID' : ledger.status === 'partial' ? 'PARTIALLY PAID' : 'UNPAID'}
              </Badge>
            </div>
            <span className="text-[11px] text-slate-400">
              Exam Clearance: <strong className={ledger.status === 'unpaid' ? 'text-rose-600' : 'text-emerald-600'}>
                {ledger.status === 'unpaid' ? 'Pending Clearance' : 'Cleared for Exams'}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Printable Official Statement of Account */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs print:border-none print:shadow-none space-y-6">
        {/* Letterhead */}
        <div className="text-center pb-6 border-b border-slate-200">
          <h1 className="text-xl font-extrabold text-[#142D59] tracking-wider uppercase">
            AcademiaHub Academic Management System
          </h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">
            Office of Financial Affairs & Student Accounts
          </p>
          <div className="mt-3 inline-block bg-blue-50 text-[#142D59] font-bold text-xs px-3.5 py-1 rounded-full">
            OFFICIAL STUDENT STATEMENT OF ACCOUNT (LEDGER)
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Generated on {new Date().toLocaleDateString()} | Academic Year 2026-2027 (1st Semester)
          </div>
        </div>

        {/* Student Account Information Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Student Name</span>
            <span className="font-extrabold text-slate-900 text-sm">{user?.fullName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Student ID</span>
            <span className="font-mono font-bold text-slate-900">{user?.idNumber}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Program & Year</span>
            <span className="font-bold text-slate-900">{user?.programCode || 'BSCS'} (Year {user?.yearLevel || 1})</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Billing Status</span>
            <span className={`font-extrabold uppercase ${ledger?.status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
              {ledger?.status || 'Active'}
            </span>
          </div>
        </div>

        {/* Fee Assessment Summary Breakdown */}
        {ledger && (
          <div>
            <h3 className="font-bold text-sm text-[#142D59] mb-3">Officially Enrolled Subjects</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-700 uppercase text-xs font-semibold"><tr><th className="py-2.5 px-4">Subject</th><th className="py-2.5 px-4 text-center">Units</th><th className="py-2.5 px-4 text-right">Tuition</th><th className="py-2.5 px-4 text-right">Laboratory</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{(ledger.subjectCharges || []).map(item => <tr key={item.subjectId}><td className="py-3 px-4"><strong>{item.subjectCode}</strong><div className="text-[11px] text-slate-500">{item.subjectTitle}</div></td><td className="py-3 px-4 text-center">{item.units}</td><td className="py-3 px-4 text-right">{formatCurrency(item.tuition)}</td><td className="py-3 px-4 text-right">{formatCurrency(item.laboratory)}</td></tr>)}</tbody>
              </table>
              {!(ledger.subjectCharges || []).length && <p className="py-5 text-center text-sm text-slate-600">No subject charges are currently assessed.</p>}
            </div>
          </div>
        )}

        {ledger && (
          <div>
            <h3 className="font-bold text-sm text-[#142D59] mb-3">Tuition & Fee Assessment Breakdown</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-700 uppercase text-xs font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Fee Category</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4 text-right">Assessment Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-800">Tuition Fee</td>
                    <td className="py-3 px-4 text-slate-600">Standard course lecture and instructional credit units</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">{formatCurrency(ledger.tuitionFee)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-800">Miscellaneous Fee</td>
                    <td className="py-3 px-4 text-slate-600">Athletics, campus library, student council, and student wellness</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">{formatCurrency(ledger.miscellaneousFee)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-800">Laboratory & Technology Charges</td>
                    <td className="py-3 px-4 text-slate-600">Computing terminal access, high-speed lab equipment, registration</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">{formatCurrency(ledger.otherCharges)}</td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                  <tr>
                    <td colSpan={2} className="py-3 px-4 text-right text-slate-700">Total Assessed Fees:</td>
                    <td className="py-3 px-4 text-right text-base text-[#142D59]">{formatCurrency(ledger.totalAssessment)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Ledger Transaction History Table */}
        {ledger && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-[#142D59]">Payment & Transaction History</h3>
              <span className="text-xs text-slate-400">{ledger.transactions.length} Total Records</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-xs">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Reference No.</th>
                    <th className="py-2.5 px-4">Transaction Details</th>
                    <th className="py-2.5 px-4 text-center">Type</th>
                    <th className="py-2.5 px-4 text-right">Debit (Charge)</th>
                    <th className="py-2.5 px-4 text-right">Credit (Paid)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledger.transactions.map(tx => {
                    const isPayment = tx.type === 'payment';
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-600">{tx.date}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{tx.referenceNo}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{tx.description}</div>
                          <div className="text-[11px] text-slate-400 capitalize">{tx.category.replace('_', ' ')}</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={isPayment ? 'success' : 'neutral'}>
                            {isPayment ? 'PAYMENT' : 'ASSESSMENT'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-800">
                          {!isPayment ? formatCurrency(tx.amount) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {isPayment ? formatCurrency(tx.amount) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-xs sm:text-sm font-bold">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-right text-slate-700">Net Account Summary:</td>
                    <td className="py-3 px-4 text-right font-mono text-[#142D59]">{formatCurrency(ledger.totalAssessment)}</td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700">{formatCurrency(ledger.totalPaid)}</td>
                  </tr>
                  <tr className="bg-blue-50/50">
                    <td colSpan={5} className="py-3 px-4 text-right text-sm font-extrabold text-[#142D59]">
                      Outstanding Remaining Balance:
                    </td>
                    <td className={`py-3 px-4 text-right text-base font-extrabold font-mono ${ledger.remainingBalance === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {formatCurrency(ledger.remainingBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Institutional Authority Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="font-bold text-slate-800">University Bursar / Financial Officer</div>
            <div className="text-slate-500">Official Signature & Validation</div>
          </div>
          <div>
            <div className="font-bold text-slate-800">Office of the Registrar</div>
            <div className="text-slate-500">Official Student Ledger Stamp</div>
          </div>
        </div>
      </div>
    </div>
  );
};
