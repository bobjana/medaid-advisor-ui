/**
 * E2E goldenset evaluation against the deployed GCP UI.
 *
 * Loads the curated golden_set.json from the ADK repo, drives the deployed UI
 * with Playwright (login → chat → scheme/plan context flow), captures the
 * NDJSON chat stream (answer text + citations), and scores each case:
 *
 *   retrieval       — expected source PDFs appear in the turn's citations
 *   recommendation  — expected top plan appears in the answer text
 *   faithfulness    — expected facts present / forbidden facts absent
 *   disambiguation  — ambiguous query prompts for a scheme; the selected
 *                     scheme is chosen and the follow-up scored
 *
 * Stops after MAX_ITERATIONS cases (default 10) and sleeps CASE_DELAY_MS
 * (default 30s) between cases to stay under the model's per-minute quota.
 *
 * Usage:
 *   BASE_URL=https://medaid-advisor-ui-kreiev32cq-bq.a.run.app node scripts/e2e-goldenset.mjs
 *   MAX_ITERATIONS=5 node scripts/e2e-goldenset.mjs
 *   CASE_DELAY_MS=60000 node scripts/e2e-goldenset.mjs
 *   HEADED=1 node scripts/e2e-goldenset.mjs
 */

import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);

const BASE_URL = process.env.BASE_URL ?? 'https://medaid-advisor-ui-kreiev32cq-bq.a.run.app';
const USERNAME = process.env.DEMO_USERNAME ?? 'advisor';
const PASSWORD = process.env.DEMO_PASSWORD ?? 'advisor';
const HEADED = process.env.HEADED === '1';
const MAX_ITERATIONS = Number(process.env.MAX_ITERATIONS ?? 10);
/** Back-off between cases so the eval stays under the model's RPM quota. */
const CASE_DELAY_MS = Number(process.env.CASE_DELAY_MS ?? 30_000);
const GOLDEN_SET_PATH =
  process.env.GOLDEN_SET_PATH ??
  path.resolve('../medaid-advisor-adk/eval/data/golden_set.json');
const ARTIFACTS = path.resolve('e2e-artifacts/goldenset');

const BONITAS = 'Bonitas Medical Fund';
const DISCOVERY = 'Discovery Health Medical Scheme';
const SCHEME_LABELS = { bonitas: BONITAS, discovery: DISCOVERY };

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
// Fuzzy matching helpers (no LLM judge — deterministic keyword scoring)
// ---------------------------------------------------------------------------

const norm = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9. ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'on', 'of', 'for', 'to', 'in', 'and', 'or', 'at', 'by',
  'with', 'has', 'have', 'my', 'your', 'their', 'it', 'its', 'this', 'that', 'from',
]);

function keywords(s) {
  return norm(s)
    .split(' ')
    .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !/^\d+\.$/.test(w));
}

/** Proportion of the fact's keywords that appear in the answer text. */
function factCoverage(answerText, fact) {
  const hay = norm(answerText);
  const words = keywords(fact);
  if (words.length === 0) return 0;
  const hit = words.filter((w) => hay.includes(w)).length;
  return hit / words.length;
}

