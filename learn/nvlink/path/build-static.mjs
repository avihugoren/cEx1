// Static (no-JavaScript) builds of the learning path, for phones that open local HTML in a preview
// that does not run scripts (the iPhone Files app), and a PDF for Files / Books.
//   ../gpu-learning-path-static.html  answers open with native <details>, links jump inside the page
//   ../gpu-learning-path.pdf          same content, answers printed open, links clickable
// Run: node build-static.mjs   (the PDF step needs Chrome; set CHROME_PATH)
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..');
const template = readFileSync(join(HERE, 'template.html'), 'utf8');
const glossary = readFileSync(join(HERE, 'data-glossary.js'), 'utf8');
const path = readFileSync(join(HERE, 'data-path.js'), 'utf8');

// Reuse the page's own helpers (rich text, term links, answer placement, glossary entries) so both builds say the same thing.
const script = template.slice(template.indexOf('<script>') + 8, template.indexOf('</script>'))
  .replace('%%GLOSSARY%%', glossary).replace('%%PATH%%', path);
const helpers = script.slice(0, script.indexOf('function renderChapters'));
const entryFn = script.slice(script.indexOf('function entryHtml'), script.indexOf('function renderGlossary'));
const lib = new Function(`${helpers}\n${entryFn}\nreturn { G, AREAS, CHAPTERS, STEPS, PERM, LETTERS, rich, chip, esc, entryHtml };`)();
const { G, AREAS, CHAPTERS, STEPS, PERM, LETTERS, rich, chip, entryHtml } = lib;

const css = template.slice(template.indexOf('<style>') + 7, template.indexOf('</style>'));
const map = template.slice(template.indexOf('<svg class="map"'), template.indexOf('</svg>', template.indexOf('<svg class="map"')) + 6);

const extraCss = `
  .opts.static li { display: grid; grid-template-columns: 2rem minmax(0, 1fr); gap: var(--s-2); align-items: center; background: var(--bg); border: 1px solid var(--border-bright); border-radius: var(--r-1); padding: var(--s-2) var(--s-3); }
  .opts.static .let { font-weight: 700; color: var(--text-dim); width: 1.6rem; height: 1.6rem; border: 1px solid var(--border-bright); border-radius: 50%; display: grid; place-items: center; font-size: .9rem; }
  details.ans { border-top: 1px solid var(--border); padding-top: var(--s-3); }
  details.ans > summary { cursor: pointer; font-weight: 800; color: var(--accent); padding: var(--s-2) 0; list-style: none; }
  details.ans > summary::-webkit-details-marker { display: none; }
  details.ans > summary::before { content: '▸ '; } details.ans[open] > summary::before { content: '▾ '; }
  details.ans[open] { display: grid; gap: var(--s-3); }
  .right-ans { font-weight: 800; color: var(--ok); }
  .toc { display: grid; gap: var(--s-1); list-style: none; padding: 0; }
  .back { font-size: .85rem; }
  @page { size: 105mm 185mm; margin: 7mm 6mm; }
  @media print {
    html { font-size: 9.5pt; }
    .step { padding: 8pt; gap: 6pt; }
    .bar, .print-hide { display: none !important; }
    main { padding: 0; gap: 18pt; }
    .frame { overflow: visible; } .map { min-width: 0; }
    .entry { break-inside: avoid; } .step h3, .opts.static { break-inside: avoid; }
    .step { border: 0; padding: 0; }
    .qpage, .apage { break-before: page; }
    .sec > .qpage:first-of-type { break-before: auto; }
    .step-q-hint { display: block !important; }
    .sec { break-before: page; }
    #intro, #map { break-before: auto; }
    a.term { text-decoration: underline dotted; }
  }`;

function stepHtml(i, open) {
  const s = STEPS[i];
  const right = LETTERS[PERM[i].indexOf(s.a)];
  return `<article class="step" id="s${i + 1}">
    <div class="step-top"><span class="step-num">${i + 1}/${STEPS.length}</span><span>שלב</span></div>
    <h3>${rich(s.q)}</h3>
    <ol class="opts static">${PERM[i].map((orig, k) => `<li><span class="let">${LETTERS[k]}</span><span>${rich(s.o[orig])}</span></li>`).join('')}</ol>
    <details class="ans"${open ? ' open' : ''}>
      <summary>להציג תשובה והסבר</summary>
      <p class="right-ans">התשובה הנכונה: ${right}</p>
      <h4>הסבר מפורט</h4><p>${rich(s.e)}</p>
      <h4>למה לא האחרות</h4><p class="why-not">${rich(s.n)}</p>
      <h4>רכיבים לחזור עליהם</h4><div class="chips review">${s.c.map((id) => chip(id, true)).join('')}</div>
    </details>
  </article>`;
}

