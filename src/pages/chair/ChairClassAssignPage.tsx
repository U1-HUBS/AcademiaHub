import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../context/ToastContext';
import {
  getAllSchedules,
  addStudentToSchedule,
  removeStudentFromSchedule,
} from '../../services/scheduleService';
import { getAllPrograms } from '../../services/programService';
import { getAllUsers } from '../../services/userService';
import { Schedule, UserProfile, Program } from '../../types';
import { Users, UserPlus, UserMinus, Clock, MapPin, AlertCircle, ShieldAlert } from 'lucide-react';

export const ChairClassAssignPage: React.FC = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [studentToAssign, setStudentToAssign] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { success, error } = useToast();

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [allScheds, allProgs, allUsers] = await Promise.all([
        getAllSchedules(),
        getAllPrograms(),
        getAllUsers(),
      ]);

      const myProg = allProgs.find(p => p.id === user?.programId || p.chairId === user?.uid) || allProgs[0];
      const progScheds = allScheds.filter(s => s.programId === myProg?.id || s.programCode === myProg?.code);
      const progStudents = allUsers.filter(u => u.role === 'student' && u.status === 'active' && (u.programId === myProg?.id || u.programCode === myProg?.code));

      setSchedules(progScheds);
      setStudents(progStudents);

      if (selectedSchedule) {
        const refreshed = progScheds.find(s => s.id === selectedSchedule.id);
        setSelectedSchedule(refreshed || null);
      } else if (progScheds.length > 0) {
        setSelectedSchedule(progScheds[0]);
      }
    } catch (err: any) {
      console.warn('Failed to load class assignment data:', err);
    }
  };

  const handleAssignStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule || !studentToAssign) {
      error('Please select a student.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addStudentToSchedule(selectedSchedule.id, studentToAssign);
      const st = students.find(s => s.uid === studentToAssign);
      success(`Assigned ${st?.fullName || 'student'} to ${selectedSchedule.subjectCode}.`);
      setIsAssignModalOpen(false);
      setStudentToAssign('');
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to assign student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!selectedSchedule) return;
    if (!confirm(`Remove ${studentName} from ${selectedSchedule.subjectCode} (${selectedSchedule.sectionName})?`)) return;

    try {
      await removeStudentFromSchedule(selectedSchedule.id, studentId);
      success(`Removed ${studentName} from class roster.`);
      await loadData();
    } catch (err: any) {
      error(err.message || 'Failed to remove student.');
    }
  };

  const enrolledStudents = selectedSchedule
    ? students.filter(s => selectedSchedule.enrolledStudentIds.includes(s.uid))
    : [];

  const availableStudents = selectedSchedule
    ? students.filter(s => !selectedSchedule.enrolledStudentIds.includes(s.uid))
    : [];

  const isFull = selectedSchedule ? selectedSchedule.enrolledStudentIds.length >= selectedSchedule.maxCapacity : false;

  return (
    <div className="space-y-6">
      {/* Title & Institutional Rule Notice */}
      <PageHeader
        title="Class Student Assignments"
        subtitle="Manage student rosters and section assignments for approved schedules."
        badge={
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-900">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Schedule Structure Locked by Registrar</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Schedule Selector List */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#142D59]">Select Class Schedule</h3>
            <span className="text-xs text-slate-400">{schedules.length} Classes</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {schedules.map(sched => {
              const active = selectedSchedule?.id === sched.id;
              const full = sched.enrolledStudentIds.length >= sched.maxCapacity;

              return (
                <button
                  key={sched.id}
                  onClick={() => setSelectedSchedule(sched)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    active
                      ? 'bg-blue-50/70 border-[#2563EB] shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[#142D59]">{sched.subjectCode}</span>
                    <Badge variant={full ? 'danger' : 'navy'}>
                      {sched.enrolledStudentIds.length}/{sched.maxCapacity} {full ? 'Full' : ''}
                    </Badge>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-800 mt-1 truncate">{sched.subjectTitle}</h4>
                  <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-2">
                    <span>{sched.sectionName}</span>
                    <span>•</span>
                    <span>{sched.teacherName}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Enrolled Student Roster & Actions */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          {selectedSchedule ? (
            <div className="space-y-6">
              {/* Class Header Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[#142D59]">{selectedSchedule.subjectCode}</h3>
                    <Badge variant="navy">{selectedSchedule.sectionName}</Badge>
                  </div>
                  <p className="text-xs font-medium text-slate-600 mt-0.5">{selectedSchedule.subjectTitle}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {selectedSchedule.days.join(', ')} ({selectedSchedule.startTime} - {selectedSchedule.endTime})
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {selectedSchedule.room}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Capacity</div>
                    <div className={`text-base font-extrabold ${isFull ? 'text-rose-600' : 'text-slate-800'}`}>
                      {selectedSchedule.enrolledStudentIds.length} / {selectedSchedule.maxCapacity}
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isFull}
                    onClick={() => setIsAssignModalOpen(true)}
                    icon={<UserPlus className="w-4 h-4" />}
                  >
                    {isFull ? 'Capacity Reached' : 'Assign Student'}
                  </Button>
                </div>
              </div>

              {/* Enrolled Students Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm text-[#142D59]">Enrolled Students in this Class</h4>
                  <span className="text-xs text-slate-400">{enrolledStudents.length} Students Assigned</span>
                </div>

                {enrolledStudents.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm">
                    No students currently assigned to this class schedule. Click "Assign Student" to enroll students from your program.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-semibold">
                        <tr>
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">ID Number</th>
                          <th className="py-3 px-4">Year Level</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {enrolledStudents.map(st => (
                          <tr key={st.uid} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-bold text-slate-800">{st.fullName}</td>
                            <td className="py-3 px-4 font-mono text-slate-600">{st.idNumber}</td>
                            <td className="py-3 px-4">Year {st.yearLevel || 1}</td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveStudent(st.uid, st.fullName)}
                                className="text-rose-600 hover:text-rose-700"
                                icon={<UserMinus className="w-3.5 h-3.5" />}
                              >
                                Remove
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">Select a schedule from the list to view and manage assigned students.</div>
          )}
        </div>
      </div>

      {/* Assign Student Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Assign Student to ${selectedSchedule?.subjectCode}`}
        subtitle={`Section: ${selectedSchedule?.sectionName} | Current: ${selectedSchedule?.enrolledStudentIds.length}/${selectedSchedule?.maxCapacity}`}
      >
        <form onSubmit={handleAssignStudent} className="space-y-4">
          <Select
            label="Select Available Program Student"
            value={studentToAssign}
            onChange={e => setStudentToAssign(e.target.value)}
            required
          >
            <option value="">Select a student...</option>
            {availableStudents.map(st => (
              <option key={st.uid} value={st.uid}>
                {st.fullName} ({st.idNumber}) - Year {st.yearLevel || 1}
              </option>
            ))}
          </Select>

          {availableStudents.length === 0 && (
            <p className="text-xs text-amber-600">All eligible students in your program are already assigned to this class.</p>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              disabled={availableStudents.length === 0}
            >
              Confirm Student Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
