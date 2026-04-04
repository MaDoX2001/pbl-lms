import { chromium } from 'playwright';

const API = 'https://pbl-lms-backend.onrender.com/api';
const WEB = 'https://pbl-lms-phi.vercel.app';
const PROJECT_ID = '69b871c4a5e036badee888b8';

const STUDENT_EMAIL = 'maaadooo20.01@gmail.com';
const STUDENT_PASSWORD = 'Mad0.2oo1';
const ADMIN_EMAIL = 'admin@pbl-lms.com';
const ADMIN_PASSWORD = 'Admin@123456';

async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status}`);
  }

  const json = await res.json();
  const token = json?.data?.token;
  if (!token) {
    throw new Error(`No token returned for ${email}`);
  }
  return token;
}

function buildLatestMap(rows) {
  const map = new Map();
  const sorted = [...rows].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  for (const row of sorted) {
    const submitterId = String(row?.submittedBy?._id || row?.submittedBy || '');
    const stage = String(row?.stageKey || '');
    const key = stage === 'programming' ? `programming:${submitterId}` : stage;
    if (!map.has(key)) {
      map.set(key, String(row?._id || ''));
    }
  }

  return map;
}

async function captureStudentHistory(page, teamId) {
  const target = `${API}/team-submissions/wokwi/${teamId}/${PROJECT_ID}`;
  const response = await page.waitForResponse(
    (res) => res.url().startsWith(target) && res.status() === 200,
    { timeout: 60000 }
  );
  const payload = await response.json();
  return payload?.data || [];
}

async function captureTeacherSubmissions(page, teamId) {
  const target = `${API}/team-submissions/project/${PROJECT_ID}`;
  const response = await page.waitForResponse(
    (res) => res.url().startsWith(target) && res.status() === 200,
    { timeout: 60000 }
  );
  const payload = await response.json();
  const all = payload?.data || [];
  return all.filter((row) => {
    const rowTeamId = String(row?.team?._id || row?.team || '');
    return rowTeamId === String(teamId);
  });
}

async function main() {
  const studentToken = await login(STUDENT_EMAIL, STUDENT_PASSWORD);
  const adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);

  const teamRes = await fetch(`${API}/teams/my-team`, {
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  if (!teamRes.ok) {
    throw new Error(`Failed to resolve student team: ${teamRes.status}`);
  }
  const teamJson = await teamRes.json();
  const teamId = String(teamJson?.data?._id || '');
  if (!teamId) {
    throw new Error('No teamId resolved for student');
  }

  const browser = await chromium.launch({ headless: true });

  const studentContext = await browser.newContext();
  await studentContext.addInitScript((token) => {
    window.localStorage.setItem('token', token);
  }, studentToken);
  const studentPage = await studentContext.newPage();
  await studentPage.goto(`${WEB}/arduino-simulator?projectId=${PROJECT_ID}`, { waitUntil: 'domcontentloaded' });
  const studentRows = await captureStudentHistory(studentPage, teamId);

  const teacherContext = await browser.newContext();
  await teacherContext.addInitScript((token) => {
    window.localStorage.setItem('token', token);
  }, adminToken);
  const teacherPage = await teacherContext.newPage();
  await teacherPage.goto(`${WEB}/projects/${PROJECT_ID}/submissions`, { waitUntil: 'domcontentloaded' });
  const teacherRows = await captureTeacherSubmissions(teacherPage, teamId);

  const studentLatest = buildLatestMap(studentRows);
  const teacherLatest = buildLatestMap(teacherRows);

  const keys = new Set([...studentLatest.keys(), ...teacherLatest.keys()]);
  const checks = [];
  for (const key of [...keys].sort()) {
    const s = studentLatest.get(key) || '';
    const t = teacherLatest.get(key) || '';
    checks.push({ key, studentId: s, teacherId: t, match: s === t });
  }

  await studentContext.close();
  await teacherContext.close();
  await browser.close();

  const allMatch = checks.every((c) => c.match);
  const summary = {
    ok: allMatch,
    projectId: PROJECT_ID,
    teamId,
    studentCount: studentRows.length,
    teacherCount: teacherRows.length,
    checks
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!allMatch) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
