import React, { useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { ButtonLink } from '../../components/ui/Button';
import { getAllPrograms, getAllSections } from '../../services/programService';
import { getAllSchedules } from '../../services/scheduleService';
import { getAllUsers } from '../../services/userService';
import { getAllEnrollments } from '../../services/enrollmentService';
import { Users, BookOpen, Layers, CalendarDays, UserPlus, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardContent } from '../../components/ui/DashboardContent';
import { useDashboardData } from '../useDashboardData';

export const ChairDashboard: React.FC = () => {
  const { user } = useAuth();
  const uid = user?.uid;
  const programId = user?.programId;

  const loadDashboard = useCallback(async () => {
    const [programs, sections, schedules, users, enrollments] = await Promise.all([
      getAllPrograms(),
      getAllSections(),
      getAllSchedules(),
      getAllUsers(),
      getAllEnrollments(),
    ]);
    const program = programs.find(item => item.id === programId || item.chairId === uid) ?? programs[0];
    if (!program) return;

    return {
      program,
      sections: sections.filter(item => item.programId === program.id),
      schedules: schedules.filter(item => item.programId === program.id),
      students: users.filter(item => item.role === 'student' && (item.programId === program.id || item.programCode === program.code)),
      enrollments: enrollments.filter(item => item.programId === program.id || item.programCode === program.code),
    };
  }, [uid, programId]);

  const { data, loading, failed, retry } = useDashboardData(loadDashboard);
  const { program, sections = [], schedules = [], students = [], enrollments = [] } = data ?? {};

  const regularCount = enrollments.filter(e => e.status === 'regular' || e.status === 'enrolled').length;
  const irregularCount = enrollments.filter(e => e.status === 'irregular').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        variant="dashboard"
        title="Program Chair Dashboard"
        subtitle={program ? program.name : 'Track your program’s students, sections, and class schedules.'}
        badge={program && <Badge variant="navy" size="md">{program.code}</Badge>}
        actions={
          <>
            <ButtonLink to="/chair/schedules" variant="primary" size="sm" icon={<UserPlus className="w-4 h-4" />}>
              Assign Students to Classes
            </ButtonLink>
            <ButtonLink to="/chair/schedule-viewer" variant="outline" size="sm" icon={<Eye className="w-4 h-4" />}>
              View Master Timetable
            </ButtonLink>
          </>
        }
      />

      <DashboardContent loading={loading} failed={failed} onRetry={retry}>
        {/* KPI Cards (8px rhythm: gap-6) */}
        <div className="grid gap-3 min-[360px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <StatCard
            title="Program Students"
            value={students.length}
            subtitle={`${enrollments.length} enrollment records`}
            icon={<Users className="w-5 h-5" />}
            color="navy"
          />
          <StatCard
            title="Active Sections"
            value={sections.length}
            subtitle="Cohort Blocks"
            icon={<Layers className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            title="Class Schedules"
            value={schedules.length}
            subtitle="Registrar Created"
            icon={<CalendarDays className="w-5 h-5" />}
            color="emerald"
          />
          <StatCard
            title="Academic Standing"
            value={`${regularCount} Reg`}
            subtitle={`${irregularCount} Irregular`}
            icon={<BookOpen className="w-5 h-5" />}
            color="purple"
          />
        </div>

        {/* Content Grid */}
        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Sections in Program */}
          <div className="portal-panel p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <h2 className="text-base font-semibold text-primary">Program Sections</h2>
              <span className="text-xs text-slate-400">{sections.length} Active</span>
            </div>
            <div className="mt-4 space-y-3">
              {sections.map(sec => (
                <div key={sec.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-[#142D59]">{sec.name}</div>
                    <div className="text-xs text-slate-500">Year Level {sec.yearLevel}</div>
                    <div className="text-[11px] text-slate-400 mt-1">Adviser: {sec.adviserName || 'None'}</div>
                  </div>
                  <Badge variant="navy">{sec.maxCapacity} cap</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Schedules in Program */}
          <div className="xl:col-span-2 portal-panel p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-primary">Active Class Schedules</h2>
                <p className="text-xs text-slate-500">Registrar-scheduled offerings for this curriculum</p>
              </div>
              <Link to="/chair/schedule-viewer" className="rounded text-sm font-semibold text-primary-light hover:underline">
                Full Schedule Viewer
              </Link>
            </div>

            <div className="mt-4 overflow-x-auto rounded" role="region" aria-label="Class schedules" tabIndex={0}>
              <table className="w-full text-left text-xs">
                <caption className="sr-only">Program class schedules</caption>
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th scope="col" className="py-2.5 px-3">Subject</th>
                    <th scope="col" className="py-2.5 px-3">Section</th>
                    <th scope="col" className="py-2.5 px-3">Instructor</th>
                    <th scope="col" className="py-2.5 px-3">Time & Room</th>
                    <th scope="col" className="py-2.5 px-3">Roster</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedules.map(sc => (
                    <tr key={sc.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#142D59]">{sc.subjectCode}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{sc.subjectTitle}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{sc.sectionName}</td>
                      <td className="py-3 px-3 text-slate-600">{sc.teacherName}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{sc.startTime}-{sc.endTime}</div>
                        <div className="text-[10px] text-slate-400">{sc.room} | {sc.days.join(', ')}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-blue-600">
                          {sc.enrolledStudentIds.length} / {sc.maxCapacity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DashboardContent>
    </div>
  );
};
