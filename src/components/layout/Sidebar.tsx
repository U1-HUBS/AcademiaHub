import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  CalendarDays,
  FolderKanban,
  FileBarChart,
  UserPlus,
  Eye,
  Activity,
  GraduationCap,
  CalendarCheck2,
  FileCheck2,
  ListTodo,
  Megaphone,
  BookMarked,
  Clock,
  Award,
  History,
  Sparkles,
  School,
  Receipt,
  CheckSquare,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface SidebarProps {
  onItemClick?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavSection {
  title: string;
  items: {
    path: string;
    label: string;
    icon: React.ReactNode;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({ onItemClick, collapsed = false, onToggleCollapse }) => {
  const { user } = useAuth();
  const role: UserRole = user?.role || 'student';

  const navSectionsByRole: Record<UserRole, NavSection[]> = {
    registrar: [
      {
        title: 'Overview',
        items: [
          { path: '/registrar/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        ],
      },
      {
        title: 'Administration',
        items: [
          { path: '/registrar/users', label: 'User Accounts', icon: <Users className="w-4 h-4" /> },
          { path: '/registrar/enrollment', label: 'Student Enrollment', icon: <UserPlus className="w-4 h-4" /> },
        ],
      },
      {
        title: 'Academic Structure',
        items: [
          { path: '/registrar/academic', label: 'Academic Management', icon: <FolderKanban className="w-4 h-4" /> },
        ],
      },
      {
        title: 'Records & Reports',
        items: [
          { path: '/registrar/grades', label: 'Grades & Records', icon: <FileCheck2 className="w-4 h-4" /> },
          { path: '/registrar/requests', label: 'Student Requests', icon: <FileCheck2 className="w-4 h-4" /> },
          { path: '/registrar/finance', label: 'Student Finance', icon: <Receipt className="w-4 h-4" /> },
          { path: '/registrar/credentials', label: 'Student Credentials', icon: <ShieldCheck className="w-4 h-4" /> },
          { path: '/registrar/graduation', label: 'Graduation Monitoring', icon: <GraduationCap className="w-4 h-4" /> },
          { path: '/registrar/reports', label: 'Reports & Analytics', icon: <FileBarChart className="w-4 h-4" /> },
        ],
      },
    ],
    program_chair: [
      {
        title: 'Overview',
        items: [
          { path: '/chair/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        ],
      },
      {
        title: 'Department',
        items: [
          { path: '/chair/students', label: 'Student Management', icon: <UserCheck className="w-4 h-4" /> },
          { path: '/chair/schedules', label: 'Class Scheduling', icon: <CalendarDays className="w-4 h-4" /> },
          { path: '/chair/offerings', label: 'Offering Review', icon: <FileCheck2 className="w-4 h-4" /> },
        ],
      },
      {
        title: 'Monitoring & Timetable',
        items: [
          { path: '/chair/schedule-viewer', label: 'Schedule Viewer', icon: <Eye className="w-4 h-4" /> },
          { path: '/chair/monitoring', label: 'Student Monitoring', icon: <Activity className="w-4 h-4" /> },
        ],
      },
      {
        title: 'Analytics',
        items: [
          { path: '/chair/reports', label: 'Department Reports', icon: <FileBarChart className="w-4 h-4" /> },
        ],
      },
    ],
    teacher: [
      {
        title: 'Overview',
        items: [
          { path: '/teacher/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        ],
      },
      {
        title: 'Classroom',
        items: [
          { path: '/teacher/classes', label: 'My Classes', icon: <GraduationCap className="w-4 h-4" /> },
          { path: '/teacher/attendance', label: 'Attendance Management', icon: <CalendarCheck2 className="w-4 h-4" /> },
        ],
      },
      {
        title: 'Academic Performance',
        items: [
          { path: '/teacher/grades', label: 'Gradebook', icon: <FileCheck2 className="w-4 h-4" /> },
          { path: '/teacher/activities', label: 'Coursework & Tasks', icon: <ListTodo className="w-4 h-4" /> },
        ],
      },
      {
        title: 'Communications',
        items: [
          { path: '/teacher/announcements', label: 'Announcements', icon: <Megaphone className="w-4 h-4" /> },
        ],
      },
    ],
    student: [
      {
        title: 'Overview',
        items: [
          { path: '/student/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        ],
      },
      {
        title: 'Academics',
        items: [
          { path: '/student/subjects', label: 'My Subjects', icon: <BookMarked className="w-4 h-4" /> },
          { path: '/student/schedule', label: 'Class Schedule', icon: <Clock className="w-4 h-4" /> },
          { path: '/student/grades', label: 'My Grades', icon: <Award className="w-4 h-4" /> },
          { path: '/student/attendance', label: 'Attendance Records', icon: <History className="w-4 h-4" /> },
        ],
      },
      {
        title: 'Degree & Finance',
        items: [
          { path: '/student/ledger', label: 'Account Ledger', icon: <Receipt className="w-4 h-4" /> },
          { path: '/student/checklist', label: 'Subject Checklist', icon: <CheckSquare className="w-4 h-4" /> },
          { path: '/student/requests', label: 'Registrar Requests', icon: <FileCheck2 className="w-4 h-4" /> },
          { path: '/student/progress', label: 'Progress & Awards', icon: <GraduationCap className="w-4 h-4" /> },
        ],
      },
      {
        title: 'Notices',
        items: [
          { path: '/student/activities', label: 'Activities & Notices', icon: <Sparkles className="w-4 h-4" /> },
        ],
      },
    ],
  };

  const sections = navSectionsByRole[role] || navSectionsByRole.student;

  return (
    <aside className="portal-sidebar relative flex h-full w-full flex-col">
      <div className={`flex min-h-16 shrink-0 items-center border-b border-white/10 px-3 pr-14 lg:pr-3 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="portal-mark grid size-9 shrink-0 place-items-center rounded-lg">
          <School className="size-5" aria-hidden="true" />
        </div>
        {!collapsed && <div className="min-w-0">
          <p className="text-sm font-bold tracking-tight text-white">AUTOMATE</p>
          <p className="mt-0.5 text-xs text-white/75">Academic System</p>
        </div>}
        {onToggleCollapse && !collapsed && <button type="button" onClick={onToggleCollapse} className="ml-auto grid size-9 place-items-center rounded-lg text-white" aria-label="Collapse navigation">
          <PanelLeftClose className="size-4" aria-hidden="true" />
        </button>}
        {onToggleCollapse && collapsed && <button type="button" onClick={onToggleCollapse} className="absolute left-4 top-3 grid size-9 place-items-center rounded-lg text-white" aria-label="Expand navigation">
          <PanelLeftOpen className="size-4" aria-hidden="true" />
        </button>}
      </div>

      <nav aria-label="Workspace" className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-5">
        {sections.map(section => (
          <div key={section.title}>
            {!collapsed && <p className="mb-1.5 px-3 text-xs font-semibold text-white/70">{section.title}</p>}
            <ul className="space-y-1">
              {section.items.map(item => (
                <li key={item.path}>
                  <NavLink title={collapsed ? item.label : undefined} to={item.path} onClick={onItemClick} className={`portal-nav-link flex min-h-10 items-center rounded-lg py-2 text-sm font-medium ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'}`}>
                    <span className="shrink-0" aria-hidden="true">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {false && <div>
        <span>A.Y. 2026–2027</span>
        <span aria-hidden="true">·</span>
        <span>1st Semester</span>
      </div>}
    </aside>
  );
};
