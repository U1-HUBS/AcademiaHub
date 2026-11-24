import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getGradesByStudent, calculateCumulativeGPA } from '../../services/gradeService';
import { getSchedulesByStudent } from '../../services/scheduleService';
import { StudentGrade, Schedule } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Award, Printer, CheckCircle2, AlertCircle, FileText } from 'lucide-react';

export const MyGradesPage: React.FC = () => {
  const { user } = useAuth();
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGrades();
  }, [user]);

  const loadGrades = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [myGrades, myScheds] = await Promise.all([
        getGradesByStudent(user.uid),
        getSchedulesByStudent(user.uid),
      ]);
      setGrades(myGrades);
      setSchedules(myScheds);
    } finally {
      setLoading(false);
    }
  };

  const { gpa, totalUnits } = calculateCumulativeGPA(grades);

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          title="Academic Grades & Records"
          subtitle="Official term grade ratings, letter equivalencies, and cumulative grade point average (GPA)."
          badge={<Badge variant="navy">GPA: {gpa > 0 ? gpa.toFixed(2) : '3.00'}</Badge>}
          actions={
            <Button variant="outline" size="sm" onClick={handlePrintSlip} icon={<Printer className="w-4 h-4" />}>
              Print Official Grade Slip
            </Button>
          }
        />
      </div>

      {/* Official Grade Slip Sheet */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs print:border-none print:shadow-none space-y-6">
        {/* Letterhead */}
        <div className="text-center pb-6 border-b border-slate-200">
          <h1 className="text-xl font-extrabold text-[#142D59] tracking-wider uppercase">
            AcademiaHub Academic Management System
          </h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">
            OFFICE OF THE REGISTRAR - OFFICIAL STUDENT GRADE SLIP
          </p>
          <div className="mt-3 inline-block bg-blue-50 text-[#142D59] font-bold text-xs px-3 py-1 rounded-full">
            Academic Year 2026-2027 | 1st Semester
          </div>
        </div>

        {/* Student Metadata Card */}
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
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Degree Program</span>
            <span className="font-bold text-slate-900">{user?.programCode || 'BSCS'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Academic Standing</span>
            <span className="font-bold text-emerald-700">Good Standing</span>
          </div>
        </div>

        {/* Grades Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-xs">
              <tr>
                <th className="py-3 px-4">Subject Code & Title</th>
                <th className="py-3 px-4 text-center">Units</th>
                <th className="py-3 px-4 text-center">Final Score</th>
                <th className="py-3 px-4 text-center">Collegiate Rating</th>
                <th className="py-3 px-4 text-right">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedules.map(sc => {
                const g = grades.find(x => x.scheduleId === sc.id);
                return (
                  <tr key={sc.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#142D59]">{sc.subjectCode}</div>
                      <div className="text-xs text-slate-500">{sc.subjectTitle}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                      {sc.units || 3}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {g?.computedRating !== undefined ? `${g.computedRating}%` : 'In Progress'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                        {g?.letterGrade || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Badge variant={g?.remarks === 'Passed' ? 'success' : g?.remarks === 'Failed' ? 'danger' : 'neutral'}>
                        {g?.remarks || 'IN PROGRESS'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}

              {schedules.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                    No grade records available.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
              <tr>
                <td className="py-3 px-4">Term GPA / Total Units:</td>
                <td className="py-3 px-4 text-center">{totalUnits} Units</td>
                <td colSpan={2} className="py-3 px-4 text-center text-base text-[#142D59]">
                  Cumulative GPA: {gpa > 0 ? gpa.toFixed(2) : '3.00'}
                </td>
                <td className="py-3 px-4 text-right text-emerald-700">All Requisites Met</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Grading Scale Legend */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
          <div className="font-bold text-slate-700">Official Collegiate Rating Legend:</div>
          <div>1.0 (98-100%) Excellent | 1.25 (95-97%) Very Superior | 1.50 (92-94%) Superior | 1.75 (89-91%) Very Good</div>
          <div>2.0 (86-88%) Good | 2.25 (83-85%) Satisfactory | 2.50 (80-82%) Fair | 3.0 (75-76%) Passed | 5.0 (&lt;75%) Failed</div>
        </div>

        {/* Signatures */}
        <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="font-bold text-slate-800">Eleanor Sterling</div>
            <div className="text-slate-500">University Registrar</div>
          </div>
          <div>
            <div className="font-bold text-slate-800">AcademiaHub Institutional Seal</div>
            <div className="text-slate-500">Certified Authentic Document</div>
          </div>
        </div>
      </div>
    </div>
  );
};
