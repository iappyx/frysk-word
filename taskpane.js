// Iepen Fryske Stavering -- Word add-in task pane. MIT License.
/* global Office, Word, Speller */
'use strict';

const T = {
  loading: 'Wurdlist wurdt laden…',
  checking: 'Dokumint wurdt kontrolearre…',
  noErrors: 'Gjin flaters fûn',
  errors: n => n === 1 ? '1 flater' : n + ' flaters',
  nonstd: n => n === 1 ? '1 wurd mei foarkarsfoarm' : n + ' wurden mei foarkarsfoarm',
  unknown: 'Net yn ’e wurdlist',
  nonstandard: 'Net de foarkarsfoarm',
  noSugg: 'Gjin suggestjes',
  ignore: 'Negearje',
  add: 'Taheakje',
  loadFailed: 'De wurdlist koe net laden wurde.',
  notWord: 'Dizze tafoeging wurket allinnich yn Word.',
  annFailed: 'Streekjes yn ’e tekst slagje net:',
  checkFailed: 'Kontrolearjen mislearre:',
  noneMarked: 'Neat yn dit dokumint is as Frysk markearre. Selektearje Fryske tekst en kies ‘Seleksje as Frysk’.',
  selectFirst: 'Selektearje earst in stik tekst.',
  markFailed: 'Markearjen mislearre:',
  textChanged: 'De tekst is krekt feroare; it dokumint wurdt opnij kontrolearre.',
  actionFailed: 'Dat slagge net:',
};

const FY = 'FrisianNetherlands';

const $ = id => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem('fy.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('fy.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
};

let speller = null;
const sessionIgnore = new Set();
const added = new Set(store.get('added', []));
const opts = { auto: store.get('auto', true), squiggles: store.get('squiggles', true) };
let API = { ids: false, events: false, annotations: false, popup: false, lang: false };
let paras = [];                         // [{key, index, text, fy, issues}]
const cache = new Map();                // paragraph text -> issues
const annMap = new Map();               // annotation id -> {key, issue}
let busy = false, again = false, timer = null;
let forceAll = false;                   // redo every paragraph at the next check (squiggles, marking, …)
const forceKeys = new Set();            // redo these paragraphs at the next check
let shownSig = '';                      // what the panel shows now, to skip needless redraws
const diag = { annOk: 0, annError: '', popupDropped: false, fyFull: 0, fyPart: 0 };

function ignoreSet() { return new Set([...sessionIgnore, ...added]); }

function checkParagraph(text) {
  if (cache.has(text)) return cache.get(text);
  const issues = speller.checkText(text, ignoreSet());
  for (const is of issues) is.sugg = speller.suggest(is.word, 5);
  cache.set(text, issues);
  return issues;
}

// ---------------------------------------------------------------- Word
function para(ctx, p) {
  if (API.ids) return ctx.document.getParagraphByUniqueLocalId(p.key);
  return ctx.document.body.paragraphs.items[p.index];
}

async function checkDocument() {
  if (!speller) return;
  if (busy) { again = true; return; }
  busy = true;
  // take the redo requests now; requests made during this check go to the next one
  const all = forceAll, keys = new Set(forceKeys);
  forceAll = false; forceKeys.clear();
  let pending = [];
  if (!paras.length) status(T.checking);          // only while the panel is still empty; later checks run silently
  try {
    await Word.run(async ctx => {
      const ps = ctx.document.body.paragraphs;
      ps.load(API.ids ? 'items/text,items/uniqueLocalId' : 'items/text');
      await ctx.sync();
      const fy = await frisianParts(ctx, ps.items);
      const old = new Map(paras.map(p => [p.key, p]));
      const next = [], changed = [];
      ps.items.forEach((item, index) => {
        const key = API.ids ? item.uniqueLocalId : 'p' + index;
        const text = item.text;
        const prev = old.get(key);
        const f = fy[index];
        // text not marked Frisian isn't spell-checked at all (suggestions are costly)
        const issues = f === true ? checkParagraph(text) : f && f.length ? onlyFrisian(checkParagraph(text), f) : [];
        const p = { key, index, text, fy: f, issues };
        if (all || keys.has(key) || !prev || prev.text !== text || JSON.stringify(prev.fy) !== JSON.stringify(f)) changed.push(p);
        next.push(p);
      });
      paras = next;
      pending = changed;
      const live = new Set(next.map(p => p.text));   // forget texts that are no longer in the document
      for (const t of cache.keys()) if (!live.has(t)) cache.delete(t);
      diag.fyFull = fy.filter(x => x === true).length;
      diag.fyPart = fy.filter(x => Array.isArray(x) && x.length).length;
    });
    const sig = paras.map(p => p.key + '\u0001' + p.issues.map(is => is.start + is.word).join()).join('\u0002');
    if (sig !== shownSig || all || pending.length) { render(); shownSig = sig; }
    if (API.annotations && opts.squiggles && pending.length) await annotateSafe(pending);
    renderDiag();
  } catch (e) {
    console.error(e);
    forceAll = forceAll || all;                  // try these again next time
    keys.forEach(k => forceKeys.add(k));
    shownSig = '';
    status(T.checkFailed + ' ' + describe(e));
    showDiag();
  }
  busy = false;
  if (again) { again = false; schedule(300); }
}

