import {HttpsError} from 'firebase-functions/v2/https';

const round = value => Number(Number(value || 0).toFixed(2));

export function makeLedgerFunctions(db) {
  async function recordPayment(request) {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to record a payment.');
    const caller = (await db.collection('users').doc(request.auth.uid).get()).data();
    if (!caller || caller.status !== 'active' || caller.role !== 'registrar') throw new HttpsError('permission-denied', 'Only Registrars may record payments.');
    const {studentId, amount, method = 'payment_cash', referenceNo = '', description = 'Official payment'} = request.data || {};
    const numericAmount = Number(amount);
    if (typeof studentId !== 'string' || !Number.isFinite(numericAmount) || numericAmount <= 0) throw new HttpsError('invalid-argument', 'A valid student and payment amount are required.');
    const ledgerRef = db.collection('ledgers').doc(studentId);
    const reference = String(referenceNo).trim() || `PAY-${Date.now().toString().slice(-8)}`;
    return db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ledgerRef);
      if (!snapshot.exists) throw new HttpsError('not-found', 'Ledger record not found for student.');
      const ledger = snapshot.data();
      const duplicate = (ledger.transactions || []).find(item => item.type === 'payment' && item.referenceNo === reference);
      if (duplicate) return ledger;
      const now = new Date().toISOString();
      const payment = {id: `tx-pay-${reference}`, date: now.slice(0, 10), referenceNo: reference, type: 'payment', category: method, description, amount: Number(numericAmount.toFixed(2)), academicYear: ledger.academicYear, semester: ledger.semester};
      const totalPaid = Number((Number(ledger.totalPaid || 0) + payment.amount).toFixed(2));
      const remainingBalance = Math.max(0, Number((Number(ledger.totalAssessment || 0) - totalPaid).toFixed(2)));
      const updated = {...ledger, totalPaid, remainingBalance, status: remainingBalance <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid', transactions: [...(ledger.transactions || []), payment], updatedAt: now};
      transaction.set(ledgerRef, updated, {merge: true});
      return updated;
    });
  }
  async function reconcile(request) {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to update a ledger.');
    const {studentId, academicYear, semester} = request.data || {};
    if (typeof studentId !== 'string' || typeof academicYear !== 'string' || typeof semester !== 'string') {
      throw new HttpsError('invalid-argument', 'Student and academic term are required.');
    }
    const caller = (await db.collection('users').doc(request.auth.uid).get()).data();
    if (!caller || caller.status !== 'active' || !['registrar', 'program_chair'].includes(caller.role)) {
      throw new HttpsError('permission-denied', 'Only authorized academic staff may recalculate ledgers.');
    }
    const [studentSnap, ledgerSnap, enrollmentSnap, scheduleSnap, subjectSnap, feeSnap] = await Promise.all([
      db.collection('users').doc(studentId).get(), db.collection('ledgers').doc(studentId).get(),
      db.collection('enrollments').where('studentId', '==', studentId).get(), db.collection('schedules').get(),
      db.collection('subjects').get(), db.collection('feeConfigurations').get(),
    ]);
    const student = studentSnap.data();
    if (!student || student.role !== 'student') throw new HttpsError('not-found', 'Student not found.');
    if (caller.role === 'program_chair' && caller.programId && caller.programId !== student.programId) throw new HttpsError('permission-denied', 'This student is outside your program.');
    const fee = feeSnap.docs.map(item => item.data()).find(item => item.academicYear === academicYear && item.semester === semester) || feeSnap.docs.map(item => item.data()).find(item => item.id === 'default');
    if (!fee) throw new HttpsError('failed-precondition', 'Configure approved tuition rates before assessing students.');
    const schedules = scheduleSnap.docs.map(item => ({id: item.id, ...item.data()})).filter(item => item.enrolledStudentIds?.includes(studentId) && item.academicYear === academicYear && item.semester === semester);
    const subjects = subjectSnap.docs.map(item => ({id: item.id, ...item.data()}));
    const enrolled = schedules.map(schedule => subjects.find(subject => subject.id === schedule.subjectId)).filter(Boolean);
    const enrolledIds = new Set(enrolled.map(subject => subject.id));
    const existing = ledgerSnap.exists ? ledgerSnap.data() : {studentId, studentName: student.fullName, studentIdNumber: student.idNumber, programCode: student.programCode || '', transactions: [], totalPaid: 0};
    const termKey = `${academicYear}-${semester}`;
    const generatedPrefix = `assessment-${studentId}-${termKey}`;
    const oldGenerated = (existing.transactions || []).filter(item => item.id?.startsWith(generatedPrefix));
    const now = new Date().toISOString();
    const subjectCharges = enrolled.map(subject => ({subjectId: subject.id, subjectCode: subject.code, subjectTitle: subject.title, units: Number(subject.units || 0), tuition: round(Number(subject.units || 0) * Number(fee.tuitionPerUnit || 0)), laboratory: round(Number(subject.labHours || 0) > 0 ? Number(fee.laboratoryFeePerSubject || 0) : 0)}));
    const currentCharges = subjectCharges.flatMap(charge => [
      {id: `${generatedPrefix}-tuition-${charge.subjectId}`, date: now.slice(0, 10), referenceNo: `TUITION-${charge.subjectCode}-${termKey}`, type: 'assessment', category: 'tuition', description: `${charge.subjectCode} · ${charge.subjectTitle} (${charge.units} units)`, amount: charge.tuition, academicYear, semester, subjectId: charge.subjectId},
      ...(charge.laboratory ? [{id: `${generatedPrefix}-laboratory-${charge.subjectId}`, date: now.slice(0, 10), referenceNo: `LAB-${charge.subjectCode}-${termKey}`, type: 'assessment', category: 'laboratory', description: `${charge.subjectCode} laboratory fee`, amount: charge.laboratory, academicYear, semester, subjectId: charge.subjectId}] : []),
    ]);
    const semesterCharges = [
      {id: `${generatedPrefix}-miscellaneous`, date: now.slice(0, 10), referenceNo: `MISC-${termKey}`, type: 'assessment', category: 'miscellaneous', description: 'Semester miscellaneous fee', amount: round(fee.miscellaneousFee), academicYear, semester},
      {id: `${generatedPrefix}-other`, date: now.slice(0, 10), referenceNo: `OTHER-${termKey}`, type: 'assessment', category: 'registration', description: 'Other approved semester charges', amount: round(fee.otherCharges), academicYear, semester},
    ];
    const preserved = (existing.transactions || []).filter(item => !item.id?.startsWith(generatedPrefix));
    const historical = oldGenerated.filter(item => !enrolledIds.has(item.subjectId)).map(item => ({...item, voidedAt: item.voidedAt || now, voidReason: 'Subject dropped or no longer officially enrolled.'}));
    const payments = (existing.transactions || []).filter(item => item.type === 'payment' && item.academicYear === academicYear && item.semester === semester);
    const totalAssessment = round([...currentCharges, ...semesterCharges].reduce((sum, item) => sum + item.amount, 0));
    const totalPaid = round(payments.reduce((sum, item) => sum + item.amount, 0));
    const remainingBalance = round(Math.max(0, totalAssessment - totalPaid));
    const updated = {...existing, id: studentId, studentId, studentName: student.fullName, studentIdNumber: student.idNumber, programCode: student.programCode || existing.programCode || '', academicYear, semester, tuitionFee: round(subjectCharges.reduce((sum, item) => sum + item.tuition, 0)), miscellaneousFee: round(fee.miscellaneousFee), otherCharges: round(subjectCharges.reduce((sum, item) => sum + item.laboratory, 0) + Number(fee.otherCharges || 0)), totalAssessment, totalPaid, remainingBalance, status: remainingBalance <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid', subjectCharges, transactions: [...preserved, ...historical, ...currentCharges, ...semesterCharges], updatedAt: now};
    await db.runTransaction(async transaction => { transaction.set(db.collection('ledgers').doc(studentId), updated, {merge: true}); });
    return updated;
  }
  return {reconcile, recordPayment};
}
