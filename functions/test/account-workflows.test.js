import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { initializeApp as initAdmin, deleteApp as deleteAdmin } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { getFirestore as adminFirestore } from 'firebase-admin/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDocFromServer, getFirestore, setDoc, updateDoc } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';

const projectId = 'demo-academiahub';
if (process.env.GCLOUD_PROJECT !== projectId ||
  !process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST || !process.env.REGISTRAR_SETUP_KEY) {
  throw new Error('Run this test with fresh Firebase emulators for demo-academiahub and a test setup key.');
}
const admin = initAdmin({projectId});
const db = adminFirestore(admin);
const identity = adminAuth(admin);
const apps = [];

function client() {
  const app = initializeApp({projectId, apiKey: 'emulator-key'}, 'test-' + apps.length);
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', {disableWarnings: true});
  const firestore = getFirestore(app);
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
  const functions = getFunctions(app, 'us-central1');
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  return {
    auth,
    firestore,
    signIn: (email, password) => signInWithEmailAndPassword(auth, email, password),
    call: async (name, data = {}) => (await httpsCallable(functions, name)(data)).data,
    read: (name, id) => getDocFromServer(doc(firestore, name, id)),
  };
}

const rejects = (promise, ...codes) => assert.rejects(promise, error => codes.includes(error.code));
const alias = id => id.toLowerCase() + '@students.academiahub.invalid';
const pauseUntil = time => new Promise(resolve => setTimeout(resolve, Math.max(time - Date.now() + 20, 20)));
const term = {programId:'program-cs', sectionId:'section-a', yearLevel:1, academicYear:'2026-2027', semester:'1st Semester', status:'enrolled'};
const studentDetails = {firstName:'Juan', lastName:'Santos', idNumber:'2026-0001', email:'student-contact@example.test'};
const paths = {
  registrar: {email:'registrar@example.test', firstName:'Avery', lastName:'Admin', password:'VeryStrong!Registrar27'},
  teacher: {email:'teacher@example.test', firstName:'Lee', lastName:'Teacher', role:'teacher'},
  chair: {email:'chair@example.test', firstName:'Kim', lastName:'Chair', role:'program_chair', programId:'program-cs'},
  registrarTwo: {email:'second-registrar@example.test', firstName:'Kai', lastName:'Registrar', role:'registrar'},
};
const firstPassword = 'First#StudentPassword199';
const finalPassword = 'Reset#StudentPassword242';
const afterStaff = 'Changed#StaffPassword23';

after(async () => {
  await Promise.all(apps.map(deleteApp));
  await deleteAdmin(admin);
});