// Only text marked as Frisian in Word (Tools › Language, or the panel's buttons) is checked;
// Word itself leaves that text alone, as Word for Mac has no Frisian proofing tools.
// Per paragraph: true (all Frisian), false (none) or [[start, end], ...] for the Frisian
// words in a paragraph with mixed languages.
function isLanguage(v) { return typeof v === 'string' && (!Word.LanguageId || Object.values(Word.LanguageId).includes(v)); }

async function frisianParts(ctx, items) {
  if (!API.lang) return items.map(() => true);      // can't read languages: check everything
  const whole = items.map(item => {
    if (!item.text.trim()) return null;
    const r = item.getRange('Content');
    r.load('languageId');
    return r;
  });
  await ctx.sync();
  const out = [], mixed = [];
  whole.forEach((r, i) => {
    if (!r) out[i] = false;
    else if (r.languageId === FY) out[i] = true;
    else if (isLanguage(r.languageId)) out[i] = false;
    else {                                          // mixed: look word by word
      const words = items[i].getRange('Content').getTextRanges([' '], true);
      words.load('items/text,items/languageId');
      mixed.push([i, words]);
    }
  });
  if (mixed.length) await ctx.sync();
  for (const [i, words] of mixed) {
    const text = items[i].text, spans = [];
    let pos = 0;
    for (const w of words.items) {
      const at = w.text ? text.indexOf(w.text, pos) : -1;
      if (at < 0) continue;
      pos = at + w.text.length;
      if (w.languageId === FY || !isLanguage(w.languageId)) spans.push([at, pos]);   // partly Frisian counts
    }
    out[i] = spans;
  }
  return out;
}

function onlyFrisian(issues, fy) {
  if (fy === true) return issues;
  if (!fy) return [];
  return issues.filter(is => fy.some(([a, b]) => is.start >= a && is.start < b));
}

// Mark the selection or the whole document as Frisian. Also switches Word's own check back
// on there, undoing the "no proofing" an earlier version of this add-in set.
async function markFrisian(whole) {
  let ok = false;
  try {
    await Word.run(async ctx => {
      const r = whole ? ctx.document.body.getRange('Whole') : ctx.document.getSelection();
      r.load('text');
      await ctx.sync();
      if (!whole && !r.text.trim()) return;         // an empty document can be marked: new text then is Frisian
      r.languageId = FY;
      r.hasNoProofing = false;
      await ctx.sync();
      ok = true;
    });
  } catch (e) {
    console.error(e);
    status(T.markFailed + ' ' + describe(e));
    return;
  }
  if (!ok) { status(T.selectFirst); return; }
  forceAll = true;
  schedule(0);
}

function describe(e) {
  if (!e) return '';
  let t = (e.code || e.name || 'Error') + ': ' + (e.message || e);
  const loc = e.debugInfo && e.debugInfo.errorLocation;
  if (loc) t += ' (' + loc + ')';
  return t;
}

// Annotations get their own Word.run, so a failure can't hide behind a filled panel.
// If Word rejects the pop-up options (e.g. resource IDs missing from the installed
// manifest), retry once with plain squiggles and keep it that way for this session.
async function annotateSafe(list) {
  try {
    diag.annOk += await annotate(list, API.popup);
    diag.annError = '';
  } catch (e) {
    console.error(e);
    diag.annError = describe(e);
    if (API.popup) {
      try {
        diag.annOk += await annotate(list, false);
        API.popup = false; diag.popupDropped = true;
        diag.annError += ' → sûnder pop-up opnij besocht: slagge';
      } catch (e2) {
        console.error(e2);
        diag.annError += ' | sûnder pop-up: ' + describe(e2);
      }
    }
  }
  renderDiag();
}

