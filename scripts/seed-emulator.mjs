// Seed helper: run with Firebase Admin credentials pointed at the emulator.
// The emulator does not require a service-account key.
process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
const { initializeApp } = await import("firebase-admin/app");
const { getFirestore, FieldValue } = await import("firebase-admin/firestore");
const { getAuth } = await import("firebase-admin/auth");
initializeApp({ projectId: "school-enrollment-demo" });
const db = getFirestore();
const auth = getAuth();
const users = [
  ["registrar@northstar.edu", "Maria Santos", "registrar", null],
  ["chair@northstar.edu", "Dr. Elena Cruz", "chair", "bscs"],
  ["chair.it@northstar.edu", "Dr. Ramon Flores", "chair", "bsit"],
  ["teacher@northstar.edu", "Prof. Daniel Reyes", "teacher", null],
  ["mell@gmail.com", "Mell John Iconas", "student", "bsit"],
];
const ids = {};
for (const [email, displayName, role, programId] of users) {
  let u;
  try {
    u = await auth.getUserByEmail(email);
  } catch {
    u = await auth.createUser({ email, password: "Password123!", displayName });
  }
  ids[email] = u.uid;
  await auth.setCustomUserClaims(u.uid, { role, programId });
  await db
    .doc(`users/${u.uid}`)
    .set(
      { email, displayName, role, programId },
      { merge: true },
    );
}
await db.doc("programs/bsit").set({ name: "Bachelor of Science in Information Technology", code: "BSIT", type: "course" });
await db.doc("programs/bscs").set({ name: "Bachelor of Science in Computer Science", code: "BSCS", type: "course" });
await db
  .doc("terms/ay25-26-1")
  .set({
    label: "AY 2025–2026 · 1st Sem",
    academicYear: "2025–2026",
    semester: 1,
    status: "active",
  });
const subjects = [
  ["it-101", { programId: "bsit", code: "IT 101", name: "IT Fundamentals", units: 3, yearLevel: 1, semester: 1, prerequisiteIds: [] }],
  ["it-102", { programId: "bsit", code: "IT 102", name: "Object-Oriented Programming", units: 3, yearLevel: 1, semester: 2, prerequisiteIds: ["it-101"] }],
  ["it-201", { programId: "bsit", code: "IT 201", name: "Web Systems", units: 3, yearLevel: 2, semester: 1, prerequisiteIds: ["it-102"] }],
  ["cs-101", { programId: "bscs", code: "CS 101", name: "Intro to Computing", units: 3, yearLevel: 1, semester: 1, prerequisiteIds: [] }],
  ["cs-102", { programId: "bscs", code: "CS 102", name: "Data Structures & Algorithms", units: 3, yearLevel: 1, semester: 2, prerequisiteIds: ["cs-101"] }],
];
for (const [id, data] of subjects) await db.doc(`subjects/${id}`).set(data);
const studentUid = ids["mell@gmail.com"];
await db.doc(`students/${studentUid}`).set({ uid: studentUid, studentId: "19-0660-986", name: "Mell John Iconas", programId: "bsit", yearLevel: 1, scheduleType: "regular" }, { merge: true });
await db.doc("offerings/offering-it-101").set({ programId: "bsit", subjectId: "it-101", subjectCode: "IT 101", subjectName: "IT Fundamentals", sectionName: "BSIT 1A", termId: "ay25-26-1", teacherUid: ids["teacher@northstar.edu"], teacherName: "Prof. Daniel Reyes", schedule: "MWF · 8:00–9:00 AM", room: "Lab 1", maxSlots: 40 });
await db.doc("offerings/offering-it-102").set({ programId: "bsit", subjectId: "it-102", subjectCode: "IT 102", subjectName: "Object-Oriented Programming", sectionName: "BSIT 1B", termId: "ay25-26-1", teacherUid: ids["teacher@northstar.edu"], teacherName: "Prof. Daniel Reyes", schedule: "TTh · 10:00–11:30 AM", room: "Lab 2", maxSlots: 40 });
await db.doc("payments/payment-mell-2025").set({ studentUid, studentId: "19-0660-986", programId: "bsit", termId: "ay25-26-1", reference: "GCASH-DEMO-001", amount: 5000, method: "GCash", downPaymentVerified: true, status: "verified" });
await db.doc("fees/fee-mell-tuition").set({ studentUid, studentId: "19-0660-986", programId: "bsit", termId: "ay25-26-1", label: "Tuition assessment", amount: 28500 });
await db.doc("gradeAttempts/mell-it-101-history").set({ studentUid, studentId: "19-0660-986", subjectId: "it-101", subjectCode: "IT 101", subjectName: "IT Fundamentals", termId: "ay24-25-2", grade: 2, remark: "PASSED", finalized: true });
await db
  .collection("announcements")
  .add({
    title: "Enrollment is now open",
    body: "Please complete your down-payment verification before registration.",
    scope: "school",
    author: "Maria Santos",
    createdAt: FieldValue.serverTimestamp(),
  });
console.log("Seeded emulator accounts. Password for all: Password123!");
