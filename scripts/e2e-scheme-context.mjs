/**
 * E2E verification of the scheme → plan context flow.
 *
 * Drives the UI with Playwright and checks:
 *
 *   1. Ambiguous questions prompt for a scheme (raw context JSON stripped).
 *   2. Choosing a scheme shows its plans *below* it with an "All plans" chip
 *      selected by default and a 3s countdown — and does NOT hit the backend
 *      yet (the regression this flow fixes).
 *   3. Picking a specific plan inside the window sends just that plan;
 *      letting the window lapse continues with all of the scheme's plans;
 *      clicking "All plans" continues immediately.
 *   4. Reloading starts a new conversation (no persisted session id, no
 *      resumed scheme) and the next question re-prompts for a scheme.
 *   5. The pill's clear button resets the agent-side context.
 *   6. "New chat" returns to a clean slate.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 node scripts/e2e-scheme-context.mjs
 *   just e2e-gcp            # against the deployed GCP service
 *   BASE_URL=http://localhost:3000 HEADED=1 node scripts/e2e-scheme-context.mjs
 */

import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);

const BASE_URL = process.env.BASE_URL ?? 'https://medaid-advisor-ui-kreiev32cq-bq.a.run.app';
const USERNAME = process.env.DEMO_USERNAME ?? 'advisor';
const PASSWORD = process.env.DEMO_PASSWORD ?? 'advisor';
const HEADED = process.env.HEADED === '1';
const ARTIFACTS = path.resolve('e2e-artifacts');

const TRIGGER = 'I would like to compare medical aid schemes. What schemes are available?';
const FOLLOW_UP = 'What does a hospital plan cover?';
const BONITAS = 'Bonitas Medical Fund';
const DISCOVERY = 'Discovery Health Medical Scheme';
const PLAN_DECISION_MS = 3000;

function loadPlaywright() {
  const candidates = [];
  if (process.env.PLAYWRIGHT_MODULE) candidates.push(process.env.PLAYWRIGHT_MODULE);
  candidates.push('playwright', '@playwright/test');
  for (const id of candidates) {
    try {
      return require(id);
    } catch {
      /* keep looking */
    }
  }
  const npxRoot = path.join(os.homedir(), '.npm', '_npx');
  if (existsSync(npxRoot)) {
    for (const dir of readdirSync(npxRoot)) {
      const pkg = path.join(npxRoot, dir, 'node_modules', 'playwright');
      if (existsSync(pkg)) {
        try {
          return require(pkg);
        } catch {
          /* try next */
        }
      }
    }
  }
  throw new Error(
    'Could not resolve the "playwright" module. Install it (npm i -D playwright) ' +
      'or set PLAYWRIGHT_MODULE=/path/to/node_modules/playwright.',
  );
}

const { chromium } = loadPlaywright();

// ---------------------------------------------------------------------------
// Tiny reporting harness
// ---------------------------------------------------------------------------

const results = [];
let currentScenario = '';

async function scenario(name, fn) {
  currentScenario = name;
  console.log(`\n▶ ${name}`);
  try {
    await fn();
  } catch (err) {
    record(`${name} (aborted)`, false, err.message);
  }
}

async function step(name, fn) {
  const full = `${currentScenario} › ${name}`;
  try {
    await fn();
    record(full, true);
  } catch (err) {
    record(full, false, err.message);
  }
}

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`   ${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : `\n       ↳ ${detail}`}`);
}

function expect(cond, msg) {
  if (!cond) throw new Error(msg);
}

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------

const TEXTAREA = 'textarea[placeholder^="Ask about medical aid plans"]';
const SUBMIT = 'form button[type="submit"]';

async function send(page, text) {
  const ta = page.locator(TEXTAREA);
  const submit = page.locator(SUBMIT);
  await ta.waitFor({ state: 'visible' });
  await ta.click();

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    await ta.fill('');
    await ta.pressSequentially(text, { delay: 5 });
    await page.waitForTimeout(150);
    if (await submit.isEnabled()) break;
    await page.waitForTimeout(250);
  }
  if (!(await submit.isEnabled())) {
    throw new Error('chat input never became interactive (React hydration did not complete)');
  }
  await submit.click();
}

function isChatRequest(req) {
  return req.method() === 'POST' && req.url().includes('/api/chat');
}

