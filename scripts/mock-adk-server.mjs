/**
 * Mock ADK dev server for verifying the chat UI without the real agent.
 *
 * Streams a scripted SSE run that mimics what `search_benefits` returns: a
 * function_response carrying the tool's formatted excerpt blocks, then the
 * model's answer as text deltas citing those excerpts inline.
 *
 * Usage: node scripts/mock-adk-server.mjs [port]
 */
import { createServer } from 'node:http';

const PORT = Number(process.argv[2] ?? 8123);
// Point at the deployed download service by default, so citation links in a mock
// run actually resolve to a PDF instead of a dead localhost URL.
const DOWNLOAD_BASE =
  process.env.DOWNLOAD_BASE_URL ??
  'https://medaid-advisor-download-84640843558.africa-south1.run.app';

const SOURCES = [
  {
    file: 'discovery-health-medical-scheme-keycare-plan-guide.pdf',
    uri: 'gs://medaid-plan-guides/discovery/discovery-health-medical-scheme-keycare-plan-guide.pdf',
    text: 'KeyCare Plus offers unlimited hospital cover at KeyCare network hospitals, with no overall annual limit, subject to the KeyCare network and pre-authorisation rules.',
  },
  {
    file: 'discovery-health-medical-scheme-priority-plan-guide.pdf',
    uri: 'gs://medaid-plan-guides/discovery/discovery-health-medical-scheme-priority-plan-guide.pdf',
    text: 'Priority limits the hospital benefit to R2 200 000 per beneficiary per year across the Priority network. Day-to-day benefits are funded from the Medical Savings Account.',
  },
  {
    file: 'Boncap-2026.pdf',
    uri: 'gs://medaid-plan-guides/bonitas/Boncap-2026.pdf',
    text: 'BonCap contributions are determined by monthly household income and the number of dependants on the option.',
  },
];

const download = (uri) => `${DOWNLOAD_BASE}/download?uri=${encodeURIComponent(uri)}`;

const excerptBlocks = SOURCES.map(
  (source, i) =>
    `[Excerpt ${i + 1}]\nSource: ${source.file}\nSource URI: ${source.uri}\n` +
    `Download: ${download(source.uri)}\n\n${source.text}`,
).join('\n\n---\n\n');

/** The answer, with inline citations written the way the agent is instructed to. */
const ANSWER = [
  '### KeyCare Plus — hospital cover\n\n',
  'KeyCare Plus gives you **unlimited hospital cover** at KeyCare network hospitals, ',
  `with no overall annual limit [keycare](${download(SOURCES[0].uri)}). `,
  'The trade-off is network-only access: out-of-hospital care outside the network is ',
  `not covered except in an emergency or with pre-authorisation [keycare](${download(SOURCES[0].uri)}).\n\n`,
  '**How it compares to Priority**\n\n',
  '- Priority is the entry-level KeyCare option and caps the hospital benefit at ',
  `R2 200 000 a year [priority](${download(SOURCES[1].uri)}).\n`,
  '- Both plans share the KeyCare network and the day-to-day Medical Savings Account ',
  `funding [keycare](${download(SOURCES[0].uri)})[priority](${download(SOURCES[1].uri)}).\n\n`,
  'If you expect more than one hospital admission a year, KeyCare Plus is the safer ',
  'choice because its hospital benefit has no ceiling.\n',
];

const encode = (event) => `data: ${JSON.stringify(event)}\n\n`;

function runStream(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // The tool result arrives before the answer, exactly as in a real run.
  res.write(encode({ content: { parts: [{ function_response: { response: { result: excerptBlocks } } }] } }));

  // Then the answer, in small deltas like a streaming model.
  const chunks = ANSWER.join('').match(/[\s\S]{1,24}/g) ?? [];
  let i = 0;
  const timer = setInterval(() => {
    if (i >= chunks.length) {
      clearInterval(timer);
      res.write(encode({ content: { parts: [{ text: '' }] } }));
      res.end();
      return;
    }
    res.write(encode({ content: { parts: [{ text: chunks[i++] }] } }));
  }, 25);

  res.on('close', () => clearInterval(timer));
}

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    if (url.pathname === '/run_sse') return runStream(res);
    if (url.pathname.includes('/sessions')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ id: url.pathname.split('/').pop() }));
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });
}).listen(PORT, () => console.log(`mock ADK server on http://localhost:${PORT}`));