async function annotate(list, withPopup) {
  let count = 0;
  await Word.run(async ctx => {
    const ps = ctx.document.body.paragraphs;
    ps.load(API.ids ? 'items/text,items/uniqueLocalId' : 'items/text');
    await ctx.sync();
    const byKey = new Map(ps.items.map((item, i) => [API.ids ? item.uniqueLocalId : 'p' + i, item]));
    const work = [];
    for (const p of list) {
      const item = byKey.get(p.key);
      if (item && item.text === p.text) work.push([p, item]);   // changed meanwhile: next check handles it
    }
    const colls = work.map(([, item]) => { const c = item.getAnnotations(); c.load('items/id'); return c; });
    await ctx.sync();
    colls.forEach(c => c.items.forEach(a => { annMap.delete(a.id); a.delete(); }));
    await ctx.sync();
    const results = [];
    for (const [p, item] of work) {
      const shown = p.issues.filter(is => !ignoreSet().has(is.word));
      if (!shown.length) continue;
      const critiques = shown.map(is => {
        const c = {
          colorScheme: is.kind === 'nonstandard' ? Word.CritiqueColorScheme.blue : Word.CritiqueColorScheme.red,
          start: is.start,
          length: is.end - is.start,
        };
        if (withPopup) c.popupOptions = {
          brandingTextResourceId: 'Fy.Brand',
          titleResourceId: is.kind === 'nonstandard' ? 'Fy.NonStd' : 'Fy.Unknown',
          subtitleResourceId: 'Fy.Subtitle',
          suggestions: is.sugg.slice(0, 3),
        };
        return c;
      });
      results.push([p, shown, item.insertAnnotations({ critiques })]);
    }
    await ctx.sync();
    for (const [p, shown, res] of results) (res.value || []).forEach((id, i) => { annMap.set(id, { key: p.key, issue: shown[i] }); count++; });
  });
  return count;
}

async function clearAnnotations() {
  if (!API.annotations) return;
  await Word.run(async ctx => {
    const ps = ctx.document.body.paragraphs;
    ps.load('items');
    await ctx.sync();
    const colls = ps.items.map(p => { const c = p.getAnnotations(); c.load('items/id'); return c; });
    await ctx.sync();
    colls.forEach(c => c.items.forEach(a => a.delete()));
    await ctx.sync();
    annMap.clear();
  });
}

// the n-th occurrence of issue.word in its paragraph, as a Word range; null when the
// paragraph has changed since it was checked (the occurrence count would be off)
async function locate(ctx, p, issue) {
  if (!API.ids) { ctx.document.body.paragraphs.load('items'); await ctx.sync(); }
  const par = para(ctx, p);
  if (!par) return null;
  par.load('text');
  const res = par.search(issue.word, { matchCase: true });
  res.load('items/text');
  await ctx.sync();
  if (par.text !== p.text) return null;
  let k = 0, i = -1;
  while ((i = p.text.indexOf(issue.word, i + 1)) !== -1 && i < issue.start) k++;
  return res.items[k] || null;
}

// run an action on an issue's word; if the text changed or is gone, say so and re-check
async function onIssue(p, issue, act) {
  let found = false;
  try {
    await Word.run(async ctx => {
      const r = await locate(ctx, p, issue);
      if (r) { act(r); await ctx.sync(); found = true; }
    });
    if (!found) status(T.textChanged);
  } catch (e) {
    console.error(e);
    status(e.code === 'ItemNotFound' ? T.textChanged : T.actionFailed + ' ' + describe(e));
  }
  return found;
}

async function selectIssue(p, issue) {
  if (!await onIssue(p, issue, r => r.select())) schedule(0);
}

async function replaceIssue(p, issue, text) {
  await onIssue(p, issue, r => r.insertText(text, 'Replace'));
  schedule(100);
}

function ignoreWord(word, forever) {
  (forever ? added : sessionIgnore).add(word);
  if (forever) store.set('added', [...added]);
  cache.clear();
  paras.forEach(p => { if (p.issues.some(is => is.word === word)) forceKeys.add(p.key); });
  schedule(50);
}

async function onPopupAction(args) {
  const info = annMap.get(args.id);
  if (args.action === 'Accept' && args.critiqueSuggestion) {
    await Word.run(async ctx => {                      // Word may already have replaced it
      const ann = ctx.document.getAnnotationById(args.id);
      ann.load('critiqueAnnotation/range/text');
      await ctx.sync();
      const r = ann.critiqueAnnotation.range;
      if (r.text !== args.critiqueSuggestion) { r.insertText(args.critiqueSuggestion, 'Replace'); await ctx.sync(); }
    }).catch(() => {});
  } else if (info) {
    ignoreWord(info.issue.word, false);
  }
  schedule(200);
}

function schedule(ms) {
  clearTimeout(timer);
  timer = setTimeout(checkDocument, ms);
}

