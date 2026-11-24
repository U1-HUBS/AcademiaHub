import React, { useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { getSchedulesByStudent } from '../../services/scheduleService';
import { getGradesByStudent, calculateCumulativeGPA } from '../../services/gradeService';
import { getStudentAttendanceSummary } from '../../services/attendanceService';
import { getAllAssessments, getSubmissionsByStudent } from '../../services/assessmentService';
import { BookMarked, Award, CalendarCheck, Clock, MapPin, Sparkles, AlertTriangle, Receipt, CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardContent } from '../../components/ui/DashboardContent';
import { useDashboardData } from '../useDashboardData';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const uid = user?.uid;

  const loadDashboard = useCallback(async () => {
    if (!uid) return;
    const [schedules, grades, attendance, assessments, submissions] = await Promise.all([
      getSchedulesByStudent(uid),
      getGradesByStudent(uid),
      getStudentAttendanceSummary(uid),
      getAllAssessments(),
      getSubmissionsByStudent(uid),
    ]);
    const scheduleIds = new Set(schedules.map(schedule => schedule.id));
    return {
      schedules,
      grades,
      attendance,
      assessments: assessments.filter(assessment => scheduleIds.has(assessment.scheduleId)),
      submissions,
    };
  }, [uid]);

  const { data, loading, failed, retry } = useDashboardData(loadDashboard);
  const { schedules = [], grades = [], attendance, assessments = [], submissions = [] } = data ?? {};
  const attendanceRate = attendance?.attendanceRate;
  const hasAttendanceWarning = attendance?.hasWarning ?? false;

  const totalUnits = schedules.reduce((sum, s) => sum + (s.units || 3), 0);
  const { gpa, totalUnits: gradedUnits } = calculateCumulativeGPA(grades);
  const hasAttendanceRecords = Boolean(attendance?.totalSessions);
  const gradeStatus = gpa > 0 && gpa <= 1.75 ? "Dean's Lister" : 'Good Standing';

  const pendingAssignments = assessments.filter(
    a => !submissions.some(sub => sub.assessmentId === a.id)
  );

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        variant="dashboard"
        title="Student Academic Portal"
        subtitle={`${user?.fullName || 'Student'} · ${user?.idNumber || '—'}`}
        badge={user?.programCode && <Badge variant="navy">{user.programCode}</Badge>}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink to="/student/ledger" variant="outline" size="sm" icon={<Receipt className="w-4 h-4" />}>
              Ledger
            </ButtonLink>
            <ButtonLink to="/student/checklist" variant="outline" size="sm" icon={<CheckSquare className="w-4 h-4" />}>
              Checklist
            </ButtonLink>
            <ButtonLink to="/student/schedule" variant="outline" size="sm" icon={<Clock className="w-4 h-4" />}>
              Timetable
            </ButtonLink>
            <ButtonLink to="/student/grades" variant="primary" size="sm" icon={<Award className="w-4 h-4" />}>
              Grade Slip
            </ButtonLink>
          </div>
        }
      />

      <DashboardContent loading={loading} failed={failed} onRetry={retry}>
        {/* Attendance Alert if Below 75% */}
        {hasAttendanceWarning && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-sm">Attendance Warning Alert (&lt;75%)</div>
              <p className="mt-0.5">
                Your overall attendance rate is currently at <strong>{attendanceRate}%</strong>. Institutional academic policy requires a minimum of 75% attendance to maintain regular examination eligibility. Please consult your instructors.
              </p>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid gap-3 min-[360px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <StatCard
            title="Enrolled Units"
            value={`${totalUnits} Units`}
            subtitle={`${schedules.length} Subjects this term`}
            icon={<BookMarked className="w-5 h-5" />}
            color="navy"
          />
          <StatCard
            title="Cumulative GPA"
            value={gradedUnits ? gpa.toFixed(2) : '—'}
            subtitle={gradedUnits ? gradeStatus : 'No grades posted'}
            icon={<Award className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            title="Attendance Rate"
            value={hasAttendanceRecords ? `${attendanceRate}%` : '—'}
            subtitle={hasAttendanceRecords ? '75% minimum' : 'No sessions recorded'}
            icon={<CalendarCheck className="w-5 h-5" />}
            color={hasAttendanceWarning ? 'amber' : 'emerald'}
          />
          <StatCard
            title="Pending Activities"
            value={pendingAssignments.length}
            subtitle="Coursework Due"
            icon={<Sparkles className="w-5 h-5" />}
            color="purple"
          />
        </div>

        {/* Content Grid */}
        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Class Timetable */}
          <div className="xl:col-span-2 portal-panel p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-primary">Class timetable</h2>
                <p className="text-xs text-slate-500">Official scheduled lecture and laboratory slots</p>
              </div>
              <Link to="/student/schedule" className="rounded text-sm font-semibold text-primary-light hover:underline">
                Weekly Schedule
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {schedules.map(sc => (
                <div
                  key={sc.id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-[#142D59]">{sc.subjectCode}</span>
                      <Badge variant="navy">{sc.sectionName}</Badge>
                      <span className="text-xs text-slate-500 font-medium">{sc.units} units</span>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-800 mt-1">{sc.subjectTitle}</h4>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {sc.days.join(', ')} ({sc.startTime} - {sc.endTime})
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {sc.room}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                    <div className="text-slate-400 text-[10px] uppercase font-semibold">Faculty</div>
                    <div className="font-bold text-slate-800">{sc.teacherName}</div>
                  </div>
                </div>
              ))}

              {schedules.length === 0 && (
                <div className="p-8 text-center text-sm leading-relaxed text-slate-600">
                  You are not currently enrolled in any class sections.
                </div>
              )}
            </div>
          </div>

          {/* Pending Coursework & Notices */}
          <div className="portal-panel p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <h2 className="text-base font-semibold text-primary">Upcoming activities</h2>
                <Link to="/student/activities" className="rounded text-sm font-semibold text-primary-light hover:underline">
                  View All
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {pendingAssignments.slice(0, 3).map(asmt => (
                  <div key={asmt.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-xs text-[#142D59]">{asmt.subjectCode}</span>
                      <Badge variant="warning">{asmt.type}</Badge>
                    </div>
                    <h5 className="font-semibold text-xs text-slate-800">{asmt.title}</h5>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Due: {new Date(asmt.dueDate).toLocaleDateString()}</span>
                      <span className="font-bold text-slate-700">{asmt.maxScore} pts</span>
                    </div>
                  </div>
                ))}

                {pendingAssignments.length === 0 && (
                  <div className="p-6 text-center text-sm leading-relaxed text-slate-600">
                    No pending coursework.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <ButtonLink to="/student/activities" variant="outline" size="sm" className="w-full">
                Submit Coursework
              </ButtonLink>
            </div>
          </div>
        </div>
      </DashboardContent>
    </div>
  );
};
