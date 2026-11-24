import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { getAllUsers } from '../../services/userService';
import { getAllPrograms, getAllSections } from '../../services/programService';
import { getAllEnrollments } from '../../services/enrollmentService';
import { UserProfile, Program, Section, EnrollmentRecord } from '../../types';
import { UserCheck, Search, Filter, ShieldCheck, Mail, Phone } from 'lucide-react';

export const ChairStudentManagePage: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [program, setProgram] = useState<Program | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allUsers, allPrograms, allSections, allEnrollments] = await Promise.all([
        getAllUsers(),
        getAllPrograms(),
        getAllSections(),
        getAllEnrollments(),
      ]);

      const myProg = allPrograms.find(p => p.id === user?.programId || p.chairId === user?.uid) || allPrograms[0];
      setProgram(myProg);

      if (myProg) {
        const progStudents = allUsers.filter(
          u => u.role === 'student' && (u.programId === myProg.id || u.programCode === myProg.code)
        );
        const progSections = allSections.filter(s => s.programId === myProg.id);
        const progEnrollments = allEnrollments.filter(e => e.programId === myProg.id || e.programCode === myProg.code);

        setStudents(progStudents);
        setSections(progSections);
        setEnrollments(progEnrollments);
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = students.filter(s => {
    const matchesYear = yearFilter === 'all' || s.yearLevel === Number(yearFilter);
    const matchesSection = sectionFilter === 'all' || s.sectionId === sectionFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      s.fullName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.idNumber.toLowerCase().includes(q);

    return matchesYear && matchesSection && matchesSearch;
  });

  const columns = [
    {
      key: 'name',
      header: 'Student Name & Email',
      render: (s: UserProfile) => (
        <div>
          <div className="font-bold text-slate-900">{s.fullName}</div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
            <Mail className="w-3 h-3" />
            <span>{s.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'idNumber',
      header: 'ID Number',
      render: (s: UserProfile) => (
        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
          {s.idNumber}
        </span>
      ),
    },
    {
      key: 'yearLevel',
      header: 'Year Level',
      render: (s: UserProfile) => <Badge variant="navy">Year {s.yearLevel || 1}</Badge>,
    },
    {
      key: 'section',
      header: 'Section',
      render: (s: UserProfile) => <span className="font-semibold text-slate-700">{s.sectionName || 'Unassigned'}</span>,
    },
    {
      key: 'enrollmentStatus',
      header: 'Official Standing',
      render: (s: UserProfile) => {
        const enr = enrollments.find(e => e.studentId === s.uid);
        if (!enr) {
          return <Badge variant="neutral">Not Enrolled</Badge>;
        }
        return (
          <Badge variant={enr.status === 'irregular' ? 'warning' : 'success'}>
            {enr.status.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      header: 'Account Status',
      render: (s: UserProfile) => (
        <Badge variant={s.status === 'active' ? 'success' : 'danger'}>
          {s.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <PageHeader
        title="Student Management"
        subtitle={`Official student roster and academic standing for ${program?.name || 'Department'}`}
        actions={
          <div className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-xs">
            Total Department Students: <span className="text-[#142D59] font-black">{students.length}</span>
          </div>
        }
      />

      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
        <Select
          label="Filter by Year Level"
          value={yearFilter}
          onChange={e => setYearFilter(e.target.value)}
        >
          <option value="all">All Year Levels</option>
          <option value="1">1st Year</option>
          <option value="2">2nd Year</option>
          <option value="3">3rd Year</option>
          <option value="4">4th Year</option>
        </Select>

        <Select
          label="Filter by Section"
          value={sectionFilter}
          onChange={e => setSectionFilter(e.target.value)}
        >
          <option value="all">All Sections</option>
          {sections.map(sec => (
            <option key={sec.id} value={sec.id}>
              {sec.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Table */}
      <Table
        label="Program students"
        data={filtered}
        columns={columns}
        keyExtractor={s => s.uid}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search student by name, email, or student ID..."
      />
    </div>
  );
};
