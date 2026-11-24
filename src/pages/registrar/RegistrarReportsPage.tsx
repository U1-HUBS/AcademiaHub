import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  generateEnrollmentReport,
  generateTeacherLoadReport,
  generateRoomUtilizationReport,
  EnrollmentReportItem,
  TeacherLoadItem,
  RoomUtilizationItem,
} from '../../services/reportsService';
import { Printer, Download, FileText, Users, Building, GraduationCap } from 'lucide-react';

export const RegistrarReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<'enrollment' | 'load' | 'rooms'>('enrollment');
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentReportItem[]>([]);
  const [loadData, setLoadData] = useState<TeacherLoadItem[]>([]);
  const [roomData, setRoomData] = useState<RoomUtilizationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [e, l, r] = await Promise.all([
        generateEnrollmentReport(),
        generateTeacherLoadReport(),
        generateRoomUtilizationReport(),
      ]);
      setEnrollmentData(e);
      setLoadData(l);
      setRoomData(r);
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
          title="Reports & Analytics"
          subtitle="Official institutional academic reporting, enrollment summaries, faculty load, and room logs."
          actions={
            <Button variant="outline" size="sm" onClick={handlePrint} icon={<Printer className="w-4 h-4" />}>
              Print Report
            </Button>
          }
        />
      </div>

      {/* Report Switcher Tabs (8px rhythm: gap-2) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-print">
        <button
          onClick={() => setReportType('enrollment')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-150 ${
            reportType === 'enrollment'
              ? 'bg-[#142D59] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Official Enrollment Roster</span>
        </button>
        <button
          onClick={() => setReportType('load')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-150 ${
            reportType === 'load'
              ? 'bg-[#142D59] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Faculty Teaching Load</span>
        </button>
        <button
          onClick={() => setReportType('rooms')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
            reportType === 'rooms'
              ? 'bg-[#142D59] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Room Utilization Log</span>
        </button>
      </div>

      {/* Printable Report Paper Layout */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs print:border-none print:shadow-none">
        {/* Official Letterhead Header */}
        <div className="text-center pb-6 border-b border-slate-200">
          <h1 className="text-xl font-extrabold text-[#142D59] tracking-wider uppercase">
            AcademiaHub Academic Management System
          </h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">Office of the University Registrar</p>
          <div className="mt-3 inline-block bg-slate-100 text-[#142D59] font-bold text-xs px-3 py-1 rounded-full">
            {reportType === 'enrollment' && 'Official Enrollment Summary Report'}
            {reportType === 'load' && 'Faculty Teaching Load & Schedule Distribution'}
            {reportType === 'rooms' && 'Classroom & Laboratory Utilization Master Log'}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Generated on {new Date().toLocaleDateString()} | Academic Year 2026-2027 (1st Semester)
          </div>
        </div>

        {/* Content: Enrollment Report */}
        {reportType === 'enrollment' && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-xs">
                <tr>
                  <th className="py-3 px-4">Program</th>
                  <th className="py-3 px-4">Year Level</th>
                  <th className="py-3 px-4">Section Name</th>
                  <th className="py-3 px-4 text-center">Regular</th>
                  <th className="py-3 px-4 text-center">Irregular</th>
                  <th className="py-3 px-4 text-right">Total Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrollmentData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-[#142D59]">{row.programCode} - {row.programName}</td>
                    <td className="py-3 px-4">Year {row.yearLevel}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{row.sectionName}</td>
                    <td className="py-3 px-4 text-center">{row.regularCount}</td>
                    <td className="py-3 px-4 text-center">{row.irregularCount}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-blue-600">{row.totalEnrolled}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 font-bold bg-slate-50 text-slate-800">
                <tr>
                  <td colSpan={5} className="py-3 px-4 text-right">Grand Total Institutional Enrollment:</td>
                  <td className="py-3 px-4 text-right text-base text-[#142D59]">
                    {enrollmentData.reduce((sum, r) => sum + r.totalEnrolled, 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Content: Faculty Load Report */}
        {reportType === 'load' && (
          <div className="mt-6 space-y-4">
            {loadData.map(t => (
              <div key={t.teacherId} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{t.teacherName}</h4>
                    <span className="text-xs text-slate-500 font-mono">{t.idNumber} | {t.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="navy" size="sm">{t.totalClasses} Classes</Badge>
                    <Badge variant="info" size="sm">{t.totalUnits} Teaching Units</Badge>
                  </div>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-slate-500 uppercase font-semibold">
                      <tr>
                        <th className="py-1.5 px-2">Subject</th>
                        <th className="py-1.5 px-2">Section</th>
                        <th className="py-1.5 px-2">Units</th>
                        <th className="py-1.5 px-2">Days & Time</th>
                        <th className="py-1.5 px-2">Room</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {t.classes.map((c, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-2 font-bold text-slate-800">{c.subjectCode}</td>
                          <td className="py-2 px-2">{c.sectionName}</td>
                          <td className="py-2 px-2 font-semibold">{c.units}u</td>
                          <td className="py-2 px-2">{c.days.join(', ')} ({c.time})</td>
                          <td className="py-2 px-2 font-medium text-slate-700">{c.room}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Content: Room Utilization */}
        {reportType === 'rooms' && (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-xs">
                <tr>
                  <th className="py-3 px-4">Room / Facility</th>
                  <th className="py-3 px-4 text-center">Active Schedules</th>
                  <th className="py-3 px-4 text-center">Weekly Hours Booked</th>
                  <th className="py-3 px-4">Assigned Subjects & Sections</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roomData.map((rm, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-[#142D59]">{rm.room}</td>
                    <td className="py-3 px-4 text-center font-semibold">{rm.totalSchedules}</td>
                    <td className="py-3 px-4 text-center text-blue-600 font-bold">{rm.totalHoursPerWeek} hrs/week</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {rm.schedules.map((sc, i) => (
                          <span key={i} className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium">
                            {sc.subjectCode} ({sc.sectionName}) - {sc.days.join('')} {sc.time}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Signature Footer */}
        <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="font-bold text-slate-800">Eleanor Sterling</div>
            <div className="text-slate-500">University Registrar</div>
          </div>
          <div>
            <div className="font-bold text-slate-800">Office of Academic Affairs</div>
            <div className="text-slate-500">Official Stamp & Date</div>
          </div>
        </div>
      </div>
    </div>
  );
};
