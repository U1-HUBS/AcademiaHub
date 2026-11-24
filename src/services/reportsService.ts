import { getAllEnrollments } from './enrollmentService';
import { getAllSchedules } from './scheduleService';
import { getAllUsers } from './userService';
import { getAllPrograms } from './programService';
import { getAllGrades } from './gradeService';
import { getAllAttendanceSessions } from './attendanceService';

export interface EnrollmentReportItem {
  programCode: string;
  programName: string;
  yearLevel: number;
  sectionName: string;
  totalEnrolled: number;
  regularCount: number;
  irregularCount: number;
}

export interface TeacherLoadItem {
  teacherId: string;
  teacherName: string;
  idNumber: string;
  email: string;
  totalClasses: number;
  totalUnits: number;
  classes: {
    subjectCode: string;
    sectionName: string;
    units: number;
    room: string;
    days: string[];
    time: string;
  }[];
}

export interface RoomUtilizationItem {
  room: string;
  totalSchedules: number;
  totalHoursPerWeek: number;
  schedules: {
    subjectCode: string;
    sectionName: string;
    teacherName: string;
    days: string[];
    time: string;
  }[];
}

export async function generateEnrollmentReport(): Promise<EnrollmentReportItem[]> {
  const enrollments = await getAllEnrollments();
  const programs = await getAllPrograms();

  const grouped: Record<string, EnrollmentReportItem> = {};

  for (const enr of enrollments) {
    const key = `${enr.programCode}_${enr.yearLevel}_${enr.sectionName}`;
    if (!grouped[key]) {
      const prog = programs.find(p => p.id === enr.programId || p.code === enr.programCode);
      grouped[key] = {
        programCode: enr.programCode,
        programName: prog?.name || enr.programCode,
        yearLevel: enr.yearLevel,
        sectionName: enr.sectionName,
        totalEnrolled: 0,
        regularCount: 0,
        irregularCount: 0,
      };
    }
    grouped[key].totalEnrolled += 1;
    if (enr.status === 'regular' || enr.status === 'enrolled') {
      grouped[key].regularCount += 1;
    } else if (enr.status === 'irregular') {
      grouped[key].irregularCount += 1;
    }
  }

  return Object.values(grouped).sort((a, b) => a.programCode.localeCompare(b.programCode));
}

export async function generateTeacherLoadReport(): Promise<TeacherLoadItem[]> {
  const users = await getAllUsers();
  const schedules = await getAllSchedules();
  const teachers = users.filter(u => u.role === 'teacher' && u.status === 'active');

  return teachers.map(t => {
    const assigned = schedules.filter(s => s.teacherId === t.uid);
    const totalUnits = assigned.reduce((acc, s) => acc + (s.units || 3), 0);
    return {
      teacherId: t.uid,
      teacherName: t.fullName,
      idNumber: t.idNumber,
      email: t.email,
      totalClasses: assigned.length,
      totalUnits,
      classes: assigned.map(s => ({
        subjectCode: s.subjectCode,
        sectionName: s.sectionName,
        units: s.units || 3,
        room: s.room,
        days: s.days,
        time: `${s.startTime} - ${s.endTime}`,
      })),
    };
  });
}

export async function generateRoomUtilizationReport(): Promise<RoomUtilizationItem[]> {
  const schedules = await getAllSchedules();
  const roomMap: Record<string, RoomUtilizationItem> = {};

  for (const s of schedules) {
    const roomKey = s.room.trim();
    if (!roomMap[roomKey]) {
      roomMap[roomKey] = {
        room: roomKey,
        totalSchedules: 0,
        totalHoursPerWeek: 0,
        schedules: [],
      };
    }

    // Estimate duration in hours
    const [startH, startM] = s.startTime.split(':').map(Number);
    const [endH, endM] = s.endTime.split(':').map(Number);
    const durationHours = (endH * 60 + endM - (startH * 60 + startM)) / 60;
    const weeklyHours = durationHours * (s.days?.length || 1);

    roomMap[roomKey].totalSchedules += 1;
    roomMap[roomKey].totalHoursPerWeek += weeklyHours;
    roomMap[roomKey].schedules.push({
      subjectCode: s.subjectCode,
      sectionName: s.sectionName,
      teacherName: s.teacherName,
      days: s.days,
      time: `${s.startTime} - ${s.endTime}`,
    });
  }

  return Object.values(roomMap).sort((a, b) => a.room.localeCompare(b.room));
}

export async function generateAcademicPerformanceSummary(programId?: string) {
  const grades = await getAllGrades();
  const users = await getAllUsers();
  const students = users.filter(u => u.role === 'student' && (!programId || u.programId === programId));

  const studentGradesMap = students.map(st => {
    const stGrades = grades.filter(g => g.studentId === st.uid);
    const passedCount = stGrades.filter(g => g.remarks === 'Passed').length;
    const failedCount = stGrades.filter(g => g.remarks === 'Failed').length;
    const avgRating =
      stGrades.length > 0
        ? Number((stGrades.reduce((sum, g) => sum + (g.computedRating || 0), 0) / stGrades.length).toFixed(1))
        : 0;

    return {
      studentId: st.uid,
      studentName: st.fullName,
      idNumber: st.idNumber,
      programCode: st.programCode || 'N/A',
      yearLevel: st.yearLevel || 1,
      sectionName: st.sectionName || 'N/A',
      subjectsCount: stGrades.length,
      passedCount,
      failedCount,
      avgRating,
      standing: failedCount === 0 && avgRating >= 85 ? 'Good Standing' : failedCount > 0 ? 'Warning' : 'Regular',
    };
  });

  return studentGradesMap;
}