// ---------------------------------------------------------------- panel
function status(t) { $('status').textContent = t; }

// Diagnoaze stays out of sight unless something goes wrong or it's switched on
// by clicking the panel title five times (the same toggles it off; remembered).
function showDiag() { $('diag').hidden = false; }

function bindDiagToggle() {
  let clicks = 0, t = null;
  $('title').addEventListener('click', () => {
    clicks++; clearTimeout(t); t = setTimeout(() => { clicks = 0; }, 1500);
    if (clicks < 5) return;
    clicks = 0;
    const on = $('diag').hidden;
    $('diag').hidden = !on; $('diag').open = on;
    store.set('diag', on);
  });
}

function renderDiag() {
  if (diag.annError) showDiag();
  const box = $('annError');
  box.hidden = !diag.annError;
  box.textContent = diag.annError ? T.annFailed + ' ' + diag.annError : '';
  const d = Office.context && Office.context.diagnostics;
  const sup = v => Office.context.requirements.isSetSupported('WordApi', v) ? '✓' : '✗';
  $('diagText').textContent = [
    'Word: ' + (d ? d.version + ' (' + d.platform + ')' : '?'),
    'WordApi 1.6 ' + sup('1.6') + ' · 1.7 ' + sup('1.7') + ' · 1.8 ' + sup('1.8'),
    'Streekjes: ' + (API.annotations ? (opts.squiggles ? 'oan' : 'út') : 'net stipe') +
      (API.annotations ? ' · pop-up: ' + (API.popup ? 'ja' : diag.popupDropped ? 'nee (wegere)' : 'nee') : ''),
    'Pleatst: ' + diag.annOk,
    'Taal lêze (WordApiDesktop 1.3): ' + (API.lang ? '✓' : '✗ (alles wurdt kontrolearre)'),
    API.lang ? 'Frysk markearre: ' + diag.fyFull + ' alinea’s, ' + diag.fyPart + ' foar in part' : '',
    diag.annError ? 'Lêste flater: ' + diag.annError : '',
  ].filter(Boolean).join('\n');
}

function render() {
  const list = $('list');
  list.textContent = '';
  const groups = new Map();                    // word -> {kind, sugg, where:[[p, issue]]}
  for (const p of paras) for (const is of p.issues) {
    if (ignoreSet().has(is.word)) continue;
    if (!groups.has(is.word)) groups.set(is.word, { kind: is.kind, sugg: is.sugg, where: [] });
    groups.get(is.word).where.push([p, is]);
  }
  let nErr = 0, nStd = 0;
  for (const [word, g] of groups) {
    if (g.kind === 'nonstandard') nStd += g.where.length; else nErr += g.where.length;
    const row = document.createElement('div');
    row.className = 'row ' + g.kind;
    const head = document.createElement('div');
    head.className = 'head';
    const w = document.createElement('button');
    w.className = 'word'; w.textContent = word + (g.where.length > 1 ? '  ×' + g.where.length : '');
    w.title = g.kind === 'nonstandard' ? T.nonstandard : T.unknown;
    w.onclick = () => selectIssue(...g.where[0]);
    head.append(w);
    const kind = document.createElement('span');
    kind.className = 'kind'; kind.textContent = g.kind === 'nonstandard' ? T.nonstandard : T.unknown;
    head.append(kind);
    row.append(head);
    const chips = document.createElement('div');
    chips.className = 'chips';
    if (!g.sugg.length) { const s = document.createElement('span'); s.className = 'none'; s.textContent = T.noSugg; chips.append(s); }
    for (const s of g.sugg) {
      const b = document.createElement('button');
      b.className = 'chip'; b.textContent = s;
      b.onclick = () => replaceIssue(...g.where[0], s);
      chips.append(b);
    }
    row.append(chips);
    const acts = document.createElement('div');
    acts.className = 'acts';
    const ig = document.createElement('button'); ig.className = 'link'; ig.textContent = T.ignore; ig.onclick = () => ignoreWord(word, false);
    const ad = document.createElement('button'); ad.className = 'link'; ad.textContent = T.add; ad.onclick = () => ignoreWord(word, true);
    acts.append(ig, ad);
    row.append(acts);
    list.append(row);
  }
  $('countErr').textContent = T.errors(nErr);
  $('countStd').textContent = T.nonstd(nStd);
  $('countErr').hidden = !nErr; $('countStd').hidden = !nStd;
  const noneMarked = API.lang && paras.some(p => p.text.trim()) && !paras.some(p => p.fy === true || (p.fy && p.fy.length));
  status(nErr + nStd ? '' : noneMarked ? T.noneMarked : T.noErrors);
}

