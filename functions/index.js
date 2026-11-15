const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
admin.initializeApp();
const db = admin.firestore();
const requireRole = (c, roles) => {
  if (!c.auth || !roles.includes(c.auth.token.role))
    throw new HttpsError("permission-denied", "Insufficient role");
};
exports.createAccount = onCall(async (req) => {
  requireRole(req, ["registrar"]);
  const {
    email,
    password,
    displayName,
    role,
    programId,
    studentId,
    yearLevel,
    scheduleType,
  } = req.data;
  if (role === "registrar" && req.auth.token.role !== "registrar")
    throw new HttpsError("permission-denied", "Cannot assign registrar");
  let u;
  try {
    u = await admin.auth().createUser({ email, password, displayName });
  } catch (err) {
    if (err.code !== "auth/email-already-exists") throw err;
    u = await admin.auth().getUserByEmail(email);
    u = await admin.auth().updateUser(u.uid, { displayName, password });
  }
  await admin
    .auth()
    .setCustomUserClaims(u.uid, { role, programId: programId || null });
  await db.doc(`users/${u.uid}`).set({
    email,
    displayName,
    role,
    programId: programId || null,
    createdAt: FieldValue.serverTimestamp(),
  });
  if (role === "student") {
    if (!["bsit", "bscs"].includes(programId))
      throw new HttpsError(
        "invalid-argument",
        "Student course must be BSIT or BSCS",
      );
    const courseNames = {
      bsit: "Bachelor of Science in Information Technology",
      bscs: "Bachelor of Science in Computer Science",
    };
    await db
      .doc(`programs/${programId}`)
      .set(
        {
          code: programId.toUpperCase(),
          name: courseNames[programId],
          type: "course",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    await db.doc(`students/${u.uid}`).set({
      uid: u.uid,
      studentId: studentId || null,
      name: displayName,
      programId: programId || null,
      yearLevel: Number(yearLevel) || 1,
      scheduleType: scheduleType || "regular",
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  return { uid: u.uid };
});
exports.changeRole = onCall(async (req) => {
  requireRole(req, ["registrar"]);
  if (req.data.uid === req.auth.uid)
    throw new HttpsError(
      "failed-precondition",
      "You cannot change your own role",
    );
  const existing = await db.doc(`users/${req.data.uid}`).get();
  const programId = req.data.programId || (existing.exists ? existing.data().programId : null);
  await admin.auth().setCustomUserClaims(req.data.uid, {
    role: req.data.role,
    programId,
  });
  await db.doc(`users/${req.data.uid}`).update({
    role: req.data.role,
    programId,
          updatedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true };
});
exports.registerStudent = onCall(async (req) => {
  requireRole(req, ["registrar"]);
  const { studentUid, studentId, termId, programId, paymentRef } = req.data;
  if (!studentUid || !studentId || !termId || !["bsit", "bscs"].includes(programId))
    throw new HttpsError("invalid-argument", "Student, term, ID, and course are required");
  const studentSnap = await db.doc(`students/${studentUid}`).get();
  const student = studentSnap.exists ? studentSnap.data() : {};
  return db.runTransaction(async (t) => {
    const q = await t.get(
      db.collection("registrations")
      .where("studentId", "==", studentId)
      .where("termId", "==", termId)
      .limit(1),
    );
    if (!q.empty)
      throw new HttpsError(
        "already-exists",
        "Student is already registered for this term",
      );
    const p = await t.get(
      db.collection("payments")
      .where("studentId", "==", studentId)
      .where("termId", "==", termId)
      .where("downPaymentVerified", "==", true)
      .limit(1),
    );
    if (p.empty)
      throw new HttpsError(
        "failed-precondition",
        "Verify the down payment before registration",
      );
    const ref = db.collection("registrations").doc();
    t.set(ref, {
      studentId,
      termId,
      programId,
      studentUid,
      studentName: student.name || student.displayName || studentId,
      status: "advising",
      paymentRef,
      createdBy: req.auth.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { id: ref.id };
  });
});
exports.verifyPayment = onCall(async (req) => {
  requireRole(req, ["registrar"]);
  const { paymentId } = req.data;
  if (!paymentId) throw new HttpsError("invalid-argument", "Payment ID is required");
  await db.doc(`payments/${paymentId}`).update({
    downPaymentVerified: true,
    verifiedAt: FieldValue.serverTimestamp(),
    verifiedBy: req.auth.uid,
    status: "verified",
  });
  return { ok: true };
});
exports.createOffering = onCall(async (req) => {
  requireRole(req, ["registrar", "chair"]);
  const data = req.data || {};
  if (!data.programId || !data.subjectId || !data.termId || !data.sectionName)
    throw new HttpsError("invalid-argument", "Program, subject, term, and section are required");
  if (req.auth.token.role === "chair" && req.auth.token.programId !== data.programId)
    throw new HttpsError("permission-denied", "Offering is outside your program");
  const subjectSnap = await db.doc(`subjects/${data.subjectId}`).get();
  if (!subjectSnap.exists) throw new HttpsError("not-found", "Subject not found");
  const subject = subjectSnap.data();
  const ref = db.collection("offerings").doc();
  await ref.set({ ...data, subjectCode: data.subjectCode || subject.code, subjectName: data.subjectName || subject.name, units: subject.units || 0, createdBy: req.auth.uid, createdAt: FieldValue.serverTimestamp() });
  return { id: ref.id };
});
exports.submitGrade = onCall(async (req) => {
  requireRole(req, ["teacher", "chair"]);
  const { enrollmentId, studentUid, studentId, offeringId, subjectId, subjectCode, subjectName, termId, grade, remark } = req.data;
  const numericGrade = Number(grade);
  if (!studentUid || !offeringId || !termId || !Number.isFinite(numericGrade) || numericGrade < 1 || numericGrade > 5)
    throw new HttpsError("invalid-argument", "Student, offering, term, and a grade from 1.00 to 5.00 are required");
  const offering = await db.doc(`offerings/${offeringId}`).get();
  if (!offering.exists) throw new HttpsError("not-found", "Offering not found");
  if (req.auth.token.role === "teacher" && offering.data().teacherUid !== req.auth.uid)
    throw new HttpsError("permission-denied", "You are not assigned to this offering");
  const id = enrollmentId || `${studentUid}_${offeringId}`;
  await db.doc(`gradeAttempts/${id}`).set({
    studentUid, studentId: studentId || null, offeringId, subjectId: subjectId || offering.data().subjectId || null, subjectCode: subjectCode || offering.data().subjectCode || null,
    subjectName: subjectName || null, termId, grade: numericGrade,
    remark: remark || (numericGrade <= 3 ? "PASSED" : "FAILED"), finalized: true,
    submittedBy: req.auth.uid, submittedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { id };
});
exports.finalizeAdvising = onCall(async (req) => {
  requireRole(req, ["chair"]);
  const { registrationId, enrollments } = req.data;
  const reg = await db.doc(`registrations/${registrationId}`).get();
  if (!reg.exists || reg.data().programId !== req.auth.token.programId)
    throw new HttpsError(
      "permission-denied",
      "Student is outside your program",
    );
  const studentUid = reg.data().studentUid;
  const attempts = studentUid
    ? await db.collection("gradeAttempts").where("studentUid", "==", studentUid).where("finalized", "==", true).get()
    : { docs: [] };
  const passed = new Set(
    attempts.docs
      .filter((snap) => Number(snap.data().grade) <= 3 && snap.data().remark === "PASSED")
      .map((snap) => snap.data().subjectId || snap.data().subjectCode),
  );
  const selectedOfferings = [];
  for (const enrollment of enrollments) {
    const offeringSnap = await db.doc(`offerings/${enrollment.offeringId}`).get();
    if (!offeringSnap.exists) throw new HttpsError("not-found", "Selected offering was not found");
    const offering = offeringSnap.data();
    if (offering.programId !== reg.data().programId || offering.termId !== reg.data().termId)
      throw new HttpsError("permission-denied", "Selected offering is outside the registration program or term");
    selectedOfferings.push({ enrollment, offering });
    const subjectSnap = await db.doc(`subjects/${offering.subjectId}`).get();
    const prerequisites = subjectSnap.exists ? subjectSnap.data().prerequisiteIds || [] : [];
    const missing = prerequisites.filter((id) => !passed.has(id));
    if (missing.length)
      throw new HttpsError("failed-precondition", `Unmet prerequisites: ${missing.join(", ")}`);
  }
  const refs = enrollments.map((e) =>
    db.collection("enrollments").doc(`${registrationId}_${e.offeringId}`),
  );
  await db.runTransaction(async (t) => {
    const existingRefs = await Promise.all(refs.map((ref) => t.get(ref)));
    for (let index = 0; index < refs.length; index += 1) {
      const r = refs[index];
      if (existingRefs[index].exists)
        throw new HttpsError("already-exists", "Duplicate enrollment");
      const { enrollment, offering } = selectedOfferings[index];
      t.set(r, {
        registrationId,
        ...enrollment,
        studentUid,
        studentId: reg.data().studentId,
        programId: reg.data().programId,
        subjectId: offering.subjectId,
        subjectCode: offering.subjectCode || null,
        subjectName: offering.subjectName || null,
        units: offering.units || 0,
        schedule: offering.schedule || null,
        room: offering.room || null,
        termId: reg.data().termId,
        confirmedBy: req.auth.uid,
        confirmedAt: FieldValue.serverTimestamp(),
      });
    }
    t.update(reg.ref, {
      status: "enrolled",
      finalizedBy: req.auth.uid,
      finalizedAt: FieldValue.serverTimestamp(),
    });
  });
  return { ok: true };
});
