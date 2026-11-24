import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { getAllUsers } from '../../services/userService';
import { getAllPrograms } from '../../services/programService';
import { getAllGrades } from '../../services/gradeService';
import { getAllAttendanceSessions, getStudentAttendanceSummary } from '../../services/attendanceService';
import { UserProfile, Program, StudentGrade } from '../../types';
import { Activity, AlertTriangle, CheckCircle2, TrendingUp, Search, User } from 'lucide-react';

interface StudentMonitorRecord {
  uid: string;
  fullName: string;
  idNumber: string;
  yearLevel: number;
  sectionName: string;
  attendanceRate: number;
  hasAttendanceWarning: boolean;
  totalSubjects: number;
  passedSubjects: number;
  failedSubjects: number;
  averageGrade: number;
  academicStanding: 'Honor' | 'Good Standing' | 'At Risk' | 'Probation';
}

export const ChairStudentMonitorPage: React.FC = () => {
  const { user } = useAuth();
  const [monitorRecords, setMonitorRecords] = useState<StudentMonitorRecord[]>([]);
  const [program, setProgram] = useState<Program | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMonitoringData();
  }, [user]);

  const loadMonitoringData = async () => {
    setLoading(true);
    try {
      const [allUsers, allProgs, allGrades] = await Promise.all([
        getAllUsers(),
        getAllPrograms(),
        getAllGrades(),
      ]);

      const myProg = allProgs.find(p => p.id === user?.programId || p.chairId === user?.uid) || allProgs[0];
      setProgram(myProg);

      if (myProg) {
        const progStudents = allUsers.filter(
          u => u.role === 'student' && (u.programId === myProg.id || u.programCode === myProg.code)
        );

        const records: StudentMonitorRecord[] = await Promise.all(
          progStudents.map(async st => {
            const att = await getStudentAttendanceSummary(st.uid);
            const stGrades = allGrades.filter(g => g.studentId === st.uid);
            const passed = stGrades.filter(g => g.remarks === 'Passed').length;
            const failed = stGrades.filter(g => g.remarks === 'Failed').length;
            const avg =
              stGrades.length > 0
                ? Number((stGrades.reduce((sum, g) => sum + (g.computedRating || 0), 0) / stGrades.length).toFixed(1))
                : 0;

            let standing: StudentMonitorRecord['academicStanding'] = 'Good Standing';
            if (failed > 0 || att.hasWarning) {
              standing = failed >= 2 ? 'Probation' : 'At Risk';
            } else if (avg >= 90 && stGrades.length >= 2) {
              standing = 'Honor';
            }

            return {
              uid: st.uid,
              fullName: st.fullName,
              idNumber: st.idNumber,
              yearLevel: st.yearLevel || 1,
              sectionName: st.sectionName || 'N/A',
              attendanceRate: att.attendanceRate,
              hasAttendanceWarning: att.hasWarning,
              totalSubjects: stGrades.length,
              passedSubjects: passed,
              failedSubjects: failed,
              averageGrade: avg,
              academicStanding: standing,
            };
          })
        );

        setMonitorRecords(records);
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = monitorRecords.filter(r => {
    const matchesFilter =
      statusFilter === 'all'
        ? true
        : statusFilter === 'warning'
        ? r.hasAttendanceWarning || r.failedSubjects > 0
        : r.academicStanding.toLowerCase() === statusFilter.toLowerCase();

    const q = searchTerm.toLowerCase();
    const matchesSearch =
      r.fullName.toLowerCase().includes(q) ||
      r.idNumber.toLowerCase().includes(q) ||
      r.sectionName.toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  const columns = [
    {
      key: 'name',
      header: 'Student Name & ID',
      render: (r: StudentMonitorRecord) => (
        <div>
          <div className="font-bold text-slate-900">{r.fullName}</div>
          <div className="text-xs text-slate-400 font-mono">{r.idNumber}</div>
        </div>
      ),
    },
    {
      key: 'section',
      header: 'Section & Year',
      render: (r: StudentMonitorRecord) => (
        <div>
          <span className="font-semibold text-slate-700">{r.sectionName}</span>
          <span className="text-xs text-slate-400 ml-1.5">(Yr {r.yearLevel})</span>
        </div>
      ),
    },
    {
      key: 'attendance',
      header: 'Attendance History',
      render: (r: StudentMonitorRecord) => (
        <div className="flex items-center gap-2">
          <span
            className={`font-extrabold text-xs px-2.5 py-1 rounded-md ${
              r.hasAttendanceWarning
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {r.attendanceRate}%
          </span>
          {r.hasAttendanceWarning && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
              <AlertTriangle className="w-3.5 h-3.5" />
              Low (&lt;75%)
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'grades',
      header: 'Academic Performance',
      render: (r: StudentMonitorRecord) => (
        <div>
          <div className="font-bold text-xs text-slate-800">
            Avg: {r.averageGrade > 0 ? `${r.averageGrade}%` : 'Pending'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Passed: {r.passedSubjects} | Failed: {r.failedSubjects}
          </div>
        </div>
      ),
    },
    {
      key: 'standing',
      header: 'Standing',
      render: (r: StudentMonitorRecord) => {
        const variantMap: Record<string, 'success' | 'warning' | 'danger' | 'navy'> = {
          Honor: 'navy',
          'Good Standing': 'success',
          'At Risk': 'warning',
          Probation: 'danger',
        };
        return <Badge variant={variantMap[r.academicStanding] || 'neutral'}>{r.academicStanding}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Academic Monitoring"
        subtitle="Real-time tracking of attendance rates, grade performance, and identification of at-risk students."
        badge={
          <Badge variant="danger" size="md">
            {monitorRecords.filter(r => r.hasAttendanceWarning || r.failedSubjects > 0).length} At-Risk Students
          </Badge>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'All Students' },
          { key: 'warning', label: 'At Risk & Warnings' },
          { key: 'honor', label: 'Honor Standing' },
          { key: 'good standing', label: 'Good Standing' },
          { key: 'probation', label: 'Probation' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              statusFilter === tab.key
                ? 'bg-[#142D59] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <Table
        label="Student monitoring records"
        data={filtered}
        columns={columns}
        keyExtractor={r => r.uid}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search student by name or ID number..."
      />
    </div>
  );
};