function bindOptions() {
  for (const k of Object.keys(opts)) {
    const el = $('opt-' + k);
    if (!el) continue;
    el.checked = opts[k];
    el.onchange = async () => {
      opts[k] = el.checked; store.set(k, opts[k]);
      if (k === 'squiggles') { if (!el.checked) await clearAnnotations(); forceAll = true; }
      schedule(50);
    };
  }
  if (!API.annotations) $('opt-squiggles-row').hidden = true;
  $('mark').hidden = !API.lang;
  $('markSel').onclick = () => markFrisian(false);
  $('markDoc').onclick = () => markFrisian(true);
  $('checkNow').onclick = () => { forceAll = true; schedule(0); };
}

async function loadDictionary() {
  status(T.loading);
  const [aff, dic] = await Promise.all(['dict/fy_NL.aff', 'dict/fy_NL.dic'].map(f => fetch(f).then(r => {
    if (!r.ok) throw new Error(f + ': ' + r.status);
    return r.text();
  })));
  speller = new Speller(aff, dic);
}

async function start() {
  try { await loadDictionary(); } catch (e) { status(T.loadFailed); console.error(e); return; }
  if (typeof Word === 'undefined') { demoMode(); return; }
  const sup = v => Office.context.requirements.isSetSupported('WordApi', v);
  API = { ids: sup('1.6'), events: sup('1.6'), annotations: sup('1.7'), popup: sup('1.8'),
          lang: Office.context.requirements.isSetSupported('WordApiDesktop', '1.3') };
  // Word on the web reports WordApiDesktop 1.3 but has no Range.languageId (ApiNotFound),
  // so try reading a language once; without it, all text is checked and marking is hidden.
  if (API.lang) API.lang = await Word.run(async ctx => {
    const r = ctx.document.body.getRange('Start');
    r.load('languageId');
    await ctx.sync();
    return true;
  }).catch(e => { console.warn(e); return e.code !== 'ApiNotFound'; });   // other errors (e.g. an empty document) don't mean it's missing
  bindOptions();
  $('diag').hidden = !store.get('diag', false);
  bindDiagToggle();
  renderDiag();
  if (API.events) {
    await Word.run(async ctx => {
      const d = ctx.document, go = () => { if (opts.auto) schedule(700); };
      d.onParagraphChanged.add(go); d.onParagraphAdded.add(go); d.onParagraphDeleted.add(go);
      if (API.popup) d.onAnnotationPopupAction.add(onPopupAction);
      await ctx.sync();
    }).catch(e => console.error(e));
  }
  // Word reports no event when a language is changed via Tools › Language, so also re-check
  // once the cursor has moved and stayed put; unchanged paragraphs are not checked again.
  Office.context.document.addHandlerAsync(Office.EventType.DocumentSelectionChanged,
    () => { if (opts.auto) schedule(API.events ? 1000 : 1500); });
  checkDocument();
}

// Opened outside Word (e.g. in a browser): check text typed into a box, to test the word list
function demoMode() {
  $('demo').hidden = false;
  bindOptions();
  $('opt-squiggles-row').hidden = true;
  const run = () => {
    const text = $('demoText').value;
    paras = text.split('\n').map((t, i) => ({ key: 'p' + i, index: i, text: t, issues: checkParagraph(t) }));
    render();
  };
  $('demoText').oninput = () => { clearTimeout(timer); timer = setTimeout(run, 300); };
  selectIssue = async () => {};                    // eslint-disable-line no-func-assign
  replaceIssue = async (p, is, s) => {             // eslint-disable-line no-func-assign
    const lines = $('demoText').value.split('\n');
    lines[p.index] = lines[p.index].slice(0, is.start) + s + lines[p.index].slice(is.end);
    $('demoText').value = lines.join('\n'); run();
  };
  checkDocument = async () => run();               // eslint-disable-line no-func-assign
  run();
}

// Links in the panel open in the web browser; inside Word the panel itself must not navigate away.
document.addEventListener('click', e => {
  const a = e.target.closest && e.target.closest('a[href^="http"]');
  if (!a) return;
  try {
    if (typeof Office !== 'undefined' && Office.context && Office.context.ui && Office.context.ui.openBrowserWindow) {
      e.preventDefault();
      Office.context.ui.openBrowserWindow(a.href);
    }
  } catch (err) { /* fall back to target="_blank" */ }
});

if (typeof Office !== 'undefined') Office.onReady(info => {
  if (info.host && info.host !== Office.HostType.Word) { status(T.notWord); return; }
  start();
});
else start();
