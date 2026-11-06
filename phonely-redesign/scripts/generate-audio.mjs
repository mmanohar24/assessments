// Generates the sample call's audio with ElevenLabs, one MP3 per line, plus word timings.
// Reads ELEVENLABS_API_KEY from ../.env.local and never prints it.
//
//   node scripts/generate-audio.mjs --check   # free: looks up both voices, prints the lines and character count
//   node scripts/generate-audio.mjs           # spends credits: writes audio/line-01.mp3 … and audio/lines.json
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'audio');
const API = 'https://api.elevenlabs.io/v1';
const MODEL = 'eleven_multilingual_v2';

// Standard voices (free plan). Library voices Katie (kfGEdprt9Oe4pbdP8VTo) and Trevor (69SAlwj2jajrSXUGnYAA)
// need a paid plan for API use; swap them back in here after an upgrade and rerun.
const VOICES = {
  agent: 'EXAVITQu4vr4xnSDxMaL', // Sarah - Mature, Reassuring, Confident
  caller: 'iP95p4xoKVk53GoZ742B' // Chris - Charming, Down-to-Earth
};

// Must match SCRIPT in index.html.
const LINES = [
  ['agent', 'Thanks for calling Harbor Street. How can I help you today?'],
  ['caller', 'Hi, I’d like to book an appointment for later this week.'],
  ['agent', 'Happy to help. I have Thursday at 10:30 am or Friday at 2:15 pm. Which works better?'],
  ['caller', 'Thursday morning works.'],
  ['agent', 'Got it. Have you been with us before?'],
  ['caller', 'Yes, I came in last spring.'],
  ['agent', 'Perfect. You’re booked for Thursday at 10:30 am. I’ll text you a confirmation now. Anything else?'],
  ['caller', 'No, that’s it. Thanks!'],
  ['agent', 'You’re welcome. See you Thursday.']
];

function loadKey() {
  const file = join(ROOT, '.env.local');
  if (!existsSync(file)) throw new Error('No .env.local found in phonely-redesign/.');
  const line = readFileSync(file, 'utf8').split(/\r?\n/).find(l => l.startsWith('ELEVENLABS_API_KEY='));
  const key = line ? line.slice('ELEVENLABS_API_KEY='.length).trim().replace(/^["']|["']$/g, '') : '';
  if (!key || key === 'paste-your-key-here') throw new Error('ELEVENLABS_API_KEY in .env.local is still empty or the placeholder.');
  return key;
}

async function api(path, key, init = {}) {
  const res = await fetch(API + path, { ...init, headers: { 'xi-api-key': key, 'content-type': 'application/json', ...(init.headers || {}) } });
  if (!res.ok) {
    let detail = '';
    try { const j = await res.json(); detail = j.detail?.message || j.detail?.status || JSON.stringify(j.detail || j); } catch {}
    const err = new Error(`${res.status} ${detail}`.trim()); err.status = res.status; throw err;
  }
  return res.json();
}

// Group character timings into words, keeping punctuation attached to its word.
function words(alignment) {
  const out = []; let cur = null;
  alignment.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) { if (cur) { out.push(cur); cur = null; } return; }
    if (!cur) cur = { w: '', start: alignment.character_start_times_seconds[i] };
    cur.w += ch; cur.end = alignment.character_end_times_seconds[i];
  });
  if (cur) out.push(cur);
  return out.map(x => ({ w: x.w, start: +x.start.toFixed(3), end: +x.end.toFixed(3) }));
}

const check = process.argv.includes('--check');
const key = loadKey();

console.log('Voices');
for (const [role, id] of Object.entries(VOICES)) {
  try {
    const v = await api(`/voices/${id}`, key);
    const l = v.labels || {};
    console.log(`  ${role.padEnd(6)} ${id}  ${v.name}  (${[l.gender, l.age, l.accent].filter(Boolean).join(', ') || 'no labels'})`);
  } catch (e) {
    console.log(`  ${role.padEnd(6)} ${id}  lookup failed: ${e.message}${e.status === 401 ? ' (key may lack Voices: Read, which is optional)' : ''}`);
  }
}
const chars = LINES.reduce((n, [, t]) => n + t.length, 0);
console.log(`\nLines (${LINES.length}, ${chars} characters, model ${MODEL})`);
LINES.forEach(([who, t], i) => console.log(`  ${String(i + 1).padStart(2)}. ${who.padEnd(6)} ${t}`));

if (check) { console.log('\nCheck only. No credits spent.'); process.exit(0); }

mkdirSync(OUT, { recursive: true });
const manifest = [];
for (const [i, [who, text]] of LINES.entries()) {
  const prev = LINES.slice(0, i).filter(([w]) => w === who).map(([, t]) => t).slice(-1)[0];
  const body = { text, model_id: MODEL, ...(prev ? { previous_text: prev } : {}) };
  const r = await api(`/text-to-speech/${VOICES[who]}/with-timestamps?output_format=mp3_44100_128`, key, { method: 'POST', body: JSON.stringify(body) });
  const file = `line-${String(i + 1).padStart(2, '0')}.mp3`;
  writeFileSync(join(OUT, file), Buffer.from(r.audio_base64, 'base64'));
  const ws = words(r.alignment);
  manifest.push({ who, text, file, duration: ws.length ? ws[ws.length - 1].end : 0, words: ws });
  console.log(`  wrote ${file} (${ws.length} words, ${manifest[i].duration.toFixed(2)}s)`);
}
const data = { model: MODEL, voices: VOICES, lines: manifest };
writeFileSync(join(OUT, 'lines.json'), JSON.stringify(data, null, 2));
// The page embeds the timings (a file:// page can't fetch JSON), so refresh that copy too.
const page = join(ROOT, 'index.html');
const html = readFileSync(page, 'utf8');
const re = /(<script type="application\/json" id="call-timings">)[\s\S]*?(<\/script>)/;
if (!re.test(html)) throw new Error('call-timings block not found in index.html');
writeFileSync(page, html.replace(re, (_, a, b) => a + JSON.stringify(data) + b));
console.log('\nDone: audio/lines.json, and the timings embedded in index.html');
