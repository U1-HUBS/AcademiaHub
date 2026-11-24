import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export const STUDENT_DOMAIN = 'students.academiahub.invalid';
const STAFF_ROLES = ['registrar', 'program_chair', 'teacher'];
const STATUSES = ['enrolled', 'regular', 'irregular', 'dropped', 'graduated'];
const SEMESTERS = ['1st Semester', '2nd Semester', 'Summer'];

export function temporaryPassword() {
  return 'A9!' + randomBytes(18).toString('base64url') + 'z';
}

export function normalizeStudentId(value) {
  const id = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (id.length < 3 || id.length > 40 || !/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(id)) {
    throw new HttpsError('invalid-argument', 'Enter a valid Student ID Number.');
  }
  return id;
}

export function studentEmail(id) {
  return normalizeStudentId(id).toLowerCase() + '@' + STUDENT_DOMAIN;
}

function text(value, label, max = 120, optional = false) {
  const cleaned = typeof value === 'string' ? value.trim() : '';
  if ((!optional && !cleaned) || cleaned.length > max) {
    throw new HttpsError('invalid-argument', 'Check the ' + label + '.');
  }
  return cleaned;
}

function email(value, optional = false) {
  const result = text(value, 'email address', 254, optional).toLowerCase();
  if (result && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result) || result.endsWith('@' + STUDENT_DOMAIN))) {
    throw new HttpsError('invalid-argument', 'Enter a valid contact or staff email address.');
  }
  return result;
}

function documentId(value, label) {
  const result = text(value, label, 128);
  if (result.includes('/') || result === '.' || result === '..') {
    throw new HttpsError('invalid-argument', 'Invalid ' + label + '.');
  }
  return result;
}

function person(input, optionalEmail = false) {
  const firstName = text(input.firstName, 'first name');
  const lastName = text(input.lastName, 'last name');
  return {firstName, lastName, fullName: firstName + ' ' + lastName, email: email(input.email, optionalEmail),
    phone: text(input.phone, 'phone number', 40, true)};
}

function password(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128 ||
    !/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9\s]/.test(value)) {
    throw new HttpsError('invalid-argument', 'Use 12–128 characters with uppercase, lowercase, a number, and a symbol.');
  }
  return value;
}

function nowIso() {
  return new Date().toISOString();
}

function hash(key) {
  return createHash('sha256').update(key).digest('hex').slice(0, 32);
}

function academicInput(input) {
  const yearLevel = input.yearLevel;
  const academicYear = text(input.academicYear, 'academic year', 9);
  if (!Number.isInteger(yearLevel) || yearLevel < 1 || yearLevel > 4 ||
    !/^\d{4}-\d{4}$/.test(academicYear) ||
    Number(academicYear.slice(0, 4)) + 1 !== Number(academicYear.slice(5)) ||
    !SEMESTERS.includes(input.semester) || !STATUSES.includes(input.status)) {
    throw new HttpsError('invalid-argument', 'Check the year level, academic year, semester, and status.');
  }
  return {programId: documentId(input.programId, 'program'), sectionId: documentId(input.sectionId, 'section'),
    yearLevel, academicYear, semester: input.semester, status: input.status};
}

function academicDetails(program, section, academic) {
  if (!program.exists || !section.exists || section.get('programId') !== academic.programId ||
    section.get('yearLevel') !== academic.yearLevel) {
    throw new HttpsError('failed-precondition', 'Choose a section in the selected program and year level.');
  }
  return {...academic, programCode: program.get('code'), sectionName: section.get('name')};
}

function initialLedger(student, details = {}) {
  const academicYear = details.academicYear ?? '2026-2027';
  const semester = details.semester ?? '1st Semester';
  const now = nowIso();
  const components = [
    ['tuition', 'Tuition Fee Assessment (18 Units @ $350/unit)', 6300],
    ['miscellaneous', 'Standard Miscellaneous & Institutional Facilities Fee', 450],
    ['laboratory', 'Computing & Terminal Laboratory Fee', 350],
    ['registration', 'Official Semester Registration Fee', 200],
  ];
  const total = components.reduce((sum, item) => sum + item[2], 0);
  return {
    id: student.uid, studentId: student.uid, studentName: student.fullName, studentIdNumber: student.idNumber,
    programCode: student.programCode || 'BSCS', academicYear, semester,
    tuitionFee: 6300, miscellaneousFee: 450, otherCharges: 550, totalAssessment: total,
    totalPaid: 0, remainingBalance: total, status: 'unpaid', updatedAt: now,
    transactions: components.map(([category, description, amount]) => {
      const id = randomUUID();
      return {id, date: now.slice(0, 10), referenceNo: 'ASSESS-' + id.slice(0, 8),
        type: 'assessment', category, description, amount, academicYear, semester};
    }),
  };
}

