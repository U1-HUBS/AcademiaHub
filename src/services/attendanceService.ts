import { AttendanceSession, AttendanceStudentEntry } from '../types';
import { fetchCollection, saveDoc, updateDocById, deleteDocById } from './storage';

export async function getAllAttendanceSessions(): Promise<AttendanceSession[]> {
  return fetchCollection<AttendanceSession>('attendance');
}

export async function getAttendanceBySchedule(scheduleId: string): Promise<AttendanceSession[]> {
  const all = await getAllAttendanceSessions();
  return all.filter(a => a.scheduleId === scheduleId).sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveAttendanceSession(data: {
  scheduleId: string;
  subjectCode: string;
  sectionName: string;
  date: string;
  topic?: string;
  takenBy: string;
  takenByName: string;
  records: { [studentId: string]: AttendanceStudentEntry };
}): Promise<AttendanceSession> {
  const all = await getAllAttendanceSessions();
  const existing = all.find(a => a.scheduleId === data.scheduleId && a.date === data.date);

  const id = existing ? existing.id : `att-${Date.now().toString(36)}`;
  const session: AttendanceSession = {
    ...data,
    id,
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
  };

  await saveDoc('attendance', id, session);
  return session;
}

export async function deleteAttendanceSession(id: string): Promise<void> {
  await deleteDocById('attendance', id);
}

export interface StudentAttendanceSummary {
  studentId: string;
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  excusedCount: number;
  attendanceRate: number; // percentage (0 - 100)
  hasWarning: boolean; // attendanceRate < 75%
}

export async function getStudentAttendanceSummary(
  studentId: string,
  scheduleId?: string
): Promise<StudentAttendanceSummary> {
  const sessions = await getAllAttendanceSessions();
  const relevant = scheduleId ? sessions.filter(s => s.scheduleId === scheduleId) : sessions;

  let present = 0;
  let late = 0;
  let absent = 0;
  let excused = 0;
  let total = 0;

  for (const session of relevant) {
    const entry = session.records[studentId];
    if (entry) {
      total += 1;
      if (entry.status === 'present') present += 1;
      else if (entry.status === 'late') late += 1;
      else if (entry.status === 'absent') absent += 1;
      else if (entry.status === 'excused') excused += 1;
    }
  }

  // Late counts as 0.5 or present with remark; standard academic practice is: attendance credit = present + late
  const rate = total > 0 ? Math.round(((present + late * 0.75 + excused) / total) * 100) : 100;

  return {
    studentId,
    totalSessions: total,
    presentCount: present,
    lateCount: late,
    absentCount: absent,
    excusedCount: excused,
    attendanceRate: Math.min(100, Math.max(0, rate)),
    hasWarning: total > 0 && rate < 75,
  };
}
