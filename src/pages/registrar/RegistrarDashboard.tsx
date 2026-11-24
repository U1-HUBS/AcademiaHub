import React from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { RoleBadge } from '../../components/ui/RoleBadge';
import { ButtonLink } from '../../components/ui/Button';
import { getAllUsers } from '../../services/userService';
import { getAllPrograms } from '../../services/programService';
import { getAllSchedules } from '../../services/scheduleService';
import { getAllEnrollments } from '../../services/enrollmentService';
import {
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  ShieldCheck,
  UserPlus,
  PlusCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardContent } from '../../components/ui/DashboardContent';
import { useDashboardData } from '../useDashboardData';

const loadDashboard = async () => {
  const [users, programs, schedules, enrollments] = await Promise.all([
    getAllUsers(),
    getAllPrograms(),
    getAllSchedules(),
    getAllEnrollments(),
  ]);
  return {
    users,
    programs,
    schedules,
    enrolledCount: enrollments.filter(record => record.status === 'enrolled' || record.status === 'regular').length,
  };
};

export const RegistrarDashboard: React.FC = () => {
  const { data, loading, failed, retry } = useDashboardData(loadDashboard);
  const { users = [], programs = [], schedules = [], enrolledCount = 0 } = data ?? {};

  const studentCount = users.filter(u => u.role === 'student' && u.status === 'active').length;
  const teacherCount = users.filter(u => u.role === 'teacher' && u.status === 'active').length;
  const chairCount = users.filter(u => u.role === 'program_chair' && u.status === 'active').length;
  const totalCapacity = schedules.reduce((sum, s) => sum + s.maxCapacity, 0);
  const totalEnrolledInClasses = schedules.reduce((sum, s) => sum + s.enrolledStudentIds.length, 0);
  const capacityRate = totalCapacity > 0 ? Math.round((totalEnrolledInClasses / totalCapacity) * 100) : 0;

  const recentUsers = [...users].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page Title & Action */}
      <PageHeader
        variant="dashboard"
        title="Registrar Dashboard"
        subtitle="Manage enrollment, accounts, programs, and class schedules."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            <span>Master Admin</span>
          </span>
        }
        actions={
          <>
            <ButtonLink to="/registrar/users" variant="outline" size="sm" icon={<UserPlus className="w-4 h-4" />}>
              Add User
            </ButtonLink>
            <ButtonLink to="/registrar/schedules" variant="primary" size="sm" icon={<PlusCircle className="w-4 h-4" />}>
              New Schedule
            </ButtonLink>
          </>
        }
      />

      <DashboardContent loading={loading} failed={failed} onRetry={retry}>
        {/* KPI Stats Grid (8px grid: gap-6) */}
        <div className="grid gap-3 min-[360px]:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          <StatCard
            title="Active Students"
            value={studentCount}
            subtitle={`${enrolledCount} officially enrolled`}
            icon={<Users className="w-5 h-5" />}
            color="navy"
            />
          <StatCard
            title="Faculty Instructors"
            value={teacherCount}
            subtitle={`${chairCount} Program Chairs`}
            icon={<GraduationCap className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            title="Academic Programs"
            value={programs.length}
            subtitle="Institutional curricula"
            icon={<BookOpen className="w-5 h-5" />}
            color="emerald"
          />
          <StatCard
            title="Class Sections & Load"
            value={schedules.length}
            subtitle={totalCapacity ? `${capacityRate}% of seats filled` : 'No class capacity recorded'}
            icon={<CalendarDays className="w-5 h-5" />}
            color="amber"
          />
        </div>

        {/* Overview Cards */}
        <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Programs Overview */}
          <div className="xl:col-span-1 portal-panel p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <h2 className="text-base font-semibold text-primary">Academic Programs</h2>
              <Link to="/registrar/programs-sections" className="rounded text-sm font-semibold text-primary-light hover:underline">
                Manage
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {programs.length === 0 && <p className="py-3 text-sm text-slate-600">No academic programs yet.</p>}
              {programs.map(prog => (
                <div key={prog.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#142D59]">{prog.code}</span>
                    <Badge variant={prog.active ? "success" : "neutral"}>{prog.active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <p className="break-words text-sm text-slate-700">{prog.name}</p>
                  <span className="mt-0.5 text-xs text-slate-600">Chair: {prog.chairName || 'Unassigned'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recently Created Accounts Table */}
          <div className="xl:col-span-2 portal-panel p-4 sm:p-5 flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-primary">Recently Provisioned Accounts</h2>
                <p className="text-xs text-slate-500">Most recently created accounts</p>
              </div>
              <Link to="/registrar/users" className="rounded text-sm font-semibold text-primary-light hover:underline">
                View All Users
              </Link>
            </div>

            <div className="mt-4 overflow-x-auto rounded" role="region" aria-label="Recent accounts" tabIndex={0}>
              <table className="w-full text-left text-xs">
                <caption className="sr-only">Recently provisioned accounts</caption>
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th scope="col" className="py-2.5 px-3">User</th>
                    <th scope="col" className="py-2.5 px-3">ID Number</th>
                    <th scope="col" className="py-2.5 px-3">Role</th>
                    <th scope="col" className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentUsers.length === 0 && <tr><td colSpan={4} className="p-4 text-sm text-slate-600">No accounts to show.</td></tr>}
                  {recentUsers.map(u => (
                    <tr key={u.uid} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{u.fullName}</div>
                        <div className="text-xs text-slate-600">{u.email}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">{u.idNumber}</td>
                      <td className="py-3 px-3">
                        <RoleBadge role={u.role} size="sm" />
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant={u.status === 'active' ? 'success' : 'danger'}>
                          {u.status}
                        </Badge>
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
