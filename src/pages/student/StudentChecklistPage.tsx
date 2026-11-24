import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStudentCurriculumProgress, CurriculumProgressSummary } from '../../services/checklistService';
import { ChecklistSubjectItem, SubjectCompletionStatus } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  CircleDashed,
  AlertCircle,
  BookOpen,
  Printer,
  ChevronDown,
  Layers,
  Award,
} from 'lucide-react';

export const StudentChecklistPage: React.FC = () => {
  const { user } = useAuth();
  const [checklist, setChecklist] = useState<CurriculumProgressSummary | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChecklist();
  }, [user]);

  const loadChecklist = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getStudentCurriculumProgress(user.uid, user.programCode || 'BSCS');
      setChecklist(data);
    } catch (err: any) {
      console.warn('Failed to load subject checklist:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const yearLevels = [1, 2, 3, 4];
  const semesters: ('1st Semester' | '2nd Semester')[] = ['1st Semester', '2nd Semester'];

  const getStatusBadge = (status: SubjectCompletionStatus, grade?: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Passed ({grade || '1.0'})</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5" />
            <span>In Progress</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Failed ({grade || '5.0'})</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
            <CircleDashed className="w-3.5 h-3.5 text-slate-400" />
            <span>Not Yet Taken</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="no-print">
        <PageHeader
          title="Curriculum Subject Checklist"
          subtitle="Official degree program roadmap: track completed, enrolled, and remaining curriculum course requirements."
          badge={
            checklist ? (
              <Badge variant="navy">
                {checklist.progressPercentage}% Completed ({checklist.completedUnits} / {checklist.totalCurriculumUnits} Units)
              </Badge>
            ) : undefined
          }
          actions={
            <Button variant="outline" size="sm" onClick={handlePrint} icon={<Printer className="w-4 h-4" />}>
              Print Official Checklist
            </Button>
          }
        />
      </div>

      {/* Curriculum Overall Progress Bar Card */}
      {checklist && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 no-print">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Degree Completion Status
              </span>
              <h3 className="text-xl font-extrabold text-[#142D59] mt-0.5">
                {user?.programCode || 'BSCS'} Curriculum Progress: {checklist.progressPercentage}%
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-[#2563EB]">
                {checklist.completedUnits} of {checklist.totalCurriculumUnits} Units Completed
              </span>
              <span className="text-xs text-slate-400 block">{checklist.remainingUnits} Units Remaining</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200">
            <div
              className="bg-gradient-to-r from-[#142D59] to-[#2563EB] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, checklist.progressPercentage)}%` }}
            />
          </div>

          {/* Counters Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Curriculum</span>
              <span className="text-lg font-extrabold text-slate-800">{checklist.totalCurriculumUnits} Units</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Units Earned</span>
              <span className="text-lg font-extrabold text-emerald-700">{checklist.completedUnits} Units</span>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
              <span className="text-[10px] uppercase font-bold text-blue-800 block">Currently Enrolled</span>
              <span className="text-lg font-extrabold text-blue-700">{checklist.inProgressUnits} Units</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">Remaining Required</span>
              <span className="text-lg font-extrabold text-amber-700">{checklist.remainingUnits} Units</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-print">
        {[
          { key: 'all', label: 'All Subjects' },
          { key: 'completed', label: 'Completed (Passed)' },
          { key: 'in_progress', label: 'In Progress' },
          { key: 'not_taken', label: 'Not Yet Taken' },
          { key: 'failed', label: 'Failed' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
              filterStatus === tab.key
                ? 'bg-[#142D59] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Curriculum Breakdown by Year Level & Semester */}
      {checklist && (
        <div className="space-y-6">
          {yearLevels.map(year => {
            const yearSubjects = checklist.subjects.filter(s => s.yearLevel === year);
            if (yearSubjects.length === 0) return null;

            return (
              <div
                key={year}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs print:border-none print:shadow-none space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-[#142D59] text-white flex items-center justify-center font-bold text-xs">
                      Y{year}
                    </span>
                    <div>
                      <h3 className="font-bold text-base text-[#142D59]">Year Level {year}</h3>
                      <span className="text-xs text-slate-400">Curriculum Stage {year}</span>
                    </div>
                  </div>
                  <Badge variant="navy">
                    {yearSubjects.filter(s => s.status === 'completed').length} of {yearSubjects.length} Completed
                  </Badge>
                </div>

                {semesters.map(sem => {
                  const semSubjects = yearSubjects.filter(s => s.semester === sem);
                  const filtered = semSubjects.filter(s => {
                    if (filterStatus === 'all') return true;
                    return s.status === filterStatus;
                  });

                  if (filtered.length === 0 && filterStatus !== 'all') return null;

                  return (
                    <div key={sem} className="space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg">
                        {sem}
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs sm:text-sm">
                          <thead className="bg-slate-50/70 text-slate-600 text-xs font-semibold uppercase">
                            <tr>
                              <th className="py-2.5 px-4">Subject Code</th>
                              <th className="py-2.5 px-4">Descriptive Title</th>
                              <th className="py-2.5 px-4 text-center">Units</th>
                              <th className="py-2.5 px-4">Prerequisites</th>
                              <th className="py-2.5 px-4 text-right">Status & Grade</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filtered.map(sub => (
                              <tr key={sub.id} className="hover:bg-slate-50/70">
                                <td className="py-3 px-4 font-bold text-[#142D59] font-mono">{sub.code}</td>
                                <td className="py-3 px-4 font-medium text-slate-800">{sub.title}</td>
                                <td className="py-3 px-4 text-center font-semibold text-slate-700">{sub.units}</td>
                                <td className="py-3 px-4 text-slate-500">
                                  {sub.prerequisites && sub.prerequisites.length > 0 ? (
                                    <span className="text-xs text-blue-700 font-mono font-medium">
                                      {sub.prerequisites.join(', ')}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-xs">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  {getStatusBadge(sub.status, sub.grade)}
                                </td>
                              </tr>
                            ))}
                            {filtered.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-4 text-center text-slate-400 text-xs">
                                  No subjects matching current filter.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
