import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  UserPlus,
  BookOpen,
  CalendarDays,
  WalletCards,
  Megaphone,
  Settings,
  ChevronRight,
  CheckCircle2,
  Menu,
  X,
  LogOut,
  Plus,
  Bell,
} from "lucide-react";
import {
  collection,
  doc,
  query,
  where,
  addDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, db, functions } from "./firebase";
import { httpsCallable } from "firebase/functions";
import "./styles.css";

const icons = {
  Overview: LayoutDashboard,
  Users: UserPlus,
  "Registration Desk": Users,
  Terms: CalendarDays,
  Courses: BookOpen,
  Subjects: BookOpen,
  Students: Users,
  Advising: BookOpen,
  Schedule: CalendarDays,
  Grades: BookOpen,
  Fees: WalletCards,
  Announcements: Megaphone,
  Setup: Settings,
};
const navFor = (role) =>
  role === "registrar"
    ? ["Overview", "Users", "Courses", "Subjects", "Registration Desk", "Terms", "Announcements"]
    : role === "chair"
      ? ["Overview", "Advising", "Schedule", "Grades", "Announcements"]
      : role === "teacher"
        ? ["Overview", "Schedule", "Grades"]
        : [
            "Overview",
            "Grades",
            "Fees",
            "Schedule",
            "Curriculum",
            "Announcements",
          ];
const prettyRole = (role) =>
  ({
    registrar: "Registrar",
    chair: "Program Chair",
    teacher: "Teacher",
    student: "Student",
  })[role] || "User";
const demoAccounts = [
  ["Registrar", "registrar@northstar.edu"],
  ["Program Chair", "chair@northstar.edu"],
  ["Teacher", "teacher@northstar.edu"],
  ["Student", "jordan@northstar.edu"],
];

