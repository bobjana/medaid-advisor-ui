/**
 * E2E verification of the scheme → plan context flow and the composer
 * context picker.
 *
 * Drives the UI with Playwright and checks:
 *
 *   1. Ambiguous questions prompt for a scheme (raw context JSON stripped);
 *      a fresh session shows an "All Schemes" chip inline-left of the prompt.
 *   2. Choosing a scheme shows its plans *below* it with an "All plans" chip
 *      selected by default and a 3s countdown — and does NOT hit the backend
 *      yet.
 *   3. Picking a plan inside the window sends just that plan; letting the
 *      window lapse (or clicking "All plans") continues scheme-wide.
 *   4. The composer picker opens a scheme/plan tree: expanding a scheme is not
 *      a selection (popover stays open), selecting applies the context
 *      silently via /api/chat/context and closes the popover.
 *   5. Reloading starts a new conversation (no persisted session id, no
 *      resumed scheme) and the next question re-prompts for a scheme.
 *   6. "New chat" returns to a clean slate.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 node scripts/e2e-scheme-context.mjs
 *   just e2e-gcp
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

/** Wait until the in-flight chat/context turn has finished. */
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

function contextChip(page) {
  return page.getByRole('button', { name: /^Context:/ });
}

async function chipLabel(page) {
  return (await contextChip(page).innerText()).replace(/\s+/g, ' ').trim();
}

async function expectChip(page, expected, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  let last = '';
  while (Date.now() < deadline) {
    last = await chipLabel(page);
    if (last === expected) return;
    await page.waitForTimeout(200);
  }
  throw new Error(`expected chip "${expected}", got "${last}"`);
}

function pickerDialog(page) {
  return page.getByRole('dialog', { name: 'Scheme and plan context' });
}

const chatRequests = [];
const contextRequests = [];
const inflight = new Set();
const resetResponses = [];
const consoleErrors = [];

function turnRequests() {
  return chatRequests.filter((r) => !r.isReset && !r.isContext);
}