/** Wait until the in-flight chat turn has finished. */
async function waitForIdle(page, timeout = 90_000) {
  const startDeadline = Date.now() + 8_000;
  while (Date.now() < startDeadline) {
    const spinner = await page.locator(`${SUBMIT} svg.animate-spin`).count();
    if (inflight.size > 0 || spinner > 0) break;
    await page.waitForTimeout(100);
  }

  const deadline = Date.now() + timeout;
  let clearSamples = 0;
  while (Date.now() < deadline) {
    const spinner = await page.locator(`${SUBMIT} svg.animate-spin`).count();
    if (inflight.size === 0 && spinner === 0) {
      if (++clearSamples >= 3) return;
    } else {
      clearSamples = 0;
    }
    await page.waitForTimeout(200);
  }
  throw new Error('timed out waiting for the chat turn to finish');
}

function schemeChip(page, name) {
  return page.getByRole('button', { name, exact: true });
}

async function waitForSchemeChips(page, timeout = 90_000) {
  await schemeChip(page, BONITAS).waitFor({ state: 'visible', timeout });
  await schemeChip(page, DISCOVERY).waitFor({ state: 'visible', timeout });
}

function allPlansChip(page) {
  return page.getByRole('button', { name: 'Use all plans' });
}

async function waitForPlanDecision(page, timeout = 30_000) {
  await page.getByText('Select a plan').waitFor({ state: 'visible', timeout });
  await allPlansChip(page).waitFor({ state: 'visible', timeout });
}

function clearButton(page) {
  return page.getByRole('button', { name: 'Clear scheme context' });
}

async function pillText(page) {
  return clearButton(page).evaluate((el) => el.parentElement?.textContent?.replace(/\s+/g, ' ').trim());
}

const chatRequests = [];
const inflight = new Set();
const resetResponses = [];
const consoleErrors = [];

function nonResetRequests() {
  return chatRequests.filter((r) => !r.isReset);
}

async function waitForChatRequest(page, predicate, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const found = chatRequests.find(predicate);
    if (found) return found;
    await page.waitForTimeout(150);
  }
  throw new Error('timed out waiting for a matching chat request');
}

async function login(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/login/, { timeout: 30_000 });
  await page.fill('#username', USERNAME);
  await page.fill('#password', PASSWORD);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 }),
    page.getByRole('button', { name: /Sign In to Workspace/i }).click(),
  ]);
}

async function openSchemePrompt(page) {
  await page.goto(`${BASE_URL}/chat`, { waitUntil: 'domcontentloaded' });
  await send(page, TRIGGER);
  await waitForSchemeChips(page);
  await waitForIdle(page);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(ARTIFACTS, `${name}.png`), fullPage: true });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

mkdirSync(ARTIFACTS, { recursive: true });
console.log(`Target:  ${BASE_URL}`);
console.log(`Browser: ${HEADED ? 'headed' : 'headless'} chromium (system chrome)`);

const browser = await chromium.launch({ channel: 'chrome', headless: !HEADED });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(60_000);

page.on('request', (req) => {
  if (!isChatRequest(req)) return;
  inflight.add(req);
  const isReset = req.url().includes('/api/chat/reset');
  let body = {};
  try {
    body = req.postDataJSON() ?? {};
  } catch {
    /* ignore */
  }
  chatRequests.push({
    isReset,
    sessionId: body.sessionId,
    message: body.message,
    ts: Date.now(),
  });
});
page.on('requestfinished', (req) => inflight.delete(req));
page.on('requestfailed', (req) => inflight.delete(req));
page.on('response', async (res) => {
  if (!res.url().includes('/api/chat/reset')) return;
  let body = '';
  try {
    body = await res.text();
  } catch {
    /* ignore */
  }
  resetResponses.push({ status: res.status(), body });
});
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