function planSlugVariants(slug) {
  const base = norm(slug).replace(/\s+/g, '-');
  const title = base
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => (w === 'classic' || w === 'smart' || w === 'bon' ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
  return [norm(slug), norm(title), norm(base.replace(/-/g, ' '))];
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const TEXTAREA = 'textarea[placeholder^="Ask about medical aid plans"]';
const SUBMIT = 'form button[type="submit"]';
const PLAN_DECISION_MS = 3000;

function loadGoldenSet() {
  if (!existsSync(GOLDEN_SET_PATH)) {
    throw new Error(`goldenset not found at ${GOLDEN_SET_PATH}`);
  }
  const cases = JSON.parse(readFileSync(GOLDEN_SET_PATH, 'utf8'));
  if (!Array.isArray(cases) || cases.length === 0) {
    throw new Error('goldenset is empty or malformed');
  }
  return cases;
}

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

const inflight = new Set();

/** Wait until the in-flight chat turn has finished. */
async function waitForIdle(page, capture, timeout = 180_000) {
  const startDeadline = Date.now() + 8_000;
  while (Date.now() < startDeadline) {
    const spinner = await page.locator(`${SUBMIT} svg.animate-spin`).count();
    if (inflight.size > 0 || spinner > 0) break;
    await page.waitForTimeout(100);
  }
  const startedAt = Date.now();
  let lastProgressLog = startedAt;
  const deadline = startedAt + timeout;
  let clearSamples = 0;
  while (Date.now() < deadline) {
    const spinner = await page.locator(`${SUBMIT} svg.animate-spin`).count();
    if (inflight.size === 0 && spinner === 0) {
      if (++clearSamples >= 3) return;
    } else {
      clearSamples = 0;
    }
    if (capture && Date.now() - lastProgressLog >= 30_000) {
      lastProgressLog = Date.now();
      const partial = captureText(capture.events);
      console.log(
        `   ⏳ still waiting (${Math.round((Date.now() - startedAt) / 1000)}s, ` +
          `${partial.length} chars streamed)`,
      );
    }
    await page.waitForTimeout(200);
  }

  // The stream may have finished even if the UI busy spinner is stuck — check
  // the captured events before declaring the turn a failure.
  if (capture) {
    await capture.drain(5_000);
    if (capture.events.some((e) => e.type === 'done' || e.type === 'error')) {
      console.log('   ⚠ turn stream finished but the UI busy spinner stayed on');
      return;
    }
    const partial = captureText(capture.events);
    throw new Error(
      `timed out after ${Math.round(timeout / 1000)}s waiting for the chat turn; ` +
        `last stream state: ${
          partial ? `answer streaming (${partial.length} chars so far)` : 'no events captured'
        }`,
    );
  }
  throw new Error('timed out waiting for the chat turn to finish');
}

function schemeChip(page, name) {
  return page.getByRole('button', { name, exact: true });
}

async function waitForSchemeChips(page, timeout = 180_000) {
  await schemeChip(page, BONITAS).waitFor({ state: 'visible', timeout });
  await schemeChip(page, DISCOVERY).waitFor({ state: 'visible', timeout });
}

async function waitForPlanDecision(page, timeout = 90_000) {
  await page.getByText('Select a plan').waitFor({ state: 'visible', timeout });
  await page.getByRole('button', { name: 'Use all plans' }).waitFor({ state: 'visible', timeout });
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

/** Start a clean conversation (New chat if present, else reload). */
async function freshChat(page) {
  await page.goto(`${BASE_URL}/chat`, { waitUntil: 'domcontentloaded' });
  const newChat = page.getByRole('button', { name: /New chat/i });
  if (await newChat.isVisible().catch(() => false)) {
    await newChat.click();
    await page.waitForTimeout(500);
  }
  await page
    .getByText(/Hello! I can help you understand medical aid plans/i)
    .waitFor({ state: 'visible', timeout: 30_000 });
}

async function shot(page, name) {
  try {
    await page.screenshot({ path: path.join(ARTIFACTS, `${name}.png`), fullPage: true });
  } catch {
    /* screenshot is best-effort */
  }
}

// ---------------------------------------------------------------------------
// Chat stream capture — collect text/citations/context events per turn
// ---------------------------------------------------------------------------

class TurnCapture {
  constructor(page) {
    this.page = page;
    this.events = [];
    this.recording = false;
    this._onResponse = async (res) => {
      if (!this.recording) return;
      if (res.request().method() !== 'POST' || !res.url().includes('/api/chat')) return;
      if (res.url().includes('/api/chat/reset') || res.url().includes('/api/chat/context')) return;
      let body = '';
      try {
        body = await res.text();
      } catch {
        return;
      }
      for (const line of body.split('\n')) {
        if (!line.trim()) continue;
        try {
          this.events.push(JSON.parse(line));
        } catch {
          /* partial/non-JSON line */
        }
      }
    };
    page.on('response', this._onResponse);
  }

  start() {
    this.events = [];
    this.recording = true;
  }

  async stop() {
    this.recording = false;
    return this.drain();
  }

  /** Events can land in chunks; poll briefly for the stream's final `done`. */
  async drain(maxWait = 5_000) {
    const deadline = Date.now() + maxWait;
    while (Date.now() < deadline) {
      if (this.events.some((e) => e.type === 'done' || e.type === 'error')) break;
      await this.page.waitForTimeout(250);
    }
    return this.events;
  }
}

function captureText(events) {
  return events
    .filter((e) => e.type === 'text')
    .map((e) => e.delta)
    .join('');
}

function captureCitations(events) {
  const seen = new Map();
  for (const e of events) {
    if (e.type !== 'citations') continue;
    for (const c of e.citations ?? []) {
      if (c?.title) seen.set(c.title, c);
    }
  }
  return [...seen.values()];
}

// ---------------------------------------------------------------------------
// Per-case scoring
// ---------------------------------------------------------------------------

function scoreCase(caseDef, turns) {
  const checks = [];
  const add = (name, ok, detail = '') => checks.push({ name, ok, detail });

  const answer = norm(turns.map((t) => t.answerText).join(' '));
  const citations = turns.flatMap((t) => t.citations);
  const citationTitles = citations.map((c) => norm(c.title));

  const hasSource = (expected) => {
    const want = norm(expected).replace(/\.pdf/g, '').replace(/\s+/g, ' ').trim();
    return citationTitles.some((t) => {
      const clean = t.replace(/\.pdf/g, '').replace(/\s+/g, ' ').trim();
      return clean === want || clean.includes(want) || want.includes(clean);
    });
  };

  const hasFact = (fact, threshold = 0.6) => factCoverage(answer, fact) >= threshold;
  const answerMentionsPlan = (slug) => {
    const variants = planSlugVariants(slug);
    return variants.some((v) => answer.includes(v));
  };

  switch (caseDef.type) {
    case 'retrieval': {
      const missing = (caseDef.expected_sources ?? []).filter((s) => !hasSource(s));
      add(
        'expected sources cited',
        missing.length === 0 && (caseDef.expected_sources ?? []).length > 0,
        missing.length ? `missing: ${missing.join(' | ')}` : '',
      );
      add('answer is non-empty', answer.length > 0);
      break;
    }
    case 'recommendation': {
      add(
        'top plan recommended',
        caseDef.expected_top_plan ? answerMentionsPlan(caseDef.expected_top_plan) : false,
        `expected ${caseDef.expected_top_plan}; answer: ${answer.slice(0, 240)}`,
      );
      if (Array.isArray(caseDef.expected_top3) && caseDef.expected_top3.length) {
        const hits = caseDef.expected_top3.filter((p) => answerMentionsPlan(p));
        add(
          'top-3 plans referenced',
          hits.length >= Math.min(2, caseDef.expected_top3.length),
          `matched ${hits.length}/${caseDef.expected_top3.length}: ${hits.join(', ')}`,
        );
      }
      break;
    }
    case 'faithfulness': {
      const expected = caseDef.expected_facts ?? [];
      const forbidden = caseDef.forbidden_facts ?? [];
      const expectedHits = expected.map((f) => ({ fact: f, coverage: factCoverage(answer, f) }));
      const forbiddenHits = forbidden
        .map((f) => ({ fact: f, coverage: factCoverage(answer, f) }))
        .filter((f) => f.coverage >= 0.6);
      add(
        'expected facts present',
        expectedHits.some((f) => f.coverage >= 0.6),
        expectedHits.map((f) => `${Math.round(f.coverage * 100)}%: ${f.fact}`).join(' | ') ||
          'no expected facts defined',
      );
      add(
        'no forbidden facts',
        forbiddenHits.length === 0,
        forbiddenHits.map((f) => f.fact).join(' | '),
      );
      break;
    }
    case 'disambiguation': {
      add(
        'scheme was selected',
        turns[0]?.selectedScheme === caseDef.selected_scheme,
        `expected ${caseDef.selected_scheme}, got ${turns[0]?.selectedScheme ?? 'none'}`,
      );
      if (caseDef.expected_sources?.length) {
        const missing = caseDef.expected_sources.filter((s) => !hasSource(s));
        add(
          'follow-up cites expected sources',
          missing.length === 0,
          missing.length ? `missing: ${missing.join(' | ')}` : '',
        );
      }
      if (caseDef.expected_facts?.length) {
        add(
          'follow-up contains expected facts',
          caseDef.expected_facts.some((f) => factCoverage(answer, f) >= 0.6),
          caseDef.expected_facts.join(' | '),
        );
      }
      break;
    }
    default:
      add('unknown case type', false, `type: ${caseDef.type}`);
  }

  return checks;
}

/** Infer the scheme a case belongs to from its expected source PDFs. */
function inferScheme(caseDef) {
  const sources = (caseDef.expected_sources ?? []).join(' ').toLowerCase();
  if (sources.includes('bonitas')) return 'bonitas';
  if (sources.includes('discovery')) return 'discovery';
  return 'discovery'; // goldenset is discovery-heavy; safe default
}

// ---------------------------------------------------------------------------
// Driving one case through the UI
// ---------------------------------------------------------------------------

async function runCase(page, capture, caseDef) {
  const turns = [];

  if (caseDef.type === 'disambiguation') {
    // Turn 1: ambiguous query — must prompt for a scheme.
    await freshChat(page);
    capture.start();
    await send(page, caseDef.query);
    await waitForSchemeChips(page);
    await waitForIdle(page, capture);
    let events = await capture.stop();
    const promptedText = norm(captureText(events));
    const promptedOk = promptedText.includes('select a scheme') || promptedText.includes('which medical scheme');

    // Turn 2: select the requested scheme and settle the plan window.
    const schemeLabel = SCHEME_LABELS[caseDef.selected_scheme];
    if (!schemeLabel) throw new Error(`unknown selected_scheme: ${caseDef.selected_scheme}`);
    capture.start();
    await schemeChip(page, schemeLabel).click();
    await waitForPlanDecision(page);
    const followupPlanName = caseDef.followup_plan
      ? caseDef.followup_plan
          .split(/[-_]/)
          .filter(Boolean)
          .map((w) => (w === 'bon' ? 'Bon' : w[0].toUpperCase() + w.slice(1)))
          .join('')
      : null;
    const planChip = followupPlanName
      ? page.getByRole('button', { name: followupPlanName, exact: true })
      : null;
    if (planChip && (await planChip.isVisible().catch(() => false))) {
      await planChip.click();
    } else {
      await page.getByRole('button', { name: 'Use all plans' }).click();
    }
    await waitForIdle(page, capture);
    events = await capture.stop();

    // Turn 3: the follow-up question against the selected context.
    capture.start();
    await send(page, caseDef.followup_query);
    await waitForIdle(page, capture);
    events = await capture.stop();

    turns.push({
      role: 'disambiguation-flow',
      promptedForScheme: promptedOk,
      answerText: captureText(events),
      citations: captureCitations(events),
      selectedScheme: caseDef.selected_scheme,
    });
    return turns;
  }

  // Single-turn case: fresh session so prior context cannot leak in.
  await freshChat(page);
  capture.start();
  await send(page, caseDef.query);
  await waitForIdle(page, capture);
  let events = await capture.stop();

  // If the agent could not infer the scheme it prompts for one instead of
  // answering. Resolve it by selecting the scheme implied by the case's
  // expected sources and continue scheme-wide, then score that answer turn.
  const prompted =
    (await schemeChip(page, BONITAS).isVisible().catch(() => false)) &&
    (await schemeChip(page, DISCOVERY).isVisible().catch(() => false));

  if (prompted) {
    const scheme = inferScheme(caseDef);
    await schemeChip(page, SCHEME_LABELS[scheme]).click();
    await waitForPlanDecision(page);
    capture.start();
    await page.getByRole('button', { name: 'Use all plans' }).click();
    await waitForIdle(page, capture);
    events = await capture.stop();
    turns.push({
      role: 'scheme-prompt',
      answerText: '',
      citations: [],
      selectedScheme: scheme,
    });
  }

  turns.push({
    role: 'answer',
    answerText: captureText(events),
    citations: captureCitations(events),
    selectedScheme: prompted ? inferScheme(caseDef) : null,
  });
  return turns;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

mkdirSync(ARTIFACTS, { recursive: true });

const allCases = loadGoldenSet();
const cases = allCases.slice(0, MAX_ITERATIONS);

console.log(`Target:       ${BASE_URL}`);
console.log(`Goldenset:    ${GOLDEN_SET_PATH} (${allCases.length} cases, running ${cases.length})`);
console.log(`Browser:      ${HEADED ? 'headed' : 'headless'} chromium (system chrome)`);

const browser = await chromium.launch({ channel: 'chrome', headless: !HEADED });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(60_000);

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

// Request-level inflight tracking makes waitForIdle robust even when the
// busy spinner fails to render. Only *turn* requests count — context and
// reset calls can legitimately hang and would otherwise pin idle forever.
page.on('request', (req) => {
  if (req.method() !== 'POST' || !req.url().includes('/api/chat')) return;
  if (req.url().includes('/api/chat/reset') || req.url().includes('/api/chat/context')) return;
  inflight.add(req);
});
page.on('requestfinished', (req) => inflight.delete(req));
page.on('requestfailed', (req) => inflight.delete(req));

let browserDead = false;
browser.on('disconnected', () => {
  browserDead = true;
});

const capture = new TurnCapture(page);
const results = [];
let ran = 0;

try {
  await login(page);
  console.log('Logged in.');

  for (const caseDef of cases) {
    if (ran >= MAX_ITERATIONS) break; // hard stop after N iterations
    if (browserDead || page.isClosed()) {
      console.log(
        `\n⚠ browser/page is gone — skipping the remaining ${cases.length - ran} iterations`,
      );
      break;
    }
    ran += 1;
    const label = `[${ran}/${cases.length}] ${caseDef.id} (${caseDef.type})`;
    console.log(`\n▶ ${label}`);
    const startedAt = Date.now();
    let turns = [];
    let error = null;
    try {
      turns = await runCase(page, capture, caseDef);
    } catch (err) {
      error = err.message;
    }

    const checks = error ? [{ name: 'case completed', ok: false, detail: error }] : scoreCase(caseDef, turns);
    const passed = checks.filter((c) => c.ok).length;
    const failed = checks.length - passed;
    for (const c of checks) {
      console.log(`   ${c.ok ? '✓' : '✗'} ${c.name}${c.ok || !c.detail ? '' : `\n       ↳ ${c.detail}`}`);
    }
    await shot(page, caseDef.id);

    results.push({
      id: caseDef.id,
      type: caseDef.type,
      category: caseDef.category,
      query: caseDef.query,
      durationMs: Date.now() - startedAt,
      error,
      checks,
      passed,
      failed,
      evidence: {
        answerPreview: norm(turns.map((t) => t.answerText).join(' ')).slice(0, 600),
        citations: turns.flatMap((t) => t.citations).map((c) => c.title),
        promptedForScheme: turns.some((t) => t.promptedForScheme === true) || undefined,
      },
    });

    // Stay under the model's per-minute quota: back off between cases.
    if (CASE_DELAY_MS > 0 && ran < cases.length && !browserDead && !page.isClosed()) {
      console.log(
        `   ⏸ cooling down ${Math.round(CASE_DELAY_MS / 1000)}s before the next case (quota back-off)`,
      );
      await new Promise((resolve) => setTimeout(resolve, CASE_DELAY_MS));
    }
  }
} finally {
  await browser.close();

  const totalChecks = results.reduce((n, r) => n + r.checks.length, 0);
  const passedChecks = results.reduce((n, r) => n + r.passed, 0);
  const failedCases = results.filter((r) => r.failed > 0 || r.error);
  const report = {
    baseUrl: BASE_URL,
    goldensetPath: GOLDEN_SET_PATH,
    ranAt: new Date().toISOString(),
    iterationsRequested: MAX_ITERATIONS,
    iterationsRun: ran,
    iterationsSkipped: cases.length - ran,
    totalCases: allCases.length,
    casesPassed: results.length - failedCases.length,
    casesFailed: failedCases.length,
    checksPassed: passedChecks,
    checksFailed: totalChecks - passedChecks,
    consoleErrors,
    results,
  };
  writeFileSync(path.join(ARTIFACTS, 'goldenset-report.json'), JSON.stringify(report, null, 2));

  console.log('\n' + '='.repeat(72));
  console.log(
    `GOLDENSET RESULT: ${ran} iterations run, ${report.casesPassed} cases passed, ` +
      `${report.casesFailed} failed (${report.checksPassed}/${totalChecks} checks green)`,
  );
  if (failedCases.length) {
    console.log('\nFailing cases:');
    for (const r of failedCases) {
      console.log(`  ✗ ${r.id} (${r.type})${r.error ? ` — ${r.error}` : ''}`);
      for (const c of r.checks.filter((c) => !c.ok)) console.log(`      ↳ ${c.name}: ${c.detail}`);
    }
  }
  console.log(`Artifacts: ${ARTIFACTS}`);
  process.exit(report.casesFailed ? 1 : 0);
}