async function waitForRequest(page, list, predicate, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const found = list.find(predicate);
    if (found) return found;
    await page.waitForTimeout(150);
  }
  throw new Error('timed out waiting for a matching request');
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
  if (req.method() !== 'POST' || !req.url().includes('/api/chat')) return;
  inflight.add(req);
  const url = req.url();
  const isReset = url.includes('/api/chat/reset');
  const isContext = url.includes('/api/chat/context');
  let body = {};
  try {
    body = req.postDataJSON() ?? {};
  } catch {
    /* ignore */
  }
  const entry = {
    isReset,
    isContext,
    sessionId: body.sessionId,
    message: body.message,
    scheme: body.scheme,
    plan: body.plan,
    ts: Date.now(),
  };
  chatRequests.push(entry);
  if (isContext) contextRequests.push(entry);
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
    await step('new session shows an "All Schemes" chip inline-left of the prompt', async () => {
      await page.goto(`${BASE_URL}/chat`, { waitUntil: 'domcontentloaded' });
      await contextChip(page).waitFor({ state: 'visible' });
      expect((await chipLabel(page)) === 'All Schemes', `unexpected chip: ${await chipLabel(page)}`);
      const [chipBox, taBox] = await Promise.all([
        contextChip(page).boundingBox(),
        page.locator(TEXTAREA).boundingBox(),
      ]);
      expect(
        !!chipBox && !!taBox && chipBox.x + chipBox.width <= taBox.x + 1,
        'chip is not positioned inline to the left of the prompt',
      );
    });
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
      await page.getByText(/Using all plans by default/).waitFor({ state: 'visible' });
      expect((await chipLabel(page)) === 'Bonitas', `unexpected chip: ${await chipLabel(page)}`);
    });
    await step('no backend request is made during the default window', async () => {
      const before = turnRequests().length;
      await page.waitForTimeout(1200);
      expect(
        turnRequests().length === before,
        `scheme click sent a request early: ${JSON.stringify(turnRequests().slice(before))}`,
      );
    });
    await step('picking a plan inside the window sends just that plan', async () => {
      await page.getByRole('button', { name: 'BonComplete', exact: true }).click();
      await waitForIdle(page);
      const turn = await waitForRequest(
        page,
        chatRequests,
        (r) => !r.isReset && !r.isContext && r.message === 'BonComplete',
      );
      expect(turn, 'no chat request carried the plan name');
      expect(
        (await chipLabel(page)) === 'Bonitas › BonComplete',
        `unexpected chip: ${await chipLabel(page)}`,
      );
    });
    await step('the plan window does not fire a second turn', async () => {
      const before = turnRequests().length;
      await page.waitForTimeout(PLAN_DECISION_MS + 1500);
      expect(
        turnRequests().length === before,
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
      const turn = await waitForRequest(
        page,
        chatRequests,
        (r) =>
          !r.isReset &&
          !r.isContext &&
          /^All Discovery Health Medical Scheme plans$/.test(r.message ?? ''),
        20_000,
      );
      const elapsed = turn.ts - clickedAt;
      expect(elapsed >= PLAN_DECISION_MS - 400, `default fired too early (${elapsed}ms)`);
      expect(elapsed < 9_000, `default fired too late (${elapsed}ms)`);
      await waitForIdle(page);
      expect((await chipLabel(page)) === 'Discovery', `unexpected chip: ${await chipLabel(page)}`);
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
      const turn = await waitForRequest(
        page,
        chatRequests,
        (r) => !r.isReset && !r.isContext && r.message === `All ${BONITAS} plans`,
        10_000,
      );
      const elapsed = turn.ts - clickedAt;
      expect(elapsed < 2_000, `explicit All did not send immediately (${elapsed}ms)`);
      await waitForIdle(page);
    });
  });

  // -- 5. Composer context picker ------------------------------------------
  await scenario('Composer context picker', async () => {
    await step('opens a tree with schemes collapsed and All Schemes as root', async () => {
      await openSchemePrompt(page);
      await contextChip(page).click();
      const dialog = pickerDialog(page);
      await dialog.waitFor({ state: 'visible' });
      await dialog.getByText('All Schemes', { exact: true }).waitFor({ state: 'visible' });
      await dialog.getByText(BONITAS, { exact: true }).waitFor({ state: 'visible' });
      expect(!(await dialog.getByText('BonComplete', { exact: true }).isVisible().catch(() => false)), 'Bonitas plans should start collapsed');
    });

    await step('expanding a scheme is not a selection (popover stays open)', async () => {
      const before = contextRequests.length;
      const dialog = pickerDialog(page);
      await dialog.getByRole('button', { name: `Expand ${BONITAS}` }).click();
      await dialog.getByText('BonComplete', { exact: true }).waitFor({ state: 'visible' });
      expect(await dialog.isVisible(), 'popover closed on expand');
      expect(contextRequests.length === before, 'expanding sent a context update');
      expect((await chipLabel(page)) === 'All Schemes', 'expanding changed the chip');
    });

    await step('selecting a plan closes the popover and updates context silently', async () => {
      const dialog = pickerDialog(page);
      await dialog.getByText('BonComplete', { exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      const req = await waitForRequest(
        page,
        contextRequests,
        (r) => r.scheme === 'bonitas' && r.plan === 'boncomplete',
      );
      expect(req, 'no /api/chat/context request for the plan');
      expect(
        (await chipLabel(page)) === 'Bonitas › BonComplete',
        `unexpected chip: ${await chipLabel(page)}`,
      );
    });

    await step('"All Schemes" clears the agent-side context', async () => {
      await contextChip(page).click();
      const dialog = pickerDialog(page);
      await dialog.getByText('All Schemes', { exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      await waitForRequest(page, contextRequests, (r) => r.scheme === null && r.plan === null);
      expect((await chipLabel(page)) === 'All Schemes', `unexpected chip: ${await chipLabel(page)}`);
    });

    await step('the cleared context makes the next question re-prompt for a scheme', async () => {
      await send(page, FOLLOW_UP);
      await waitForSchemeChips(page);
      await waitForIdle(page);
    });
    await shot(page, '04-context-picker');
  });

  // -- 6. Agent context is mirrored from free text -------------------------
  await scenario('Agent context is mirrored from free text', async () => {
    await step('typing a scheme + plan updates the chip without the picker', async () => {
      await page.goto(`${BASE_URL}/chat`, { waitUntil: 'domcontentloaded' });
      await contextChip(page).waitFor({ state: 'visible' });
      const before = contextRequests.length;
      await send(page, 'I am on Bonitas BonComplete. What does it cover?');
      await waitForIdle(page);
      await expectChip(page, 'Bonitas › BonComplete');
      expect(
        !contextRequests.slice(before).some((r) => r.scheme === 'bonitas'),
        'context was set via the endpoint rather than mirrored from the agent',
      );
    });
    await step('"forget my scheme" clears the chip via the agent', async () => {
      await send(page, 'forget my scheme');
      await waitForSchemeChips(page);
      await waitForIdle(page);
      await expectChip(page, 'All Schemes');
    });
    await shot(page, '07-free-text-context');
  });

  // -- 7. Reload must not resume a previous scheme (regression) ------------
  await scenario('Reload does not resume the previous scheme (regression)', async () => {
    await step('select a scheme and settle the plan window', async () => {
      await openSchemePrompt(page);
      await schemeChip(page, BONITAS).click();
      await waitForPlanDecision(page);
      await allPlansChip(page).click();
      await waitForIdle(page);
      expect((await chipLabel(page)) === 'Bonitas', `unexpected chip: ${await chipLabel(page)}`);
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
    await step('page reload resets the transcript and chip', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByText(/Hello! I can help you understand medical aid plans/i).waitFor({
        state: 'visible',
      });
      expect((await chipLabel(page)) === 'All Schemes', `unexpected chip: ${await chipLabel(page)}`);
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
    await shot(page, '05-after-reload');
  });

  // -- 8. "New chat" starts clean ------------------------------------------
  await scenario('"New chat" starts a clean conversation', async () => {
    await step('new chat clears the transcript and resets the chip', async () => {
      await openSchemePrompt(page);
      await schemeChip(page, BONITAS).click();
      await waitForPlanDecision(page);
      await allPlansChip(page).click();
      await waitForIdle(page);
      expect((await chipLabel(page)) === 'Bonitas', `unexpected chip: ${await chipLabel(page)}`);

      await page.getByRole('button', { name: /New chat/i }).click();
      await page.getByText(/Hello! I can help you understand medical aid plans/i).waitFor({
        state: 'visible',
      });
      expect((await chipLabel(page)) === 'All Schemes', `unexpected chip: ${await chipLabel(page)}`);
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