test('student account, required change, Registrar reset and preserved records', {timeout: 120_000}, async t => {
  const publicClient = client();
  const registrar = client();
  const teacher = client();
  const student = client();
  const staleStudent = client();
  const data = {...term, student: studentDetails};
  let issued;
  let uid;
  let authUid;
  let recordId;
  let paymentLedger;
  let reset;

  await t.test('locks public setup and requires a verified role for administration', async () => {
    assert.deepEqual(await publicClient.call('getSetupStatus'), {configured:false});
    await rejects(publicClient.call('setupRegistrar', {...paths.registrar, setupKey:'invalid-key'}), 'functions/permission-denied');
    await registrar.call('setupRegistrar', {...paths.registrar, setupKey:process.env.REGISTRAR_SETUP_KEY});
    await registrar.signIn(paths.registrar.email, paths.registrar.password);
    authUid = registrar.auth.currentUser.uid;
    assert.deepEqual(await publicClient.call('getSetupStatus'), {configured:true});
    await rejects(publicClient.call('setupRegistrar', {...paths.registrar, setupKey:process.env.REGISTRAR_SETUP_KEY}), 'functions/already-exists');
    await db.doc('programs/program-cs').set({code:'BSCS', name:'Computer Science'});
    await db.doc('sections/section-a').set({name:'BSCS 1-A', programId:'program-cs', yearLevel:1});
    await db.doc('sections/section-b').set({name:'BSCS 1-B', programId:'program-cs', yearLevel:1});
    await rejects(publicClient.call('enrollmentWithAccount', data), 'functions/unauthenticated');
    await rejects(registrar.call('createStaffAccount', {...paths.teacher, role:'student'}), 'functions/invalid-argument');
    for (const path of [paths.chair, paths.registrarTwo, paths.teacher]) {
      const staff = await registrar.call('createStaffAccount', path);
      const teacherSession = path.role === 'teacher' ? teacher : client();
      await teacherSession.signIn(staff.username, staff.temporaryPassword);
      assert.equal((await teacherSession.read('users', teacherSession.auth.currentUser.uid)).data().role, path.role);
      if (path.role === 'teacher') {
        const changed = await teacher.call('changeAccountPassword', {currentPassword:staff.temporaryPassword, newPassword:afterStaff, confirmPassword:afterStaff});
        await pauseUntil(changed.signInAfter);
        await teacher.signIn(path.email, afterStaff);
      }
    }
    await rejects(teacher.call('enrollmentWithAccount', data), 'functions/permission-denied');
    await rejects(registrar.call('resetStudentPassword', {studentUid:teacher.auth.currentUser.uid}), 'functions/not-found');
    await rejects(setDoc(doc(registrar.firestore, 'users', 'unauthorized-student'), {role:'student'}), 'permission-denied');
  });

  await t.test('creates a Firebase identity and linked profile, enrollment, and ledger once', async () => {
    const races = await Promise.allSettled([
      registrar.call('enrollmentWithAccount', data),
      registrar.call('enrollmentWithAccount', {...data, student:{...studentDetails, idNumber:' 2026-0001 '}}),
    ]);
    assert.equal(races.filter(result => result.status === 'fulfilled').length, 1);
    assert.ok(['functions/aborted', 'functions/already-exists'].includes(races.find(result => result.status === 'rejected').reason.code));
    issued = races.find(result => result.status === 'fulfilled').value;
    uid = issued.enrollment.studentId;
    recordId = issued.enrollment.id;
    assert.equal(issued.credentials.username, '2026-0001');
    assert.ok(issued.credentials.temporaryPassword.length >= 20);
    assert.equal(registrar.auth.currentUser.uid, authUid);
    assert.equal((await identity.getUser(uid)).email, alias('2026-0001'));
    await rejects(registrar.call('enrollmentWithAccount', data), 'functions/already-exists');
    await rejects(registrar.call('enrollmentWithAccount', {...term, studentUid:uid}), 'functions/already-exists');
    const profile = (await db.doc('users/'+uid).get()).data();
    assert.equal(profile.mustChangePassword, true);
    assert.equal(profile.role, 'student');
    assert.equal(profile.programId, term.programId);
    assert.equal(profile.sectionId, term.sectionId);
    assert.equal((await db.doc('ledgers/'+uid).get()).data().studentId, uid);
    await db.doc('grades/student-grade').set({studentId:uid, letterGrade:'1.50'});
    await db.doc('ledgers/'+uid).update({totalPaid:250, remainingBalance:7050});
    paymentLedger = (await db.doc('ledgers/'+uid).get()).data();
    await registrar.call('enrollmentWithAccount', {...term, sectionId:'section-b', studentUid:uid, enrollmentId:recordId});
    assert.equal((await db.doc('users/'+uid).get()).data().sectionId, 'section-b');
    assert.deepEqual((await db.doc('ledgers/'+uid).get()).data(), paymentLedger);
  });

  await t.test('denies direct access and only clears the flag after a verified password change', async () => {
    const temporary = issued.credentials.temporaryPassword;
    await rejects(student.signIn(alias('2026-0001'), 'Santos123'), 'auth/invalid-credential', 'auth/wrong-password');
    await student.signIn(alias('2026-0001'), temporary);
    await staleStudent.signIn(alias('2026-0001'), temporary);
    assert.equal((await student.read('users', uid)).data().mustChangePassword, true);
    await rejects(student.read('grades', 'student-grade'), 'permission-denied');
    await rejects(student.read('ledgers', uid), 'permission-denied');
    await rejects(updateDoc(doc(student.firestore, 'users', uid), {mustChangePassword:false}), 'permission-denied');
    await rejects(student.call('resetStudentPassword', {studentUid:uid}), 'functions/permission-denied');
    await rejects(student.call('changeAccountPassword', {currentPassword:'wrong', newPassword:firstPassword, confirmPassword:firstPassword}), 'functions/permission-denied');
    await rejects(student.call('changeAccountPassword', {currentPassword:temporary, newPassword:'weak', confirmPassword:'weak'}), 'functions/invalid-argument');
    await rejects(student.call('changeAccountPassword', {currentPassword:temporary, newPassword:firstPassword, confirmPassword:finalPassword}), 'functions/invalid-argument');
    assert.equal((await student.read('users', uid)).data().mustChangePassword, true);
    const changed = await student.call('changeAccountPassword', {currentPassword:temporary, newPassword:firstPassword, confirmPassword:firstPassword});
    await rejects(staleStudent.read('grades', 'student-grade'), 'permission-denied', 'unauthenticated');
    await pauseUntil(changed.signInAfter);
    await student.signIn(alias('2026-0001'), firstPassword);
    assert.equal((await student.read('users', uid)).data().mustChangePassword, false);
    assert.equal((await student.read('grades', 'student-grade')).data().studentId, uid);
    assert.equal((await student.read('ledgers', uid)).data().totalPaid, 250);
    await rejects(publicClient.signIn(alias('2026-0001'), temporary), 'auth/invalid-credential', 'auth/wrong-password');
  });

  await t.test('only the Registrar can reset and the change gate and audit apply again', async () => {
    await rejects(teacher.call('resetStudentPassword', {studentUid:uid}), 'functions/permission-denied');
    await rejects(student.call('resetStudentPassword', {studentUid:uid}), 'functions/permission-denied');
    reset = await registrar.call('resetStudentPassword', {studentUid:uid});
    assert.equal(reset.username, '2026-0001');
    assert.notEqual(reset.temporaryPassword, issued.credentials.temporaryPassword);
    assert.equal(registrar.auth.currentUser.uid, authUid);
    await rejects(student.read('ledgers', uid), 'permission-denied', 'unauthenticated');
    await rejects(publicClient.signIn(alias('2026-0001'), firstPassword), 'auth/invalid-credential', 'auth/wrong-password');
    const audit = (await db.collection('passwordResetAudit').get()).docs.map(a => a.data());
    assert.equal(audit.length, 1);
    assert.equal(audit[0].registrarUid, authUid);
    assert.equal(audit[0].studentUid, uid);
    assert.equal(audit[0].status, 'completed');
    assert.ok(audit[0].timestamp);
    assert.ok(!JSON.stringify(audit).includes(reset.temporaryPassword));
    await rejects(registrar.read('passwordResetAudit', 'audit'), 'permission-denied');
    await student.signIn(alias('2026-0001'), reset.temporaryPassword);
    assert.equal((await student.read('users', uid)).data().mustChangePassword, true);
    await rejects(student.read('enrollments', recordId), 'permission-denied');
    const changed = await student.call('changeAccountPassword', {currentPassword:reset.temporaryPassword, newPassword:finalPassword, confirmPassword:finalPassword});
    await pauseUntil(changed.signInAfter);
    await student.signIn(alias('2026-0001'), finalPassword);
    assert.equal((await student.read('enrollments', recordId)).data().studentId, uid);
    assert.deepEqual((await student.read('ledgers', uid)).data(), paymentLedger);
    const savedProfile = (await db.doc('users/'+uid).get()).data();
    assert.ok(!JSON.stringify(savedProfile).includes(reset.temporaryPassword));
  });

  await t.test('can provision an existing student with the original UID and retain history', async () => {
    const legacyUid = 'user-student-legacy';
    await db.doc('users/'+legacyUid).set({uid:legacyUid, role:'student', fullName:'Legacy Student', status:'active', idNumber:'STU-2026-0002'});
    await db.doc('grades/legacy-grade').set({studentId:legacyUid, letterGrade:'2.00'});
    const prior = await registrar.call('resetStudentPassword', {studentUid:legacyUid});
    assert.equal(prior.username, 'STU-2026-0002');
    assert.equal((await identity.getUser(legacyUid)).email, alias(prior.username));
    assert.equal((await db.doc('grades/legacy-grade').get()).data().studentId, legacyUid);
    await rejects(registrar.call('enrollmentWithAccount', {...data, student:{...studentDetails,idNumber:'stu-2026-0002'}}), 'functions/already-exists');
  });
});