function printStep(i) {
  const s = STEPS[i];
  const right = LETTERS[PERM[i].indexOf(s.a)];
  return `<article class="step qpage" id="s${i + 1}">
    <div class="step-top"><span class="step-num">${i + 1}/${STEPS.length}</span><span>שלב</span></div>
    <h3>${rich(s.q)}</h3>
    <ol class="opts static">${PERM[i].map((orig, k) => `<li><span class="let">${LETTERS[k]}</span><span>${rich(s.o[orig])}</span></li>`).join('')}</ol>
    <p class="seen-in">לחשוב על תשובה, ואז לדפדף לעמוד הבא.</p>
  </article>
  <div class="step apage">
    <div class="step-top"><span class="step-num">${i + 1}/${STEPS.length}</span><span>תשובה והסבר</span></div>
    <p class="right-ans">התשובה הנכונה: ${right}</p>
    <h4>הסבר מפורט</h4><p>${rich(s.e)}</p>
    <h4>למה לא האחרות</h4><p class="why-not">${rich(s.n)}</p>
    <h4>רכיבים לחזור עליהם</h4><div class="chips review">${s.c.map((id) => chip(id, true)).join('')}</div>
  </div>`;
}

function page({ open, forPrint }) {
  let n = 0;
  const chapters = CHAPTERS.map((ch, ci) => {
    const steps = ch.s.map(() => (open ? printStep(n++) : stepHtml(n++, false))).join('');
    return `<section class="sec" id="ch${ci + 1}"><div class="sec-head"><span class="num">פרק ${ci + 1} מתוך ${CHAPTERS.length}</span><h2>${rich(ch.t)}</h2><p>${rich(ch.d)}</p>
      <div class="chips"><span class="chip-label">רכיבים בפרק:</span>${ch.c.map((id) => chip(id)).join('')}</div></div>${steps}</section>`;
  }).join('');
  const gloss = Object.entries(AREAS).map(([area, title]) => {
    const ids = Object.keys(G).filter((id) => G[id].a === area);
    return `<div class="gloss-area"><h3>${rich(title)}</h3>${ids.map((id) => `<article class="entry" id="g-${id}">${entryHtml(id, false)}</article>`).join('')}</div>`;
  }).join('');
  const toc = CHAPTERS.map((ch, ci) => `<li><a href="#ch${ci + 1}">פרק ${ci + 1}: ${rich(ch.t)}</a></li>`).join('');
  const how = forPrint
    ? 'כל שאלה בעמוד משלה. לחשוב על תשובה, ואז לדפדף לעמוד הבא: שם התשובה וההסבר. כל מונח מסומן הוא קישור להגדרה שלו במילון בסוף, ושם יש קישורים חזרה לשלבים.'
    : 'לנסות לענות, ואז ללחוץ על "להציג תשובה והסבר". כל מונח מסומן הוא קישור להגדרה שלו במילון בסוף, ושם יש קישורים חזרה לשלבים.';
  return `<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>מסלול לימוד GPU ו-NVLink</title>
<style>${css}${extraCss}</style>
</head>
<body>
<div dir="rtl" lang="he">
  <div class="bar"><div class="bar-in"><a class="nav" href="#intro">התחלה</a><a class="nav" href="#map">מפת המערכת</a><a class="nav" href="#ch1">המסלול</a><a class="nav" href="#glossary">מילון רכיבים</a></div></div>
  <main>
    <header id="intro">
      <p class="kicker">מסלול לימוד · GPU ו-NVLink · גרסה ללא אינטרנט</p>
      <h1>להכיר את כל הרכיבים החשובים של ה-GPU, צעד אחר צעד</h1>
      <p class="lead">${CHAPTERS.length} פרקים, ${STEPS.length} שלבים ו-${Object.keys(G).length} רכיבים. <b>כל שלב הוא שאלה אמריקאית ואחריה הסבר מפורט.</b></p>
      <p>${how}</p>
      <ol class="toc">${toc}<li><a href="#glossary">מילון הרכיבים</a></li></ol>
    </header>
    <section class="sec" id="map"><div class="sec-head"><span class="num">לפני שמתחילים</span><h2>מפת המערכת: כל בלוק הוא קישור להגדרה שלו</h2></div>
      <figure><div class="frame">${map}</div><figcaption>מפה לוגית, לא תוכנית אמיתית של השבב. בקרה למעלה, חישוב באמצע, זיכרון וקישורים למטה.</figcaption></figure></section>
    ${chapters}
    <section class="sec" id="glossary"><div class="sec-head"><span class="num">מילון</span><h2>כל הרכיבים: מה כל אחד עושה במערכת</h2><p>מסודר לפי אזור בשבב. "מופיע בשלבים" מחזיר לשלבים שמדברים על הרכיב.</p></div>${gloss}</section>
  </main>
</div>
</body>
</html>
`;
}

writeFileSync(join(OUT, 'gpu-learning-path-static.html'), page({ open: false, forPrint: false }));
const printHtml = join(OUT, '.print-tmp.html');
writeFileSync(printHtml, page({ open: true, forPrint: true }));
console.log('wrote gpu-learning-path-static.html');

const chrome = process.env.CHROME_PATH;
if (chrome) {
  execFileSync(chrome, ['--headless', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer', '--print-to-pdf-no-header',
    `--print-to-pdf=${join(OUT, 'gpu-learning-path.pdf')}`, `file://${printHtml}`], { stdio: 'ignore' });
  console.log('wrote gpu-learning-path.pdf');
} else console.log('CHROME_PATH not set: skipped the PDF');
