// Frisian spell checker for the Fryske Akademy's Hunspell word list (fy_NL).
// Implements the Hunspell features this dictionary uses: word list with the
// PFX and KEEPCASE flags, capitalisation rules, trailing-dot abbreviations,
// numbers, BREAK rules, REP (preferred forms) and MAP/TRY (suggestions).
// MIT License (this file). The word list itself is GPL v3, (c) Fryske Akademy.
(function (root) {
'use strict';

const APOS = /\u2019/g;                     // typographic apostrophe -> '
const WORD_RE = /[\p{L}\p{M}\p{N}'\u2019.\-]+/gu;
const SKIP_RE = /\b(?:https?:\/\/|www\.)[^\s]+|[^\s@]+@[^\s@]+\.[^\s@]+/giu;
const NUMBER_RE = /^[0-9]+(?:[.,\-][0-9]+)*$/;
const HAS_LETTER = /\p{L}/u;

function captype(w) {
  let up = 0, low = 0;
  for (const c of w) {
    if (c !== c.toLowerCase()) up++;
    else if (c !== c.toUpperCase()) low++;
  }
  if (up === 0) return 'no';
  const first = [...w][0];
  const firstUp = first !== first.toLowerCase();
  if (low === 0) return 'all';
  if (up === 1 && firstUp) return 'init';
  return firstUp ? 'huhinit' : 'huh';
}
const capitalize = w => { const c = [...w]; return c.length ? c[0].toUpperCase() + c.slice(1).join('') : w; };

function Speller(affText, dicText) {
  const S = this;
  const words = new Map();          // form -> keepcase?
  const pfx = [];                    // [flag, strip, add]
  let keepFlag = null;
  const rep = new Map();             // wrong word -> [preferred forms]
  const maps = [];                   // arrays of alternatives
  let tryChars = '';
  const breaks = [];

  for (const raw of affText.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line[0] === '#') continue;
    const p = line.split(/\s+/);
    switch (p[0]) {
      case 'KEEPCASE': keepFlag = p[1]; break;
      case 'TRY': tryChars = p[1] || ''; break;
      case 'PFX': {
                    const header = p.length === 4 && /^[YN]$/.test(p[2]) && /^\d+$/.test(p[3]);
                    if (!header && p.length >= 4) pfx.push([p[1], p[2] === '0' ? '' : p[2], p[3] === '0' ? '' : p[3]]);
                  } break;
      case 'REP': if (p.length === 3) {
                    const from = p[1].replace(/_/g, ' '), to = p[2].replace(/_/g, ' ');
                    if (from[0] === '^' && from.endsWith('$')) {
                      const k = from.slice(1, -1);
                      if (!rep.has(k)) rep.set(k, []);
                      rep.get(k).push(to);
                    }
                  } break;
      case 'MAP': if (p.length === 2 && isNaN(+p[1])) {
                    const alts = [];
                    for (const m of p[1].matchAll(/\(([^)]+)\)|./gu)) alts.push(m[1] || m[0]);
                    maps.push(alts);
                  } break;
      case 'BREAK': if (p.length === 2 && isNaN(+p[1])) breaks.push(p[1]); break;
    }
  }

  const lines = dicText.split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l) continue;
    const slash = l.indexOf('/');
    const w = slash < 0 ? l : l.slice(0, slash);
    const flags = slash < 0 ? '' : l.slice(slash + 1).split(/\s/)[0];
    const keep = keepFlag !== null && flags.includes(keepFlag);
    if (!words.has(w) || keep) words.set(w, keep || (words.get(w) || false));
    for (const [flag, strip, add] of pfx) {
      if (flags.includes(flag) && w.startsWith(strip)) {
        const f = add + w.slice(strip.length);
        if (!words.has(f)) words.set(f, keep);
      }
    }
  }

  function has(w, allowKeep) {
    if (!words.has(w)) return false;
    return allowKeep || !words.get(w);
  }

  // Hunspell's spell() for one word (no surrounding punctuation)
  function checkWord(w, depth) {
    if (!w) return true;
    if (NUMBER_RE.test(w)) return true;
    let abbv = 0;
    while (w.endsWith('.')) { w = w.slice(0, -1); abbv++; }
    if (!w) return true;
    if (checkCase(w) || (abbv && checkCase(w + '.'))) return true;
    if ((depth || 0) > 8) return false;
    for (const b of breaks) {                                // BREAK rules
      if (b[0] === '^') {
        const s = b.slice(1);
        if (w.startsWith(s) && w.length > s.length && checkWord(w.slice(s.length), (depth || 0) + 1)) return true;
      } else if (b.endsWith('$')) {
        const s = b.slice(0, -1);
        if (w.endsWith(s) && w.length > s.length && checkWord(w.slice(0, -s.length), (depth || 0) + 1)) return true;
      } else {
        const i = w.indexOf(b);
        if (i > 0 && i + b.length < w.length &&
            checkWord(w.slice(0, i), (depth || 0) + 1) && checkWord(w.slice(i + b.length), (depth || 0) + 1)) return true;
      }
    }
    return false;
  }

  function checkCase(w) {
    if (has(w, true)) return true;
    const ct = captype(w);
    const lower = w.toLowerCase();
    if (ct === 'init') return has(lower, false);
    if (ct === 'all') {
      if (has(lower, false) || has(capitalize(lower), false)) return true;
      // ALL-CAPS compounds: each part may be lower, capitalised or upper (SÚD-AFRIKA'S -> Súd-Afrika's)
      const parts = lower.split(/([-'])/);
      const n = parts.filter((x, i) => i % 2 === 0).length;
      if (n < 2 || n > 5) return false;
      const variants = x => [...new Set([x, capitalize(x), x.toUpperCase()])];
      const walk = (i, acc) => {
        if (i >= parts.length) return has(acc, false);
        if (i % 2) return walk(i + 1, acc + parts[i]);
        return variants(parts[i]).some(v => walk(i + 1, acc + v));
      };
      return walk(0, '');
    }
    if (ct === 'huhinit') {
      const c = [...w];
      return has(c[0].toLowerCase() + c.slice(1).join(''), false);
    }
    return false;
  }

  S.check = w => checkWord(w.replace(APOS, "'"));

  // ---------------- tokenizing a paragraph ----------------
  // returns [{start, end, word}] of misspelled words (offsets in the original text)
  S.checkText = function (text, ignore) {
    const out = [];
    const skip = [];
    for (const m of text.matchAll(SKIP_RE)) skip.push([m.index, m.index + m[0].length]);
    for (const m of text.matchAll(WORD_RE)) {
      let start = m.index, tok = m[0];
      if (skip.some(([a, b]) => start < b && start + tok.length > a)) continue;
      while (tok[0] === '.') { tok = tok.slice(1); start++; }      // leading dots
      if (!tok || !HAS_LETTER.test(tok)) continue;
      if (S.check(tok)) continue;
      // report the core word: without surrounding quotes, hyphens and trailing dots
      let core = tok, cs = start;
      while (core && /^['\u2019\-]/.test(core)) { core = core.slice(1); cs++; }
      core = core.replace(/['\u2019\-.]+$/, '');
      if (!core || !HAS_LETTER.test(core)) continue;
      if (ignore && (ignore.has(core) || ignore.has(core.toLowerCase()))) continue;
      out.push({ start: cs, end: cs + core.length, word: core, kind: S.isNonStandard(core) ? 'nonstandard' : 'unknown' });
    }
    return out;
  };

  // ---------------- suggestions ----------------
  S.isNonStandard = w => { w = w.replace(APOS, "'"); return rep.has(w) || rep.has(w.toLowerCase()); };

  function restoreCase(orig, s) {
    const ct = captype(orig);
    if (ct === 'all' && [...orig].length > 1) return s.toUpperCase();
    if (ct === 'init' || ct === 'huhinit') return capitalize(s);
    return s;
  }
  const strip = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

  const sugCache = new Map();
  S.suggest = function (word, max) {
    max = max || 5;
    const key = word + '\u0000' + max;
    if (!sugCache.has(key)) sugCache.set(key, suggestUncached(word, max));
    return sugCache.get(key).slice();
  };
  function suggestUncached(word, max) {
    const w = word.replace(APOS, "'");
    const lw = w.toLowerCase();
    const seen = new Set([w]);
    const out = [];
    const add = s => { if (!seen.has(s)) { seen.add(s); out.push(restoreCase(w, s)); } };

    for (const s of (rep.get(w) || rep.get(lw) || [])) add(s);          // preferred forms
    if (has(capitalize(lw), true) && capitalize(lw) !== w) add(capitalize(lw));   // proper noun typed in lower case
    if (out.length >= max) return out.slice(0, max);

    const found = [], tried = new Set([lw]);
    // candidates must be real dictionary forms (no BREAK/number shortcuts); proper nouns get capitalised
    const test = (c, score) => {
      if (tried.has(c)) return;
      tried.add(c);
      if (seen.has(c)) return;
      if (checkCase(c)) found.push([score, c]);
      else { const cc = capitalize(c); if (cc !== c && !seen.has(cc) && has(cc, true)) found.push([score, cc]); }
    };

    // MAP: exchange related letters (a/â/á, i/y/ij, f/v, ...)
    const chars = [...lw];
    for (let i = 0; i < chars.length; i++) {
      for (const group of maps) {
        for (const from of group) {
          if (lw.startsWith(from, chars.slice(0, i).join('').length)) {
            const pre = chars.slice(0, i).join(''), post = lw.slice(pre.length + from.length);
            for (const to of group) if (to !== from) test(pre + to + post, 0);
          }
        }
      }
    }
    const letters = [...new Set([...tryChars.toLowerCase()].filter(c => /\p{L}|'|-/u.test(c)))];
    const edits1 = s => {
      const c = [...s], res = [];
      for (let i = 0; i < c.length; i++) res.push(c.slice(0, i).join('') + c.slice(i + 1).join(''));
      for (let i = 0; i < c.length - 1; i++) res.push(c.slice(0, i).join('') + c[i + 1] + c[i] + c.slice(i + 2).join(''));
      for (let i = 0; i < c.length; i++) for (const l of letters) if (l !== c[i]) res.push(c.slice(0, i).join('') + l + c.slice(i + 1).join(''));
      for (let i = 0; i <= c.length; i++) for (const l of letters) res.push(c.slice(0, i).join('') + l + c.slice(i).join(''));
      return res;
    };
    const e1 = edits1(lw);
    for (const c of e1) test(c, 1);
    if (found.length === 0 && chars.length <= 20) {
      let budget = 150000;
      for (const c of e1) { for (const d of edits1(c)) { test(d, 2); if (--budget <= 0) break; } if (budget <= 0) break; }
    }
    const sw = strip(lw), first = chars[0];
    found.sort((a, b) => {
      const ka = [strip(a[1]) === sw ? 0 : 1, a[0], a[1][0] === first ? 0 : 1, Math.abs(a[1].length - lw.length)];
      const kb = [strip(b[1]) === sw ? 0 : 1, b[0], b[1][0] === first ? 0 : 1, Math.abs(b[1].length - lw.length)];
      for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
      return a[1] < b[1] ? -1 : 1;
    });
    for (const [, c] of found) add(c);
    return out.slice(0, max);
  }

  S.size = words.size;
  S.repSize = rep.size;
}

if (typeof module !== 'undefined') module.exports = { Speller };
else root.Speller = Speller;
})(this);