function Login() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (
      import.meta.env.VITE_USE_EMULATORS === "true" &&
      new URLSearchParams(window.location.search).get("role") === "registrar"
    ) {
      signInWithEmailAndPassword(
        auth,
        "registrar@northstar.edu",
        "Password123!",
      ).catch(() =>
        setError("Run npm run seed before using the Registrar shortcut."),
      );
    }
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(
        err.code === "auth/invalid-credential"
          ? "Incorrect email or password."
          : err.message,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth">
      <form className="card auth-card" onSubmit={submit}>
        <div className="mark">
          <GraduationCap size={22} />
        </div>
        <h1>AcademiaHub</h1>
        <p className="sub">Sign in to your academic workspace.</p>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {import.meta.env.VITE_USE_EMULATORS === "true" && (
          <div className="demo-login">
            <span>Emulator accounts</span>
            {demoAccounts.map(([label, account]) => (
              <button
                type="button"
                key={account}
                onClick={() => {
                  setEmail(account);
                  setPassword("Password123!");
                }}
              >
                {label}
                <small>{account}</small>
              </button>
            ))}
            <small>
              Run <code>npm run seed</code> first.
            </small>
          </div>
        )}
      </form>
    </main>
  );
}
function App() {
  const [user, setUser] = useState(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  if (user === undefined) return <div className="loading">Loading…</div>;
  return user ? <Portal user={user} /> : <Login />;
}
function Portal({ user }) {
  const [role, setRole] = useState("student"),
    [page, setPage] = useState("Overview"),
    [mobile, setMobile] = useState(false),
    [profile, setProfile] = useState(null);
  useEffect(
    () =>
      user
        .getIdTokenResult(true)
        .then((t) => setRole(t.claims.role || "student")),
    [user],
  );
  useEffect(
    () =>
      onSnapshot(doc(db, "users", user.uid), (s) => {
        if (s.exists()) setProfile(s.data());
      }),
    [user],
  );
  const name = profile?.displayName || user.displayName || user.email,
    nav = navFor(role);
  return (
    <div className="app">
      <aside className={mobile ? "open" : ""}>
        <div className="brand">
          <div className="mark">
            <GraduationCap size={22} />
          </div>
          <span>
            AcademiaHub
            <br />
            <b>College</b>
          </span>
          <button className="close" onClick={() => setMobile(false)}>
            <X />
          </button>
        </div>
        <div className="workspace">
          <span>WORKSPACE</span>
          <strong>{prettyRole(role)} Portal</strong>
        </div>
        <nav>
          {nav.map((n) => {
            const I = icons[n] || BookOpen;
            return (
              <button
                className={page === n ? "active" : ""}
                onClick={() => {
                  setPage(n);
                  setMobile(false);
                }}
                key={n}
              >
                <I size={18} />
                {n}
              </button>
            );
          })}
        </nav>
        <div className="sidebottom">
          <button onClick={() => setPage("Settings")}>
            <Settings size={18} />
            Settings
          </button>
          <div className="user">
            <div className="avatar">
              {name
                .split(" ")
                .map((x) => x[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div>
              <b>{name}</b>
              <small>{user.email}</small>
            </div>
            <button
              className="iconbtn"
              onClick={() => signOut(auth)}
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <button className="menu" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <div className="crumb">
            {page === "Overview" ? "Workspace" : page}
          </div>
          <div className="header-actions">
            <div className="term">
              <span>Signed in as</span>
              <b>{prettyRole(role)}</b>
            </div>
            <button
              className="iconbtn"
              onClick={() => setPage("Announcements")}
              title="Notifications"
            >
              <Bell size={16} />
            </button>
          </div>
        </header>
        {page === "Overview" ? (
          <Overview role={role} name={name} profile={profile} />
        ) : page === "Users" && role === "registrar" ? (
          <UserManagement />
        ) : (page === "Courses" || page === "Subjects") &&
          role === "registrar" ? (
          <AcademicSetup type={page} />
        ) : page === "Registration Desk" && role === "registrar" ? (
          <RegistrationDesk />
        ) : page === "Terms" && role === "registrar" ? (
          <TermsManager />
        ) : page === "Advising" && role === "chair" ? (
          <AdvisingDesk profile={profile} />
        ) : page === "Schedule" ? (
          <ScheduleDesk role={role} profile={profile} />
        ) : page === "Grades" ? (
          <GradesDesk role={role} profile={profile} />
        ) : page === "Fees" && role === "student" ? (
          <FeesDesk user={user} profile={profile} />
        ) : page === "Curriculum" && role === "student" ? (
          <CurriculumDesk profile={profile} />
        ) : (
          <Page page={page} role={role} />
        )}
      </main>
    </div>
  );
}

function UserManagement() {
  const accounts = useRecords("users");
  const [form, setForm] = useState({
    email: "",
    password: "",
    displayName: "",
    role: "student",
    programId: "bsit",
    studentId: "",
    yearLevel: "1",
    scheduleType: "regular",
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const change = async (uid, role) => {
    try { await httpsCallable(functions, "changeRole")({ uid, role }); setMessage("User role updated."); } catch (err) { setError(err.message); }
  };
  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await httpsCallable(
        functions,
        "createAccount",
      )({
        ...form,
        programId: ["student", "chair"].includes(form.role)
          ? form.programId
          : null,
        studentId: form.role === "student" ? form.studentId : null,
        yearLevel: form.role === "student" ? form.yearLevel : null,
        scheduleType: form.role === "student" ? form.scheduleType : null,
      });
      setMessage(
        `${form.displayName} was added as a ${prettyRole(form.role)}.`,
      );
      setForm({
        email: "",
        password: "",
        displayName: "",
        role: "student",
        programId: "bsit",
        studentId: "",
        yearLevel: "1",
        scheduleType: "regular",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="content">
      <div className="pagehead">
        <div>
          <p className="eyebrow">REGISTRAR · USER MANAGEMENT</p>
          <h1>Add users</h1>
          <p className="sub">
            Create AcademiaHub accounts for staff and students.
          </p>
        </div>
      </div>
      <form className="card formcard user-form" onSubmit={create}>
        <div className="form-grid">
          <label>
            Full name
            <input
              value={form.displayName}
              onChange={(e) =>
                setForm({ ...form, displayName: e.target.value })
              }
              required
            />
          </label>
          <label>
            Email address
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label>
            Temporary password
            <input
              type="password"
              minLength="6"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
          <label>
            Role
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="chair">Program Chair</option>
              <option value="registrar">Registrar</option>
            </select>
          </label>
          <label>
            Course
            <select
              value={form.programId}
              onChange={(e) => setForm({ ...form, programId: e.target.value })}
            >
              <option value="bsit">
                BSIT — Bachelor of Science in Information Technology
              </option>
              <option value="bscs">
                BSCS — Bachelor of Science in Computer Science
              </option>
            </select>
          </label>
          {form.role === "student" && (
            <>
              <label>
                Student ID
                <input
                  value={form.studentId}
                  onChange={(e) =>
                    setForm({ ...form, studentId: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                Year level
                <select
                  value={form.yearLevel}
                  onChange={(e) =>
                    setForm({ ...form, yearLevel: e.target.value })
                  }
                >
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                  <option value="5">5th Year</option>
                </select>
              </label>
              <label>
                Schedule
                <select
                  value={form.scheduleType}
                  onChange={(e) =>
                    setForm({ ...form, scheduleType: e.target.value })
                  }
                >
                  <option value="regular">Regular</option>
                  <option value="evening">Evening</option>
                </select>
              </label>
            </>
          )}
        </div>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          <UserPlus size={15} />
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
      <div className="card tablecard"><div className="cardhead"><div><h2>{accounts.length} accounts</h2><p>Live user directory</p></div></div>{accounts.map((account) => <div className="activity" key={account.id}><span className="dot blue"/><div><b>{account.displayName || account.email}</b><small>{account.email} · {account.programId?.toUpperCase() || "School-wide"}</small></div><select value={account.role || "student"} onChange={(e)=>change(account.id,e.target.value)}><option value="student">Student</option><option value="teacher">Teacher</option><option value="chair">Program Chair</option><option value="registrar">Registrar</option></select></div>)}</div>
    </section>
  );
}
function AcademicSetup({ type }) {
  const isProgram = type === "Courses";
  const [form, setForm] = useState(
    isProgram
      ? { id: "", name: "", code: "" }
      : {
          id: "",
          code: "",
          name: "",
          units: "3",
          semester: "1",
          yearLevel: "1",
          programId: "bsit",
          prerequisiteIds: "",
        },
  );
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const records = useRecords(isProgram ? "programs" : "subjects");
  const prospectusSubjects = useRecords("subjects");
  const courseCatalog = [
    {
      id: "bsit",
      code: "BSIT",
      name: "Bachelor of Science in Information Technology",
    },
    {
      id: "bscs",
      code: "BSCS",
      name: "Bachelor of Science in Computer Science",
    },
  ];
  const students = useRecords("students");
  const registrations = useRecords("registrations");
  const [selectedCourse, setSelectedCourse] = useState("bsit");
  const [selectedYear, setSelectedYear] = useState("none");
  const courseRegistrations = registrations.filter(
    (r) => r.programId === selectedCourse,
  );
  const registeredStudentIds = new Set(
    courseRegistrations
      .flatMap((r) => [r.studentId, r.studentUid])
      .filter(Boolean),
  );
  const matchedStudents = students.filter(
    (s) =>
      s.programId === selectedCourse ||
      registeredStudentIds.has(s.studentId) ||
      registeredStudentIds.has(s.id),
  );
  const matchedIds = new Set(
    matchedStudents.flatMap((s) => [s.studentId, s.id]).filter(Boolean),
  );
  const courseStudents = [
    ...matchedStudents,
    ...courseRegistrations
      .filter(
        (r) => !matchedIds.has(r.studentId) && !matchedIds.has(r.studentUid),
      )
      .map((r) => ({
        ...r,
        id: `registration-${r.id}`,
        studentId: r.studentId || r.studentUid,
        registrationStatus: r.status,
      })),
  ];
  const visibleCourseStudents = selectedYear === "none" ? [] : courseStudents.filter((s) => String(s.yearLevel || "") === selectedYear);
  const allCourseRegistrations = registrations.filter(
    (r) => r.programId === "bsit" || r.programId === "bscs",
  );
  const allRegisteredIds = new Set(
    allCourseRegistrations
      .flatMap((r) => [r.studentId, r.studentUid])
      .filter(Boolean),
  );
  const allMatchedStudents = students.filter(
    (s) =>
      s.programId === "bsit" ||
      s.programId === "bscs" ||
      allRegisteredIds.has(s.studentId) ||
      allRegisteredIds.has(s.id),
  );
  const allMatchedIds = new Set(
    allMatchedStudents.flatMap((s) => [s.studentId, s.id]).filter(Boolean),
  );
  const allCourseStudents = [
    ...allMatchedStudents,
    ...allCourseRegistrations
      .filter(
        (r) =>
          !allMatchedIds.has(r.studentId) && !allMatchedIds.has(r.studentUid),
      )
      .map((r) => ({
        ...r,
        id: `registration-${r.id}`,
        studentId: r.studentId || r.studentUid,
        registrationStatus: r.status,
      })),
  ];
  const selectedSubjects = prospectusSubjects.filter((s) => s.programId === selectedCourse).sort((a, b) => (a.yearLevel || 0) - (b.yearLevel || 0) || (a.semester || 0) - (b.semester || 0));
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const id = form.id.trim().toLowerCase().replace(/\s+/g, "-");
      if (!id) throw new Error("Enter a record ID.");
      const data = isProgram
        ? { name: form.name.trim(), code: form.code.trim().toUpperCase() }
        : {
            code: form.code.trim().toUpperCase(),
            name: form.name.trim(),
            units: Number(form.units),
            semester: Number(form.semester),
            yearLevel: Number(form.yearLevel),
            programId: form.programId.trim().toLowerCase(),
            prerequisiteIds: form.prerequisiteIds
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean),
          };
      await addDoc(collection(db, isProgram ? "programs" : "subjects"), {
        ...data,
        recordId: id,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser.uid,
      });
      setMessage(
        `${isProgram ? "Course" : "Subject"} saved to the prospectus setup.`,
      );
      setForm(
        isProgram
          ? { id: "", name: "", code: "" }
          : { ...form, id: "", code: "", name: "" },
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="content">
      <div className="pagehead">
        <div>
          <p className="eyebrow">REGISTRAR · ACADEMIC SETUP</p>
          <h1>{isProgram ? "Courses" : "Prospectus subjects"}</h1>
          <p className="sub">
            Create the academic structure used by enrollment and advising. The
            BSIT 2021–2022 prospectus PDF is the reference format.
          </p>
        </div>
      </div>
      {!isProgram && (
        <form className="card formcard" onSubmit={save}>
          <div className="form-grid">
            <label>
              Record ID
              <input
                placeholder={isProgram ? "bsit" : "it-101"}
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                required
              />
            </label>
            <label>
              {isProgram ? "Course code" : "Subject code"}
              <input
                placeholder={isProgram ? "BSIT" : "IT 101"}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
              />
            </label>
            <label>
              {isProgram ? "Course name" : "Subject name"}
              <input
                placeholder={
                  isProgram
                    ? "Bachelor of Science in Information Technology"
                    : "Introduction to Computing"
                }
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            {!isProgram && (
              <>
                <label>
                  Course ID
                  <input
                    value={form.programId}
                    onChange={(e) =>
                      setForm({ ...form, programId: e.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Units
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={form.units}
                    onChange={(e) =>
                      setForm({ ...form, units: e.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Year level
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={form.yearLevel}
                    onChange={(e) =>
                      setForm({ ...form, yearLevel: e.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Semester
                  <input
                    type="number"
                    min="1"
                    max="3"
                    value={form.semester}
                    onChange={(e) =>
                      setForm({ ...form, semester: e.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Prerequisite IDs{" "}
                  <span className="muted">comma separated</span>
                  <input
                    placeholder="it-100, cs-101"
                    value={form.prerequisiteIds}
                    onChange={(e) =>
                      setForm({ ...form, prerequisiteIds: e.target.value })
                    }
                  />
                </label>
              </>
            )}
          </div>
          {message && <p className="success">{message}</p>}
          {error && <p className="error">{error}</p>}
          <button className="primary" disabled={busy}>
            <Plus size={15} />
            {busy ? "Saving…" : `Add ${isProgram ? "course" : "subject"}`}
          </button>
        </form>
      )}
      <div className="card tablecard">
        <div className="cardhead">
          <div>
            <h2>
              {isProgram ? 2 : records.length}{" "}
              {isProgram ? "available courses" : `live ${type.toLowerCase()}`}
            </h2>
            <p>
              Use the PDF prospectus as a guide when encoding subjects by year
              and semester.
            </p>
          </div>
        </div>
          {(isProgram ? courseCatalog : records).slice(0, 50).map((r) => (
          <button type="button" className={`activity course-row ${selectedCourse === r.id ? "selected" : ""}`} key={r.id} onClick={() => { if (isProgram) { setSelectedCourse(r.id); setSelectedYear("none"); } }}>
            <span className="dot green"></span>
            <div>
              <b>{r.code || r.name || r.id}</b>
              <small>
                {r.name || r.programId || "Academic record"}
                {!isProgram &&
                  ` · ${r.units || 0} units · Year ${r.yearLevel || "-"} · Sem ${r.semester || "-"}`}
              </small>
            </div>
            <ChevronRight size={16} />
          </button>
        ))}
      </div>
      {isProgram && <div className="card tablecard course-subjects"><div className="cardhead"><div><h2>{selectedCourse.toUpperCase()} prospectus</h2><p>Subjects for the selected course, organized by year and semester.</p></div></div>{selectedSubjects.length ? selectedSubjects.map(s=><div className="activity" key={s.id}><span className="dot green"></span><div><b>{s.code} · {s.name}</b><small>Year {s.yearLevel || "-"} · Semester {s.semester || "-"} · {s.units || 0} units</small></div><ChevronRight size={16}/></div>) : <div className="empty"><p>No subjects have been encoded for {selectedCourse.toUpperCase()} yet.</p></div>}</div>}
      {isProgram && (
        <div className="card tablecard program-students">
          <div className="cardhead">
            <div></div>
          </div>
          <div className="course-tabs"><button className={selectedCourse === "bsit" ? "active" : ""} onClick={() => setSelectedCourse("bsit")}>BSIT · {students.filter((s) => s.programId === "bsit").length}</button><button className={selectedCourse === "bscs" ? "active" : ""} onClick={() => setSelectedCourse("bscs")}>BSCS · {students.filter((s) => s.programId === "bscs").length}</button></div>
          <p className="course-roster-label">{selectedCourse.toUpperCase()} student roster · {visibleCourseStudents.length} registered</p>
          <div className="year-filter">{[1,2,3,4,5].map((year) => <button key={year} className={selectedYear === String(year) ? "active" : ""} onClick={() => setSelectedYear(String(year))}>{year}{year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th"} year</button>)}</div>
          {visibleCourseStudents.slice(0, 100).map((s) => (
            <div className="activity" key={s.id}>
              <span className="dot blue"></span>
              <div>
                <b>{s.name || s.studentId || s.studentNumber || s.id}</b>
                <small>
                  {s.studentNumber || "No student number"} ·{" "}
                  {s.programId || "Program not assigned"} · Year{" "}
                  {s.yearLevel || "-"}
                </small>
              </div>
              <ChevronRight size={16} />
            </div>
          ))}
          {selectedYear === "none" && (
            <div className="empty">
              <p>Select a year level above to view registered students.</p>
            </div>
          )}
          {selectedYear !== "none" && !visibleCourseStudents.length && (
            <div className="empty">
              <p>No students are registered in {selectedCourse.toUpperCase()} for this year level.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
function useRecords(path, constraints = []) {
  const [items, setItems] = useState([]);
  useEffect(
    () =>
      onSnapshot(
        constraints.length ? query(collection(db, path), ...constraints) : collection(db, path),
        (s) => setItems(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (e) => console.error(`Could not load ${path}`, e),
      ),
    [path, ...constraints],
  );
  return items;
}
function ActionMessage({ message, error }) {
  return <>{message && <p className="success">{message}</p>}{error && <p className="error">{error}</p>}</>;
}
function TermsManager() {
  const terms = useRecords("terms");
  const [label, setLabel] = useState(""), [message, setMessage] = useState(""), [error, setError] = useState("");
  const save = async (e) => { e.preventDefault(); try { await addDoc(collection(db, "terms"), { label: label.trim(), status: "active", createdAt: serverTimestamp() }); setLabel(""); setMessage("Academic term created."); } catch (err) { setError(err.message); } };
  return <section className="content"><div className="pagehead"><div><p className="eyebrow">REGISTRAR · ACADEMIC CALENDAR</p><h1>Terms</h1><p className="sub">Maintain the academic terms used by registration and advising.</p></div></div><form className="card formcard" onSubmit={save}><label>Term label<input value={label} onChange={(e)=>setLabel(e.target.value)} placeholder="AY 2026–2027 · 1st Sem" required/></label><button className="primary">Add term</button><ActionMessage message={message} error={error}/></form><div className="card tablecard">{terms.map((term)=><div className="activity" key={term.id}><span className="dot green"/><div><b>{term.label || term.id}</b><small>{term.academicYear || "Academic year not set"} · Semester {term.semester || "-"}</small></div><span className={term.status === "active" ? "pill" : "warn"}>{term.status || "draft"}</span></div>)}{!terms.length && <div className="empty"><p>No academic terms have been created.</p></div>}</div></section>;
}
function RegistrationDesk() {
  const students = useRecords("students"), payments = useRecords("payments"), registrations = useRecords("registrations");
  const [busy, setBusy] = useState(""), [message, setMessage] = useState(""), [error, setError] = useState("");
  const active = students.map((student) => ({ student, payment: payments.find((p) => p.studentUid === student.uid || p.studentId === student.studentId), registration: registrations.find((r) => r.studentUid === student.uid && r.termId === "ay25-26-1") }));
  const call = async (name, data, label) => { setBusy(label); setMessage(""); setError(""); try { await httpsCallable(functions, name)(data); setMessage(`${label} completed.`); } catch (e) { setError(e.message); } finally { setBusy(""); } };
  return <section className="content"><div className="pagehead"><div><p className="eyebrow">REGISTRAR · ENROLLMENT</p><h1>Registration desk</h1><p className="sub">Verify down payments and place students into advising for the active term.</p></div></div><ActionMessage message={message} error={error}/><div className="card tablecard"><div className="cardhead"><div><h2>{active.length} student records</h2><p>AY 2025–2026 · 1st Semester</p></div></div>{active.map(({student,payment,registration}) => <div className="activity" key={student.uid || student.id}><span className="dot blue"/><div><b>{student.name || student.studentId}</b><small>{student.studentId || "No student ID"} · {student.programId?.toUpperCase()} · Year {student.yearLevel || "-"}</small></div><div className="row-actions"><span className={payment?.downPaymentVerified ? "pill" : "warn"}>{payment?.downPaymentVerified ? "Payment verified" : "Payment pending"}</span>{payment && !payment.downPaymentVerified && <button className="primary" disabled={!!busy} onClick={() => call("verifyPayment", { paymentId: payment.id }, "Payment verification")}>Verify</button>}{!registration && payment?.downPaymentVerified && <button className="primary" disabled={!!busy} onClick={() => call("registerStudent", { studentUid: student.uid, studentId: student.studentId, termId: "ay25-26-1", programId: student.programId, paymentRef: payment.reference || payment.id }, "Registration")}>Register</button>}{registration && <span className="pill">{registration.status}</span>}</div></div>)}{!active.length && <div className="empty"><p>No student records are available.</p></div>}</div></section>;
}
function AdvisingDesk({ profile }) {
  const registrations = useRecords("registrations", [where("programId", "==", profile?.programId || "__loading__")]), offerings = useRecords("offerings");
  const queue = registrations.filter((r) => r.status === "advising" && (!profile?.programId || r.programId === profile.programId));
  const [selected, setSelected] = useState(null), [chosen, setChosen] = useState([]), [message, setMessage] = useState(""), [error, setError] = useState("");
  const finalize = async () => { setMessage(""); setError(""); try { await httpsCallable(functions, "finalizeAdvising")({ registrationId: selected.id, enrollments: chosen.map((id) => ({ offeringId: id })) }); setMessage("Advising finalized and enrollment records created."); setSelected(null); setChosen([]); } catch (e) { setError(e.message); } };
  return <section className="content"><div className="pagehead"><div><p className="eyebrow">PROGRAM CHAIR · ADVISING</p><h1>Advising desk</h1><p className="sub">Review payment-cleared registrations and assign current offerings.</p></div></div><ActionMessage message={message} error={error}/><div className="grid2"><div className="card tablecard"><div className="cardhead"><div><h2>{queue.length} students awaiting advising</h2><p>Only students in your program are shown.</p></div></div>{queue.map((r) => <button className="activity course-row" key={r.id} onClick={() => {setSelected(r);setChosen([])}}><span className="dot amber"/><div><b>{r.studentName || r.studentId}</b><small>{r.studentId} · {r.programId?.toUpperCase()} · {r.termId}</small></div><ChevronRight size={16}/></button>)}{!queue.length && <div className="empty"><p>No students are waiting for advising.</p></div>}</div><div className="card"><div className="cardhead"><div><h2>{selected ? `Offerings for ${selected.studentName || selected.studentId}` : "Select a student"}</h2><p>Choose one or more available sections.</p></div></div>{selected && offerings.filter((o) => o.programId === selected.programId).map((o) => <label className="checkrow" key={o.id}><input type="checkbox" checked={chosen.includes(o.id)} onChange={(e) => setChosen(e.target.checked ? [...chosen,o.id] : chosen.filter((id) => id !== o.id))}/><span><b>{o.subjectCode || o.subjectId}</b><small>{o.subjectName || o.sectionName} · {o.schedule || o.room || "Schedule pending"}</small></span></label>)}{selected && <button className="primary" disabled={!chosen.length} onClick={finalize}>Finalize advising</button>}</div></div></section>;
}
/* function ScheduleDesk({ role, profile }) {
  const offerings = useRecords("offerings");
  const enrollments = useRecords("enrollments");
  const [form, setForm] = useState({ subjectId: "", subjectCode: "", subjectName: "", sectionName: "", schedule: "", room: "", teacherUid: "", teacherName: "", maxSlots: "40" }), [message, setMessage] = useState(""), [error, setError] = useState("");
  const subjects = useRecords("subjects").filter((s) => role !== "chair" || s.programId === profile?.programId);
  const createOffering = async (e) => { e.preventDefault(); setMessage(""); setError(""); try { await httpsCallable(functions, "createOffering")({ ...form, programId: profile?.programId || subjects.find((s) => s.id === form.subjectId)?.programId, termId: "ay25-26-1", maxSlots: Number(form.maxSlots) }); setMessage("Offering created."); setForm({ subjectId:"",subjectCode:"",subjectName:"",sectionName:"",schedule:"",room:"",teacherUid:"",teacherName:"",maxSlots:"40" }); } catch (err) { setError(err.message); } };
  const studentOfferingIds = new Set(enrollments.filter((e) => e.studentUid === auth.currentUser?.uid).map((e) => e.offeringId));
  const visible = role === "chair" ? offerings.filter((o) => o.programId === profile?.programId) : role === "teacher" ? offerings.filter((o) => o.teacherUid === auth.currentUser?.uid) : offerings.filter((o) => studentOfferingIds.has(o.id));
  return <section className="content"><div className="pagehead"><div><p className="eyebrow">{prettyRole(role).toUpperCase()} · SCHEDULE</p><h1>{role === "teacher" ? "Teaching schedule" : "Class offerings"}</h1><p className="sub">Live sections, assigned faculty, times, and rooms.</p></div></div>{role === "chair"" && <form className="card formcard" onSubmit={createOffering}><h2>Create section offering</h2><div className="form-grid"><label>Subject<select value={form.subjectId} onChange={(e)=>{const s=subjects.find((x)=>x.id===e.target.value);setForm({...form,subjectId:e.target.value,subjectCode:s?.code||"",subjectName:s?.name||""})}} required><option value="">Select subject</option>{subjects.map((s)=><option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}</select></label><label>Section<input value={form.sectionName} onChange={(e)=>setForm({...form,sectionName:e.target.value})} required/></label><label>Teacher UID<input value={form.teacherUid} onChange={(e)=>setForm({...form,teacherUid:e.target.value})}/></label><label>Teacher name<input value={form.teacherName} onChange={(e)=>setForm({...form,teacherName:e.target.value})}/></label><label>Schedule<input value={form.schedule} onChange={(e)=>setForm({...form,schedule:e.target.value})} required/></label><label>Room<input value={form.room} onChange={(e)=>setForm({...form,room:e.target.value})} required/></label></div><button className="primary">Create offering</button><ActionMessage message={message} error={error}/></form>}<div className="card tablecard">{visible.map((o) => <div className="activity" key={o.id}><span className="dot green"/><div><b>{o.subjectCode || o.subjectId} · {o.sectionName || "Section"}</b><small>{o.teacherName || o.teacherUid || "Faculty pending"} · {o.schedule || "Schedule pending"} · {o.room || "Room pending"}</small></div><span className="pill">{o.termId || "Active term"}</span></div>)}{!visible.length && <div className="empty"><p>No class offerings are available for this account.</p></div>}</div></section>;
}
*/
function ScheduleDesk({ role, profile }) {
  const offerings = useRecords("offerings"), enrollments = useRecords("enrollments"), subjects = useRecords("subjects");
  const [form, setForm] = useState({ subjectId: "", sectionName: "", schedule: "", room: "", teacherUid: "", teacherName: "" }), [message, setMessage] = useState(""), [error, setError] = useState("");
  const visible = role === "chair" ? offerings.filter((o) => o.programId === profile?.programId) : role === "teacher" ? offerings.filter((o) => o.teacherUid === auth.currentUser?.uid) : offerings.filter((o) => enrollments.some((e) => e.studentUid === auth.currentUser?.uid && e.offeringId === o.id));
  const createOffering = async (e) => { e.preventDefault(); const subject = subjects.find((s) => s.id === form.subjectId); try { await httpsCallable(functions, "createOffering")({ ...form, programId: profile?.programId || subject?.programId, subjectCode: subject?.code, subjectName: subject?.name, termId: "ay25-26-1" }); setMessage("Offering created."); } catch (err) { setError(err.message); } };
  return <section className="content"><div className="pagehead"><div><p className="eyebrow">{prettyRole(role).toUpperCase()} · SCHEDULE</p><h1>{role === "teacher" ? "Teaching schedule" : "Class offerings"}</h1><p className="sub">Live sections, assigned faculty, times, and rooms.</p></div></div>{role === "chair" && <form className="card formcard" onSubmit={createOffering}><h2>Create section offering</h2><div className="form-grid"><label>Subject<select value={form.subjectId} onChange={(e)=>setForm({...form,subjectId:e.target.value})} required><option value="">Select subject</option>{subjects.filter((s)=>s.programId===profile?.programId).map((s)=><option key={s.id} value={s.id}>{s.code} · {s.name}</option>)}</select></label><label>Section<input value={form.sectionName} onChange={(e)=>setForm({...form,sectionName:e.target.value})} required/></label><label>Teacher UID<input value={form.teacherUid} onChange={(e)=>setForm({...form,teacherUid:e.target.value})}/></label><label>Teacher name<input value={form.teacherName} onChange={(e)=>setForm({...form,teacherName:e.target.value})}/></label><label>Schedule<input value={form.schedule} onChange={(e)=>setForm({...form,schedule:e.target.value})} required/></label><label>Room<input value={form.room} onChange={(e)=>setForm({...form,room:e.target.value})} required/></label></div><button className="primary">Create offering</button><ActionMessage message={message} error={error}/></form>}<div className="card tablecard">{visible.map((o)=><div className="activity" key={o.id}><span className="dot green"/><div><b>{o.subjectCode || o.subjectId} · {o.sectionName || "Section"}</b><small>{o.teacherName || o.teacherUid || "Faculty pending"} · {o.schedule || "Schedule pending"} · {o.room || "Room pending"}</small></div><span className="pill">{o.termId || "Active term"}</span></div>)}{!visible.length && <div className="empty"><p>No class offerings are available for this account.</p></div>}</div></section>;
}
function GradesDesk({ role, profile }) {
  const grades = useRecords("gradeAttempts");
  const visible = role === "student" ? grades.filter((g) => g.studentUid === auth.currentUser?.uid) : grades;
  const offerings = useRecords("offerings");
  const enrollments = useRecords("enrollments");
  const [form, setForm] = useState({ enrollmentId: "", grade: "", remark: "" }), [message, setMessage] = useState(""), [error, setError] = useState("");
  const submit = async (e) => { e.preventDefault(); const enrollment = enrollments.find((x) => x.id === form.enrollmentId); if (!enrollment) return; setMessage(""); setError(""); try { await httpsCallable(functions, "submitGrade")({ ...enrollment, grade: form.grade, remark: form.remark || undefined }); setMessage("Grade submitted successfully."); setForm({ enrollmentId: "", grade: "", remark: "" }); } catch (err) { setError(err.message); } };
  return <section className="content"><div className="pagehead"><div><p className="eyebrow">{prettyRole(role).toUpperCase()} · GRADES</p><h1>{role === "student" ? "My grades" : "Faculty grading"}</h1><p className="sub">{role === "student" ? "Your finalized academic history." : "Enter and submit grades for assigned enrollments."}</p></div></div><ActionMessage message={message} error={error}/>{role !== "student" && <form className="card formcard" onSubmit={submit}><h2>Submit a grade</h2><label>Enrollment<select value={form.enrollmentId} onChange={(e)=>setForm({...form,enrollmentId:e.target.value})} required><option value="">Select enrolled student</option>{enrollments.map((e)=><option key={e.id} value={e.id}>{e.studentId || e.studentUid} · {e.subjectCode || e.offeringId}</option>)}</select></label><label>Grade (1.00–5.00)<input type="number" min="1" max="5" step="0.01" value={form.grade} onChange={(e)=>setForm({...form,grade:e.target.value})} required/></label><label>Remark<select value={form.remark} onChange={(e)=>setForm({...form,remark:e.target.value})}><option value="">Automatic</option><option>PASSED</option><option>FAILED</option><option>INC</option><option>DRP</option></select></label><button className="primary">Submit grade</button></form>}<div className="card tablecard">{visible.map((g) => <div className="activity" key={g.id}><span className="dot purple"/><div><b>{g.subjectCode || g.subjectName || g.offeringId}</b><small>{g.studentId || g.studentUid} · Term {g.termId}</small></div><span className={g.remark === "PASSED" ? "pill" : "warn"}>{g.grade?.toFixed ? g.grade.toFixed(2) : g.grade} · {g.remark || "Pending"}</span></div>)}{!visible.length && <div className="empty"><p>No grade records are available.</p></div>}</div></section>;
}
function FeesDesk({ user, profile }) {
  const fees = useRecords("fees", [where("studentUid", "==", user.uid)]), payments = useRecords("payments", [where("studentUid", "==", user.uid)]);
  const mine = (item) => item.studentUid === user.uid;
  const [reference, setReference] = useState(""), [amount, setAmount] = useState(""), [message, setMessage] = useState(""), [error, setError] = useState("");
  const submit = async (e) => { e.preventDefault(); setMessage(""); setError(""); try { await addDoc(collection(db,"payments"), { studentUid:user.uid, studentId:profile?.studentId || null, programId:profile?.programId || null, termId:"ay25-26-1", reference:reference.trim(), amount:Number(amount), method:"Cashier", downPaymentVerified:false, createdAt:serverTimestamp() }); setReference("");setAmount("");setMessage("Payment proof submitted for registrar review."); } catch (err) { setError(err.message); } };
  return <section className="content"><div className="pagehead"><div><p className="eyebrow">STUDENT · FEES</p><h1>Fees and payments</h1><p className="sub">Review your assessment and submit payment proof.</p></div></div><ActionMessage message={message} error={error}/><div className="grid2"><div className="card tablecard"><div className="cardhead"><div><h2>Assessment</h2><p>Current term fee records</p></div></div>{fees.filter(mine).map((f) => <div className="activity" key={f.id}><div><b>{f.label || f.description || "Assessment"}</b><small>₱{Number(f.amount || 0).toLocaleString()}</small></div></div>)}{payments.filter(mine).map((p) => <div className="activity" key={p.id}><div><b>Payment · {p.reference || p.id}</b><small>₱{Number(p.amount || 0).toLocaleString()}</small></div><span className={p.downPaymentVerified ? "pill" : "warn"}>{p.downPaymentVerified ? "Verified" : "Pending"}</span></div>)}</div><form className="card formcard" onSubmit={submit}><h2>Submit payment proof</h2><label>Transaction reference<input value={reference} onChange={(e)=>setReference(e.target.value)} required/></label><label>Amount<input type="number" min="1" value={amount} onChange={(e)=>setAmount(e.target.value)} required/></label><button className="primary">Submit payment</button></form></div></section>;
}
function CurriculumDesk({ profile }) {
  const subjects = useRecords("subjects").filter((s) => s.programId === profile?.programId).sort((a,b) => Number(a.yearLevel||0)-Number(b.yearLevel||0));
  return <section className="content"><div className="pagehead"><div><p className="eyebrow">STUDENT · CURRICULUM</p><h1>{profile?.programId?.toUpperCase() || "Course"} prospectus</h1><p className="sub">Your degree subjects grouped by year level and semester.</p></div></div><div className="card tablecard">{subjects.map((s) => <div className="activity" key={s.id}><span className="dot green"/><div><b>{s.code} · {s.name}</b><small>Year {s.yearLevel || "-"} · Semester {s.semester || "-"} · {s.units || 0} units</small></div><span className="pill">Available</span></div>)}{!subjects.length && <div className="empty"><p>No curriculum subjects have been encoded for your course.</p></div>}</div></section>;
}
function Overview({ role, name, profile }) {
  const students = useRecords("students", role === "student" ? [where("uid", "==", auth.currentUser?.uid)] : role === "chair" ? [where("programId", "==", profile?.programId || "__loading__")] : []),
    registrations = useRecords("registrations", role === "student" ? [where("studentUid", "==", auth.currentUser?.uid)] : role === "chair" ? [where("programId", "==", profile?.programId || "__loading__")] : []),
    announcements = useRecords("announcements"),
    grades = useRecords("gradeAttempts");
  const metrics =
    role === "student"
      ? [
          [
            "Registration status",
            registrations.length ? "Enrolled" : "Not registered",
            "live from Firestore",
          ],
          ["Announcements", announcements.length, "available to you"],
          ["Grade attempts", grades.length, "historical records"],
          ["Account status", "Active", "Firebase Authentication"],
        ]
      : [
          ["Students", students.length, "live records"],
          ["Registrations", registrations.length, "current records"],
          ["Announcements", announcements.length, "published records"],
          ["Grade attempts", grades.length, "submitted records"],
        ];
  return (
    <section className="content">
      <div className="hero">
        <div>
          <p className="eyebrow">{prettyRole(role).toUpperCase()}</p>
          <h1>Welcome, {name.split(" ")[0]}.</h1>
          <p className="sub">
            Your workspace is connected to live school records.
          </p>
        </div>
      </div>
      <div className="metrics">
        {metrics.map((m) => (
          <div className="metric" key={m[0]}>
            <div className="metric-top">
              <span>{m[0]}</span>
              <CheckCircle2 size={15} />
            </div>
            <strong>{m[1]}</strong>
            <small>{m[2]}</small>
          </div>
        ))}
      </div>
      <div className="card">
        <h2>Live workspace</h2>
        <p>
          Data shown here is loaded from Firebase for your signed-in account.
        </p>
      </div>
    </section>
  );
}
function Page({ page, role }) {
  const canWrite = role === "registrar" || role === "chair",
    [showForm, setShowForm] = useState(false),
    [title, setTitle] = useState(""),
    [body, setBody] = useState(""),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const path =
      page === "Students"
        ? "students"
        : page === "Announcements"
          ? "announcements"
          : page === "Grades"
            ? "gradeAttempts"
            : page === "Schedule"
              ? "offerings"
              : "registrations",
    records = useRecords(path);
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "announcements"), {
        title: title.trim(),
        body: body.trim(),
        scope: "school",
        author: auth.currentUser.displayName || auth.currentUser.email,
        createdAt: serverTimestamp(),
      });
      setTitle("");
      setBody("");
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="content">
      <div className="pagehead">
        <div>
          <p className="eyebrow">
            {prettyRole(role).toUpperCase()} · {page.toUpperCase()}
          </p>
          <h1>{page === "Announcements" ? "Bulletin board" : page}</h1>
          <p className="sub">
            Live records for your account and current permissions.
          </p>
        </div>
        {page === "Announcements" && canWrite && (
          <button className="primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> New announcement
          </button>
        )}
      </div>
      {showForm && (
        <form className="card formcard" onSubmit={save}>
          <label>
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>
          <label>
            Message
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows="4"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary" disabled={saving}>
            {saving ? "Publishing…" : "Publish"}
          </button>
        </form>
      )}
      <div className="card tablecard">
        <div className="cardhead">
          <div>
            <h2>
              {records.length
                ? `${records.length} live record${records.length === 1 ? "" : "s"}`
                : "No records yet"}
            </h2>
            <p>Updated automatically from Firestore.</p>
          </div>
        </div>
        {records.slice(0, 25).map((r) => (
          <div className="activity" key={r.id}>
            <span className="dot blue"></span>
            <div>
              <b>
                {r.title ||
                  r.name ||
                  r.subjectId ||
                  r.studentId ||
                  r.status ||
                  r.id}
              </b>
              <small>
                {r.body || r.email || r.role || r.programId || "Record"}
              </small>
            </div>
            <ChevronRight size={16} />
          </div>
        ))}
        {!records.length && (
          <div className="empty">
            <p>
              No live records are available or your role does not have access.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
createRoot(document.getElementById("root")).render(<App />);
