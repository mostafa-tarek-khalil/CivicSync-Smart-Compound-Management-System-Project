// Verify the two things that were broken: the countdown must tick, and a correct
// code must redirect. Runs against the real backend; the OTP is read from the
// capture file written by the backend's QA hook.
import fs from 'node:fs';

export default async function run(page, ui) {
  const s = {};
  const OTP_FILE = 'c:\\Users\\DELL\\Desktop\\CivicSync\\qa-otp.txt';

  // Clean any stale capture so we know the code is for THIS visit.
  try { fs.unlinkSync(OTP_FILE); } catch { /* ignore */ }

  // ---------- Create a real request + OTP ----------
  const setup = await page.evaluate(async () => {
    const units = await fetch('http://localhost:3000/api/visits/visitor-units').then(r => r.json());
    const unit = (units?.data || [])[0];
    const buildingId = typeof unit.buildingId === 'object' ? unit.buildingId?._id : unit.buildingId;

    const req = await fetch('http://localhost:3000/api/visits/visitor-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buildingId, unitId: unit._id,
        visitorName: 'QA Counter', visitorEmail: 'qa.counter@civicsync.test',
        visitorPhone: '01000000021',
        visitDate: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10),
        visitStartTime: '10:00', purpose: 'counter check'
      })
    }).then(r => r.json());

    const visitId = req?.data?.visitId;
    const send = await fetch(
      `http://localhost:3000/api/visits/visitor-requests/${visitId}/otp`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    ).then(r => r.json());

    return { ok: Boolean(visitId), visitId, expiresAt: send?.data?.expiresAt };
  });

  s.setup = setup;
  if (!setup?.ok) return { ...s, error: 'could not create a visitor request' };

  // Read the captured OTP (real backend-issued code).
  let otp = '';
  for (let i = 0; i < 12 && !otp; i++) {
    await page.waitForTimeout(500);
    try { otp = fs.readFileSync(OTP_FILE, 'utf8').trim(); } catch { /* not yet */ }
  }
  s.otpCaptured = /^\d{6}$/.test(otp);
  if (!s.otpCaptured) return { ...s, error: 'no OTP captured from the backend' };

  // ---------- Land on the OTP page with a tracked visit ----------
  await page.goto('http://localhost:4200/visitor-request', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.evaluate((visitId) => {
    localStorage.setItem('civicsync.visitor-flow', JSON.stringify({
      requestId: visitId, visitorName: 'QA Counter',
      visitorEmail: 'qa.counter@civicsync.test', visitorPhone: '01000000021',
      residentName: '', building: 'Building A', unit: '1',
      buildingId: '', unitId: '', visitDate: '', startTime: '10:00',
      purpose: 'counter check', status: 'PENDING',
      qrExpiresAt: '', checkInTime: '', checkOutTime: '', visitorChatToken: ''
    }));
  }, setup.visitId);

  await page.goto('http://localhost:4200/otp-verification', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('.otp-input', { timeout: 30000 }).catch(() => { });

  s.urlOnLoad = page.url().replace('http://localhost:4200', '');
  s.inputCount = await page.locator('.otp-input').count();
  if (s.inputCount !== 6) return { ...s, error: 'OTP page did not render' };

  // ---------- COUNTDOWN MUST TICK ----------
  const readLabel = () =>
    page.locator('.otp-expiry').first().innerText({ timeout: 3000 }).catch(() => '');

  const first = await readLabel();
  await page.waitForTimeout(3200);
  const second = await readLabel();

  s.countdownFirst = first;
  s.countdownSecond = second;

  const toSeconds = (label) => {
    const m = label.match(/(\d+):(\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
  };

  s.countdownTicked = toSeconds(second) > 0 && toSeconds(second) < toSeconds(first);
  s.secondsDropped = toSeconds(first) - toSeconds(second);

  // ---------- CORRECT CODE MUST REDIRECT ----------
  const inputs = page.locator('.otp-input');
  for (let i = 0; i < 6; i++) {
    await inputs.nth(i).fill(otp[i]);
  }
  await page.waitForTimeout(200);
  await page.locator('.submit-btn').click();

  await page.waitForSelector('.card.success', { timeout: 20000 }).catch(() => { });
  s.successShown = (await page.locator('.card.success').count()) > 0;
  s.buttonText = await page.locator('.submit-btn').innerText().catch(() => '');

  if (s.successShown) {
    await page.locator('.submit-btn').click();
    await page.waitForTimeout(3000);
    s.urlAfterContinue = page.url().replace('http://localhost:4200', '');
    s.redirected = s.urlAfterContinue.includes('visitor-request-status');
  }

  return s;
}