try {
  // -- Auth -----------------------------------------------------------------
  await scenario('Authentication', async () => {
    await step('unauthenticated visit redirects to /login', async () => {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForURL(/\/login/, { timeout: 30_000 });
      expect(page.url().includes('/login'), `expected /login, got ${page.url()}`);
    });
    await step('signs in and leaves the login page', async () => {
      await login(page);
      expect(!page.url().includes('/login'), 'still on /login after submit');
    });
  });

  // -- 1. Fresh turn prompts for a scheme ----------------------------------
  await scenario('Fresh conversation prompts for a scheme', async () => {
    await step('trigger message renders scheme chips', async () => {
      await openSchemePrompt(page);
    });
    await step('"Select a scheme" prompt is visible', async () => {
      await page.getByText('Select a scheme').waitFor({ state: 'visible' });
    });
    await step('raw context JSON is stripped from the transcript', async () => {
      const text = await page.locator('main, body').first().innerText();
      expect(!text.includes('"slug"'), 'JSON block ("slug") leaked into the transcript');
      expect(!text.includes('```json'), 'raw ```json fence leaked into the transcript');
    });
    await shot(page, '01-scheme-selection');
  });

  // -- 2. Scheme choice only reveals plans; it must not send yet -----------
  await scenario('Choosing a scheme reveals plans without answering yet', async () => {
    await step('plans + default "All plans" appear below the scheme', async () => {
      await schemeChip(page, BONITAS).click();
      await waitForPlanDecision(page);
      await page.getByRole('button', { name: 'BonComplete', exact: true }).waitFor({ state: 'visible' });
      expect(await clearButton(page).isVisible(), 'scheme pill did not appear');
      await page.getByText(/Using all plans by default/).waitFor({ state: 'visible' });
    });
    await step('no backend request is made during the default window', async () => {
      const before = chatRequests.length;
      await page.waitForTimeout(1200);
      expect(
        chatRequests.length === before,
        `scheme click sent a request early: ${JSON.stringify(chatRequests.slice(before))}`,
      );
    });
    await step('picking a plan inside the window sends just that plan', async () => {
      await page.getByRole('button', { name: 'BonComplete', exact: true }).click();
      await waitForIdle(page);
      const turn = await waitForChatRequest(page, (r) => !r.isReset && r.message === 'BonComplete');
      expect(turn, 'no chat request carried the plan name');
      const pill = await pillText(page);
      expect(/Bonitas/.test(pill) && /BonComplete/.test(pill), `unexpected pill: "${pill}"`);
    });
    await step('the plan window does not fire a second turn', async () => {
      const before = nonResetRequests().length;
      await page.waitForTimeout(PLAN_DECISION_MS + 1500);
      expect(
        nonResetRequests().length === before,
        'the default "all plans" turn fired even though a plan was chosen',
      );
    });
    await shot(page, '02-plan-chosen');
  });

  // -- 3. Auto-continue with all plans after the window --------------------
  await scenario('Default window continues with all plans', async () => {
    await step('lapsing the 3s window sends the scheme-wide request', async () => {
      await openSchemePrompt(page);
      const clickedAt = Date.now();
      await schemeChip(page, DISCOVERY).click();
      await waitForPlanDecision(page);
      const turn = await waitForChatRequest(
        page,
        (r) => !r.isReset && /^All Discovery Health Medical Scheme plans$/.test(r.message ?? ''),
        20_000,
      );
      const elapsed = turn.ts - clickedAt;
      expect(elapsed >= PLAN_DECISION_MS - 400, `default fired too early (${elapsed}ms)`);
      expect(elapsed < 9_000, `default fired too late (${elapsed}ms)`);
      await waitForIdle(page);
      const pill = await pillText(page);
      expect(/Discovery/.test(pill) && /All plans/.test(pill), `unexpected pill: "${pill}"`);
    });
    await shot(page, '03-all-plans-default');
  });

  // -- 4. Clicking "All plans" continues immediately -----------------------
  await scenario('Clicking "All plans" continues immediately', async () => {
    await step('the All chip sends without waiting for the timer', async () => {
      await openSchemePrompt(page);
      await schemeChip(page, BONITAS).click();
      await waitForPlanDecision(page);
      const clickedAt = Date.now();
      await allPlansChip(page).click();
      const turn = await waitForChatRequest(
        page,
        (r) => !r.isReset && r.message === `All ${BONITAS} plans`,
        10_000,
      );
      const elapsed = turn.ts - clickedAt;
      expect(elapsed < 2_000, `explicit All did not send immediately (${elapsed}ms)`);
      await waitForIdle(page);
    });
  });

  // -- 5. Reload must not resume a previous scheme (regression) ------------
  await scenario('Reload does not resume the previous scheme (regression)', async () => {
    await step('select a scheme and settle the plan window', async () => {
      await openSchemePrompt(page);
      await schemeChip(page, BONITAS).click();
      await waitForPlanDecision(page);
      await allPlansChip(page).click();
      await waitForIdle(page);
      expect((await clearButton(page).count()) === 1, 'expected a scheme pill before reload');
    });
    await step('session id is NOT persisted to localStorage', async () => {
      const stored = await page.evaluate(() => ({
        legacy: localStorage.getItem('medaid:session-id'),
        keys: Object.keys(localStorage),
      }));
      expect(stored.legacy === null, `legacy "medaid:session-id" is still persisted: ${stored.legacy}`);
      const sessionLike = stored.keys.filter((k) => /session/i.test(k));
      expect(sessionLike.length === 0, `unexpected session-like localStorage keys: ${sessionLike}`);
    });
    await step('page reload resets the transcript and header', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByText(/Hello! I can help you understand medical aid plans/i).waitFor({
        state: 'visible',
      });
      await clearButton(page).waitFor({ state: 'hidden' });
      expect(
        (await page.getByText('Select a scheme').count()) === 0,
        'scheme chips survived the reload',
      );
    });
    await step('first request after reload carries NO session id', async () => {
      const idx = chatRequests.length;
      await send(page, FOLLOW_UP);
      await waitForSchemeChips(page);
      await waitForIdle(page);
      const first = chatRequests[idx];
      expect(first, 'no chat request recorded after reload');
      expect(
        first.sessionId === undefined || first.sessionId === null || first.sessionId === '',
        `session id was resumed after reload: ${first.sessionId}`,
      );
    });
    await step('the follow-up re-prompts for a scheme instead of answering for Bonitas', async () => {
      await page.getByText('Select a scheme').waitFor({ state: 'visible' });
      const text = await page.locator('main, body').first().innerText();
      expect(
        /which medical scheme|pick one/i.test(text),
        'agent did not re-prompt for a scheme after reload',
      );
    });
    await shot(page, '04-after-reload');
  });

  // -- 6. Clear-context button resets the agent-side scheme ----------------
  await scenario('Clear-context button resets the agent-side scheme', async () => {
    await step('select a scheme and settle the plan window', async () => {
      await openSchemePrompt(page);
      await schemeChip(page, DISCOVERY).click();
      await waitForPlanDecision(page);
      await allPlansChip(page).click();
      await waitForIdle(page);
      const pill = await pillText(page);
      expect(/Discovery/.test(pill), `expected pill "Discovery", got "${pill}"`);
    });
    await step('clicking the X calls /api/chat/reset with a 2xx {ok:true}', async () => {
      const respPromise = page.waitForResponse(
        (r) => r.url().includes('/api/chat/reset') && r.request().method() === 'POST',
        { timeout: 30_000 },
      );
      await clearButton(page).click();
      const resp = await respPromise;
      await clearButton(page).waitFor({ state: 'hidden' });
      const body = await resp.text();
      expect(resp.status() >= 200 && resp.status() < 300, `reset returned HTTP ${resp.status()}`);
      expect(body.includes('"ok":true'), `reset body not ok: ${body}`);
    });
    await step('follow-up turn re-prompts for a scheme (context was cleared)', async () => {
      await send(page, FOLLOW_UP);
      await waitForSchemeChips(page);
      await page.getByText('Select a scheme').waitFor({ state: 'visible' });
      await waitForIdle(page);
    });
    await shot(page, '05-after-clear-context');
  });

  // -- 7. "New chat" starts clean ------------------------------------------
  await scenario('"New chat" starts a clean conversation', async () => {
    await step('new chat clears the transcript, pill and chips', async () => {
      await openSchemePrompt(page);
      await schemeChip(page, BONITAS).click();
      await waitForPlanDecision(page);
      await allPlansChip(page).click();
      await waitForIdle(page);
      await clearButton(page).waitFor({ state: 'visible' });

      await page.getByRole('button', { name: /New chat/i }).click();
      await page.getByText(/Hello! I can help you understand medical aid plans/i).waitFor({
        state: 'visible',
      });
      await clearButton(page).waitFor({ state: 'hidden' });
      expect(
        (await page.getByText('Select a scheme').count()) === 0,
        'scheme chips survived "New chat"',
      );
    });
    await step('next question re-prompts for a scheme (fresh session)', async () => {
      await send(page, FOLLOW_UP);
      await waitForSchemeChips(page);
      await waitForIdle(page);
    });
    await shot(page, '06-new-chat');
  });

  // -- Console health -------------------------------------------------------
  await scenario('Browser console is clean', async () => {
    await step('no console/page errors during the run', async () => {
      expect(consoleErrors.length === 0, `console errors:\n${consoleErrors.join('\n')}`);
    });
  });
} finally {
  await browser.close();

  const failed = results.filter((r) => !r.ok);
  const report = {
    baseUrl: BASE_URL,
    ranAt: new Date().toISOString(),
    passed: results.length - failed.length,
    failed: failed.length,
    results,
    consoleErrors,
  };
  writeFileSync(path.join(ARTIFACTS, 'report.json'), JSON.stringify(report, null, 2));

  console.log('\n' + '='.repeat(72));
  console.log(`RESULT: ${report.passed} passed, ${report.failed} failed`);
  if (failed.length) {
    console.log('\nFailures:');
    for (const f of failed) console.log(`  ✗ ${f.name}\n      ${f.detail}`);
  }
  console.log(`Artifacts: ${ARTIFACTS}`);
  process.exit(failed.length ? 1 : 0);
}
