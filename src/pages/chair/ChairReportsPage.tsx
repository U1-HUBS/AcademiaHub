import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { getAllPrograms, getAllSections } from '../../services/programService';
import { getAllUsers } from '../../services/userService';
import { getAllSchedules } from '../../services/scheduleService';
import { getAllEnrollments } from '../../services/enrollmentService';
import { getAllGrades } from '../../services/gradeService';
import { Program, Section, Schedule, UserProfile, EnrollmentRecord } from '../../types';
import { Printer, Users, Layers, Award, BookOpen } from 'lucide-react';

export const ChairReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [program, setProgram] = useState<Program | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportsData();
  }, [user]);

  const loadReportsData = async () => {
    setLoading(true);
    try {
      const [allProgs, allSecs, allUsers, allEnrs, allScheds] = await Promise.all([
        getAllPrograms(),
        getAllSections(),
        getAllUsers(),
        getAllEnrollments(),
        getAllSchedules(),
      ]);

      const myProg = allProgs.find(p => p.id === user?.programId || p.chairId === user?.uid) || allProgs[0];
      setProgram(myProg);

      if (myProg) {
        setSections(allSecs.filter(s => s.programId === myProg.id));
        setStudents(allUsers.filter(u => u.role === 'student' && (u.programId === myProg.id || u.programCode === myProg.code)));
        setEnrollments(allEnrs.filter(e => e.programId === myProg.id || e.programCode === myProg.code));
        setSchedules(allScheds.filter(s => s.programId === myProg.id || s.programCode === myProg.code));
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          title="Department Reports"
          subtitle={`Program-specific official reports and enrollment census for ${program?.name || 'Department'}.`}
          actions={
            <Button variant="outline" size="sm" onClick={handlePrint} icon={<Printer className="w-4 h-4" />}>
              Print Program Report
            </Button>
          }
        />
      </div>

      {/* Official Printable Report Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs print:border-none print:shadow-none space-y-6">
        <div className="text-center pb-6 border-b border-slate-200">
          <h1 className="text-xl font-extrabold text-[#142D59] tracking-wider uppercase">
            AcademiaHub Academic Management System
          </h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">
            Department of {program?.name || 'Computing'}
          </p>
          <div className="mt-3 inline-block bg-blue-50 text-[#142D59] font-bold text-xs px-3 py-1 rounded-full">
            Official Program Enrollment Roster & Section Allocation Summary
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Academic Term: 2026-2027 (1st Semester) | Program Code: {program?.code}
          </div>
        </div>

        {/* Section Breakdown Table */}
        <div>
          <h3 className="font-bold text-sm text-[#142D59] mb-3">Section Cohort Breakdown</h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-xs">
                <tr>
                  <th className="py-2.5 px-4">Section</th>
                  <th className="py-2.5 px-4">Year Level</th>
                  <th className="py-2.5 px-4">Faculty Adviser</th>
                  <th className="py-2.5 px-4 text-center">Max Capacity</th>
                  <th className="py-2.5 px-4 text-right">Officially Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sections.map(sec => {
                  const secEnrolled = enrollments.filter(e => e.sectionId === sec.id).length;
                  return (
                    <tr key={sec.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-[#142D59]">{sec.name}</td>
                      <td className="py-3 px-4">Year {sec.yearLevel}</td>
                      <td className="py-3 px-4 text-slate-700">{sec.adviserName || 'Unassigned'}</td>
                      <td className="py-3 px-4 text-center font-mono">{sec.maxCapacity}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-blue-600">{secEnrolled}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="py-2.5 px-4 text-right">Total Program Enrollment:</td>
                  <td className="py-2.5 px-4 text-right text-base text-[#142D59]">{enrollments.length} Students</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Enrolled Students Roster */}
        <div>
          <h3 className="font-bold text-sm text-[#142D59] mb-3">Complete Student Registry</h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-2 px-3">Student Name</th>
                  <th className="py-2 px-3">ID Number</th>
                  <th className="py-2 px-3">Section</th>
                  <th className="py-2 px-3">Year</th>
                  <th className="py-2 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrollments.map((enr, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-800">{enr.studentName}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{enr.studentIdNumber}</td>
                    <td className="py-2 px-3">{enr.sectionName}</td>
                    <td className="py-2 px-3">Year {enr.yearLevel}</td>
                    <td className="py-2 px-3 text-right">
                      <span className="font-bold text-emerald-700">{enr.status.toUpperCase()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signature */}
        <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="font-bold text-slate-800">{user?.fullName}</div>
            <div className="text-slate-500">Program Chair, {program?.code}</div>
          </div>
          <div>
            <div className="font-bold text-slate-800">Office of the University Registrar</div>
            <div className="text-slate-500">Official Endorsement & Verification</div>
          </div>
        </div>
      </div>
    </div>
  );
};
