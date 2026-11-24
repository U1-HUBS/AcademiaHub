import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { PageHeader } from '../../components/ui/PageHeader';
import { getSchedulesByTeacher } from '../../services/scheduleService';
import { getAllUsers } from '../../services/userService';
import {
  getGradesBySchedule,
  saveOrUpdateGrade,
  computeFinalRating,
} from '../../services/gradeService';
import { Schedule, UserProfile, StudentGrade } from '../../types';
import { FileCheck, Save, Calculator, CheckCircle, AlertCircle } from 'lucide-react';

interface RowGradeState {
  quizzes: number;
  activities: number;
  midterm: number;
  final: number;
}

export const GradeManagePage: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [gradesMap, setGradesMap] = useState<Record<string, RowGradeState>>({});
  const [savedGrades, setSavedGrades] = useState<Record<string, StudentGrade>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { success, error } = useToast();

  useEffect(() => {
    loadSchedules();
  }, [user]);

  const loadSchedules = async () => {
    if (!user) return;
    try {
      const myScheds = await getSchedulesByTeacher(user.uid);
      setSchedules(myScheds);
      if (myScheds.length > 0) {
        setSelectedSchedule(myScheds[0]);
      }
    } catch (err: any) {
      console.warn('Failed to load schedules:', err);
    }
  };

  useEffect(() => {
    if (selectedSchedule) {
      loadGradeData();
    }
  }, [selectedSchedule]);

  const loadGradeData = async () => {
    if (!selectedSchedule) return;
    try {
      const [allUsers, grades] = await Promise.all([
        getAllUsers(),
        getGradesBySchedule(selectedSchedule.id),
      ]);

      const classStudents = allUsers.filter(u => selectedSchedule.enrolledStudentIds.includes(u.uid));
      setStudents(classStudents);

      const savedMap: Record<string, StudentGrade> = {};
      const stateMap: Record<string, RowGradeState> = {};

      for (const g of grades) {
        savedMap[g.studentId] = g;
      }
      setSavedGrades(savedMap);

      for (const st of classStudents) {
        const existing = savedMap[st.uid];
        stateMap[st.uid] = {
          quizzes: existing?.quizzesScore ?? 85,
          activities: existing?.activitiesScore ?? 88,
          midterm: existing?.midtermGrade ?? 86,
          final: existing?.finalGrade ?? 90,
        };
      }
      setGradesMap(stateMap);
    } catch (err: any) {
      console.warn('Error loading grade data:', err);
    }
  };

  const updateScore = (studentId: string, field: keyof RowGradeState, val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setGradesMap(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: clamped,
      },
    }));
  };

  const handleSaveAllGrades = async () => {
    if (!selectedSchedule || !user) return;
    setIsSubmitting(true);
    try {
      await Promise.all(
        students.map(st => {
          const row = gradesMap[st.uid];
          if (!row) return Promise.resolve();

          return saveOrUpdateGrade({
            scheduleId: selectedSchedule.id,
            subjectCode: selectedSchedule.subjectCode,
            subjectTitle: selectedSchedule.subjectTitle,
            units: selectedSchedule.units || 3,
            studentId: st.uid,
            studentName: st.fullName,
            studentIdNumber: st.idNumber,
            quizzesScore: row.quizzes,
            activitiesScore: row.activities,
            midtermGrade: row.midterm,
            finalGrade: row.final,
            submittedBy: user.fullName,
          });
        })
      );

      success(`Grades submitted for ${selectedSchedule.subjectCode} (${selectedSchedule.sectionName}).`);
      await loadGradeData();
    } catch (err: any) {
      error(err.message || 'Failed to submit grades.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Standardized Page Header */}
      <PageHeader
        title="Student Gradebook"
        subtitle="Component grading formula: Quizzes (20%) + Activities (30%) + Midterm (25%) + Final Exam (25%)."
        badge={<Badge variant="navy">{selectedSchedule ? `${selectedSchedule.subjectCode} - ${selectedSchedule.sectionName}` : 'Select Class'}</Badge>}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveAllGrades}
            isLoading={isSubmitting}
            icon={<Save className="w-4 h-4" />}
          >
            Submit & Compute All Grades
          </Button>
        }
      />

      {/* Class Selector Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="max-w-md w-full">
          <Select
            label="Assigned Course & Section"
            value={selectedSchedule?.id || ''}
            onChange={e => {
              const found = schedules.find(s => s.id === e.target.value);
              setSelectedSchedule(found || null);
            }}
          >
            {schedules.map(sc => (
              <option key={sc.id} value={sc.id}>
                {sc.subjectCode} - {sc.sectionName} ({sc.subjectTitle})
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Passed (&gt;=75%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>Failed (&lt;75%)</span>
          </div>
        </div>
      </div>

      {/* Gradebook Spreadsheet Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-sm text-[#142D59]">
            Gradebook: {selectedSchedule?.subjectCode} ({selectedSchedule?.sectionName})
          </h3>
          <span className="text-xs text-slate-400">{students.length} Students</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-3 text-center">Quizzes (20%)</th>
                <th className="py-3 px-3 text-center">Activities (30%)</th>
                <th className="py-3 px-3 text-center">Midterm (25%)</th>
                <th className="py-3 px-3 text-center">Finals (25%)</th>
                <th className="py-3 px-4 text-center">Final Rating</th>
                <th className="py-3 px-3 text-center">Rating</th>
                <th className="py-3 px-4 text-right">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map(st => {
                const row = gradesMap[st.uid] || { quizzes: 0, activities: 0, midterm: 0, final: 0 };
                const calc = computeFinalRating(row);

                return (
                  <tr key={st.uid} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{st.fullName}</div>
                      <div className="text-xs text-slate-400 font-mono">{st.idNumber}</div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={row.quizzes}
                        onChange={e => updateScore(st.uid, 'quizzes', Number(e.target.value))}
                        className="w-16 text-center py-1 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:border-[#2563EB]"
                      />
                    </td>

                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={row.activities}
                        onChange={e => updateScore(st.uid, 'activities', Number(e.target.value))}
                        className="w-16 text-center py-1 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:border-[#2563EB]"
                      />
                    </td>

                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={row.midterm}
                        onChange={e => updateScore(st.uid, 'midterm', Number(e.target.value))}
                        className="w-16 text-center py-1 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:border-[#2563EB]"
                      />
                    </td>

                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={row.final}
                        onChange={e => updateScore(st.uid, 'final', Number(e.target.value))}
                        className="w-16 text-center py-1 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:border-[#2563EB]"
                      />
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="font-extrabold text-sm text-[#142D59]">
                        {calc.computedRating}%
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                        {calc.letterGrade}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Badge variant={calc.remarks === 'Passed' ? 'success' : 'danger'}>
                        {calc.remarks.toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                );
              })}

              {students.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-sm">
                    No students currently enrolled in this class schedule.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