export function makeAccounts(db, auth, verifyCurrentPassword) {
  const users = db.collection('users');
  const enrollments = db.collection('enrollments');
  const ledgers = db.collection('ledgers');
  const studentIds = db.collection('studentAccountIds');
  const bootstrap = db.doc('system/bootstrap');

  async function existingAuth(uid) {
    try { return await auth.getUser(uid); }
    catch (error) {
      if (error.code === 'auth/user-not-found') return null;
      throw error;
    }
  }

  async function lock(uid, run) {
    const ref = db.collection('accountOperations').doc(uid);
    const lease = randomUUID();
    await db.runTransaction(async tx => {
      const old = await tx.get(ref);
      if (old.exists && old.get('expiresAt').toMillis() > Date.now()) {
        throw new HttpsError('aborted', 'Another account operation is running. Try again shortly.');
      }
      tx.set(ref, {lease, expiresAt: Timestamp.fromMillis(Date.now() + 180_000)});
    });
    try {
      return await run();
    } finally {
      await db.runTransaction(async tx => {
        const current = await tx.get(ref);
        if (current.get('lease') === lease) tx.delete(ref);
      }).catch(() => {}); // An expired lease can be replaced on retry.
    }
  }

  async function requireUser(request, role, allowPending = false) {
    const token = request.rawRequest.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!request.auth || !token) throw new HttpsError('unauthenticated', 'Sign in again to continue.');
    let decoded;
    try { decoded = await auth.verifyIdToken(token, true); }
    catch { throw new HttpsError('unauthenticated', 'Sign in again to continue.'); }
    const profile = (await users.doc(decoded.uid).get()).data();
    if (!profile || profile.status !== 'active' || (role && profile.role !== role)) {
      throw new HttpsError('permission-denied', 'Your account does not have permission for this action.');
    }
    if (profile.studentIdLogin && decoded.email !== profile.studentAuthEmail) {
      throw new HttpsError('permission-denied', 'Sign in with your Student ID.');
    }
    if (!allowPending && (profile.mustChangePassword === true ||
      (profile.credentialsValidAfter && decoded.auth_time <= profile.credentialsValidAfter))) {
      throw new HttpsError('permission-denied', 'Change your password or sign in again to continue.');
    }
    return decoded.uid;
  }

  async function checkId(tx, studentId, uid) {
    const index = await tx.get(studentIds.doc(studentId));
    if (index.exists && index.get('uid') !== uid) {
      throw new HttpsError('already-exists', 'This Student ID Number is already assigned to another student.');
    }
    const possibleIds = [...new Set([studentId, studentId.toLowerCase()])];
    const [profiles, records] = await Promise.all([
      tx.get(users.where('idNumber', 'in', possibleIds)),
      tx.get(enrollments.where('studentIdNumber', 'in', possibleIds)),
    ]);
    if (profiles.docs.some(doc => doc.id !== uid) || records.docs.some(doc => doc.get('studentId') !== uid)) {
      throw new HttpsError('already-exists', 'This Student ID Number is already assigned. Check the existing records.');
    }
  }

  async function stageAuth(uid, loginEmail, fullName, initialPassword) {
    const previous = await existingAuth(uid);
    if (previous) {
      if (previous.email !== loginEmail || !previous.disabled) {
        throw new HttpsError('already-exists', 'A Firebase account already exists for this sign-in. Check the existing record.');
      }
      await auth.updateUser(uid, {password: initialPassword, displayName: fullName});
      return;
    }
    await auth.createUser({uid, email: loginEmail, displayName: fullName, password: initialPassword, disabled: true});
  }

  async function enroll(request) {
    await requireUser(request, 'registrar');
    const input = request.data ?? {};
    const academic = academicInput(input);
    const existingUid = input.studentUid ? documentId(input.studentUid, 'student account') : null;
    const details = existingUid ? null : person(input.student ?? {}, true);
    const idNumber = existingUid ? null : normalizeStudentId(input.student?.idNumber);
    const uid = existingUid ?? 'student-' + hash(idNumber);
    const userRef = users.doc(uid);
    return lock(uid, async () => {
      const prepared = await db.runTransaction(async tx => {
        const [snapshot, program, section, studentTerms] = await Promise.all([
          tx.get(userRef), tx.get(db.collection('programs').doc(academic.programId)),
          tx.get(db.collection('sections').doc(academic.sectionId)),
          tx.get(enrollments.where('studentId', '==', uid)),
        ]);
        if (existingUid && (!snapshot.exists || snapshot.get('role') !== 'student' || snapshot.get('status') !== 'active')) {
          throw new HttpsError('not-found', 'The existing student account is unavailable.');
        }
        if (!existingUid && snapshot.exists) {
          throw new HttpsError('already-exists', 'This student exists. Choose the existing student when enrolling them.');
        }
        const editId = input.enrollmentId ? documentId(input.enrollmentId, 'enrollment') : null;
        const editing = editId && studentTerms.docs.find(doc => doc.id === editId);
        if (editId && !editing) throw new HttpsError('not-found', 'The enrollment record no longer exists.');
        if (studentTerms.docs.some(doc => doc.id !== editId && doc.get('academicYear') === academic.academicYear &&
          doc.get('semester') === academic.semester)) {
          throw new HttpsError('already-exists', 'This student is already enrolled for the selected term.');
        }
        const canonicalId = idNumber ?? normalizeStudentId(snapshot.get('idNumber'));
        await checkId(tx, canonicalId, uid);
        const assignment = academicDetails(program, section, academic);
        return {snapshot: snapshot.data(), editId, previous: editing?.data(), canonicalId, assignment};
      });
      const currentAuth = existingUid ? await existingAuth(uid) : null;
      const initialPassword = !prepared.editId && !currentAuth ? temporaryPassword() : null;
      const student = prepared.snapshot ?? {...details, uid, idNumber: prepared.canonicalId, role: 'student', createdAt: nowIso(), status: 'active'};
      if (initialPassword) await stageAuth(uid, studentEmail(prepared.canonicalId), student.fullName, initialPassword);
      const {programId, programCode, yearLevel, sectionId, sectionName} = prepared.assignment;
      const profile = {...student, programId, programCode, yearLevel, sectionId, sectionName, updatedAt: nowIso()};
      if (initialPassword) Object.assign(profile, {mustChangePassword: true, studentIdLogin: true, studentAuthEmail: studentEmail(prepared.canonicalId)});
      const recordId = prepared.editId ?? 'enr-' + hash(JSON.stringify([uid, academic.academicYear, academic.semester]));
      const record = {id: recordId, studentId: uid, studentName: profile.fullName, studentEmail: profile.email,
        studentIdNumber: profile.idNumber, ...prepared.assignment, enrolledAt: prepared.previous?.enrolledAt ?? nowIso()};
      await db.runTransaction(async tx => {
        // ID ownership is checked in the commit as well as before calling Firebase Auth.
        await checkId(tx, prepared.canonicalId, uid);
        const ledger = await tx.get(ledgers.doc(uid));
        tx.set(studentIds.doc(prepared.canonicalId), {uid});
        tx.set(userRef, profile, {merge: true});
        tx.set(enrollments.doc(recordId), record, {merge: true});
        if (!ledger.exists) tx.create(ledgers.doc(uid), initialLedger(profile, academic));
      });
      if (initialPassword) await auth.updateUser(uid, {disabled: false});
      return {enrollment: record, credentials: initialPassword ? {username: prepared.canonicalId, temporaryPassword: initialPassword} : null};
    });
  }

  async function reset(request) {
    const registrarUid = await requireUser(request, 'registrar');
    const uid = documentId(request.data?.studentUid, 'student account');
    return lock(uid, async () => {
      const ref = users.doc(uid);
      const student = (await ref.get()).data();
      if (!student || student.role !== 'student' || student.status !== 'active') {
        throw new HttpsError('not-found', 'An active student account is required.');
      }
      const username = normalizeStudentId(student.idNumber);
      const loginEmail = studentEmail(username);
      const audit = db.collection('passwordResetAudit').doc();
      const initialPassword = temporaryPassword();
      await db.runTransaction(async tx => {
        await checkId(tx, username, uid);
        tx.set(studentIds.doc(username), {uid});
        tx.update(ref, {mustChangePassword: true, updatedAt: nowIso()});
        tx.create(audit, {registrarUid, studentUid: uid, studentIdNumber: username,
          timestamp: FieldValue.serverTimestamp(), status: 'started'});
      });
      try {
        const identity = await existingAuth(uid);
        if (identity) {
          await auth.updateUser(uid, {email: loginEmail, emailVerified: false, password: initialPassword, disabled: false});
        } else {
          // Preserve the legacy profile UID and every academic reference that uses it.
          await auth.createUser({uid, email: loginEmail, password: initialPassword, displayName: student.fullName});
        }
        await auth.revokeRefreshTokens(uid);
        const batch = db.batch();
        batch.update(ref, {studentIdLogin: true, studentAuthEmail: loginEmail, updatedAt: nowIso()});
        batch.update(audit, {status: 'completed', completedAt: FieldValue.serverTimestamp()});
        await batch.commit();
      } catch (error) {
        await audit.update({status: 'failed', completedAt: FieldValue.serverTimestamp()}).catch(() => {});
        throw error;
      }
      return {username, temporaryPassword: initialPassword};
    });
  }

  async function change(request) {
    const uid = await requireUser(request, null, true);
    const {currentPassword, newPassword, confirmPassword} = request.data ?? {};
    password(newPassword);
    if (newPassword !== confirmPassword || newPassword === currentPassword) {
      throw new HttpsError('invalid-argument', 'Use a different new password and make sure both entries match.');
    }
    if (typeof currentPassword !== 'string' || !currentPassword || currentPassword.length > 4096) {
      throw new HttpsError('invalid-argument', 'Enter your current password.');
    }
    return lock(uid, async () => {
      const identity = await auth.getUser(uid);
      if (!identity.email || identity.disabled || !await verifyCurrentPassword(identity.email, currentPassword, uid)) {
        throw new HttpsError('permission-denied', 'The current password is incorrect.');
      }
      const ref = users.doc(uid);
      await ref.update({mustChangePassword: true, updatedAt: nowIso()});
      await auth.updateUser(uid, {password: newPassword});
      await auth.revokeRefreshTokens(uid);
      const validAfter = Math.floor(Date.now() / 1000);
      await ref.update({mustChangePassword: false, credentialsValidAfter: validAfter, updatedAt: nowIso()});
      return {signInAfter: (validAfter + 1) * 1000};
    });
  }

  async function setupStatus() {
    const [flag, registrars] = await Promise.all([bootstrap.get(), users.where('role', '==', 'registrar').limit(1).get()]);
    return {configured: flag.exists || !registrars.empty};
  }

  async function setup(input) {
    const identity = person(input);
    const initialPassword = password(input.password);
    return lock('registrar-bootstrap', async () => {
      const uid = 'registrar-' + hash(identity.email);
      if ((await setupStatus()).configured) {
        const [flag, existing] = await Promise.all([bootstrap.get(), existingAuth(uid)]);
        if (flag.get('registrarUid') !== uid || !existing?.disabled || existing.email !== identity.email) {
          throw new HttpsError('already-exists', 'Registrar setup is already complete.');
        }
        await auth.updateUser(uid, {password: initialPassword, disabled: false});
        return {email: identity.email};
      }
      await stageAuth(uid, identity.email, identity.fullName, initialPassword);
      const profile = {...identity, uid, role: 'registrar', status: 'active', idNumber: 'REG-' + new Date().getFullYear() + '-0001',
        createdAt: nowIso(), updatedAt: nowIso()};
      const batch = db.batch();
      batch.create(bootstrap, {createdAt: FieldValue.serverTimestamp(), registrarUid: uid});
      batch.create(users.doc(uid), profile);
      await batch.commit();
      await auth.updateUser(uid, {disabled: false});
      return {email: identity.email};
    });
  }

  async function createStaff(request) {
    await requireUser(request, 'registrar');
    const input = request.data ?? {};
    if (!STAFF_ROLES.includes(input.role)) throw new HttpsError('invalid-argument', 'Student accounts are created during enrollment.');
    const identity = person(input);
    const uid = 'staff-' + hash(identity.email);
    return lock(uid, async () => {
      const emailMatches = await users.where('email', '==', identity.email).limit(1).get();
      if (!emailMatches.empty || (await users.doc(uid).get()).exists) {
        throw new HttpsError('already-exists', 'An account with this email address already exists.');
      }
      const initialPassword = temporaryPassword();
      const assignment = await staffAssignment(input);
      await stageAuth(uid, identity.email, identity.fullName, initialPassword);
      const prefix = {registrar: 'REG', program_chair: 'CHR', teacher: 'TCH'}[input.role];
      await users.doc(uid).create({...identity, ...assignment, uid, role: input.role, status: 'active',
        mustChangePassword: true, idNumber: prefix + '-' + new Date().getFullYear() + '-' + hash(uid).slice(0, 8).toUpperCase(),
        createdAt: nowIso(), updatedAt: nowIso()});
      await auth.updateUser(uid, {disabled: false});
      await users.doc(uid).update({authProvisioned: true});
      return {username: identity.email, temporaryPassword: initialPassword};
    });
  }

  async function staffAssignment(input) {
    if (input.role !== 'program_chair' || !input.programId) return {programId: null, programCode: null};
    const programId = documentId(input.programId, 'program');
    const program = await db.collection('programs').doc(programId).get();
    if (!program.exists) throw new HttpsError('failed-precondition', 'Choose an existing program.');
    return {programId, programCode: program.get('code')};
  }

  async function updateProfile(request) {
    const actor = await requireUser(request, 'registrar');
    const input = request.data ?? {};
    const uid = documentId(input.uid, 'account');
    return lock(uid, async () => {
      const ref = users.doc(uid);
      const current = (await ref.get()).data();
      if (!current) throw new HttpsError('not-found', 'Account not found.');
      if (input.status !== undefined) {
        if (uid === actor || !['active', 'deactivated'].includes(input.status)) {
          throw new HttpsError('failed-precondition', 'You cannot change the status of your own account.');
        }
        if (await existingAuth(uid)) await auth.updateUser(uid, {disabled: input.status === 'deactivated'});
        await ref.update({status: input.status, updatedAt: nowIso()});
        return {status: input.status};
      }
      const student = current.role === 'student';
      if ((student && input.role !== 'student') || (!student && !STAFF_ROLES.includes(input.role)) ||
        (uid === actor && input.role !== current.role)) {
        throw new HttpsError('permission-denied', 'This role change is unavailable.');
      }
      const details = person(input, student);
      const assignment = student ? {} : await staffAssignment(input);
      const identity = await existingAuth(uid);
      const changeAuthEmail = identity && (!student || current.studentIdLogin !== true) && identity.email !== details.email;
      if (identity && (!changeAuthEmail || details.email)) {
        await auth.updateUser(uid, {displayName: details.fullName, ...(changeAuthEmail ? {email: details.email, emailVerified: false} : {})});
      }
      await ref.update({...details, ...assignment, role: input.role, ...(identity ? {authProvisioned: true} : {}), updatedAt: nowIso()});
      return {status: current.status};
    });
  }

  async function provisionLegacyStaff(request) {
    await requireUser(request, 'registrar');
    const uid = documentId(request.data?.uid, 'staff account');
    return lock(uid, async () => {
      const ref = users.doc(uid);
      const staff = (await ref.get()).data();
      if (!staff || !STAFF_ROLES.includes(staff.role) || staff.status !== 'active') {
        throw new HttpsError('not-found', 'Active staff account not found.');
      }
      const loginEmail = email(staff.email);
      const initialPassword = temporaryPassword();
      await stageAuth(uid, loginEmail, staff.fullName, initialPassword);
      await ref.update({mustChangePassword: true, updatedAt: nowIso()});
      await auth.updateUser(uid, {disabled: false});
      await ref.update({authProvisioned: true});
      return {username: loginEmail, temporaryPassword: initialPassword};
    });
  }

  async function ensureLedger(request) {
    const uid = await requireUser(request, 'student');
    return db.runTransaction(async tx => {
      const ref = ledgers.doc(uid);
      const ledger = await tx.get(ref);
      if (ledger.exists) return ledger.data();
      const [profile, enrollmentsForStudent] = await Promise.all([
        tx.get(users.doc(uid)), tx.get(enrollments.where('studentId', '==', uid)),
      ]);
      const latest = enrollmentsForStudent.docs.map(doc => doc.data()).sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt))[0];
      const created = initialLedger(profile.data(), latest);
      tx.create(ref, created);
      return created;
    });
  }

  return {enroll, reset, change, setupStatus, setup, createStaff, updateProfile, provisionLegacyStaff, ensureLedger};
}
