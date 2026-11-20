/* ==========================================================================
   팩트체크 건강연구소 — 무료 웹툴 공통 런타임 (assets/toolkit.js)
   계산기 24종이 함께 씁니다. 테마·입력 수집·결과 렌더·복사·예시 채우기.
   ========================================================================== */
window.WT = (function () {
  'use strict';

  /* ---------- 숫자 포맷 ---------- */
  function fmt(n, d) {
    if (n === null || n === undefined || !isFinite(n)) return '-';
    d = d || 0;
    var s = Number(n).toFixed(d);
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
  function won(n) { return fmt(Math.round(n)) + '원'; }
  function wonShort(n) {
    var a = Math.abs(n);
    if (!isFinite(n)) return '-';
    if (a >= 100000000) return fmt(n / 100000000, 2) + '억원';
    if (a >= 10000) {
      var v = n / 10000;
      return fmt(v, Math.abs(v - Math.round(v)) < 0.05 ? 0 : 1) + '만원';
    }
    return won(n);
  }
  function pct(n, d) { return fmt(n, d === undefined ? 1 : d) + '%'; }

  /* ---------- 테마 ---------- */
  var THEME_KEY = 'fchl-theme';
  var root = document.documentElement;
  var toggle = document.getElementById('themeToggle');
  function applyTheme(mode) {
    root.setAttribute('data-theme', mode);
    if (toggle) {
      toggle.setAttribute('aria-pressed', mode === 'dark' ? 'true' : 'false');
      toggle.setAttribute('aria-label', mode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환');
    }
  }
  var saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
  applyTheme(saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
  }

  /* ---------- 토스트 ---------- */
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  }

  /* ---------- 결과 렌더 ---------- */
  function esc(s) { return String(s); }

  function render(outEl, r) {
    var h = [];
    if (r.verdict) {
      var v = r.verdict;
      h.push('<div class="verdict ' + (v.cls || 'verdict--info') + ' reveal">' +
        '<span class="verdict__icon" aria-hidden="true">' + (v.icon || '✅') + '</span>' +
        '<div class="verdict__body">' +
        (v.kicker ? '<p class="verdict__kicker">' + v.kicker + '</p>' : '') +
        '<p class="verdict__title">' + v.title + '</p>' +
        (v.desc ? '<p class="verdict__desc">' + v.desc + '</p>' : '') +
        '</div></div>');
    }
    if (r.stats && r.stats.length) {
      h.push('<div class="stats">' + r.stats.map(function (s) {
        return '<div class="stat"><span class="stat__l">' + s.l + '</span>' +
          '<strong class="stat__v' + (s.cls ? ' ' + s.cls : '') + '">' + s.v + '</strong>' +
          (s.s ? '<span class="stat__s">' + s.s + '</span>' : '') + '</div>';
      }).join('') + '</div>');
    }
    if (r.rows && r.rows.length) {
      h.push('<div class="card"><div class="kv">' + r.rows.map(function (row) {
        return '<div class="kv__row' + (row.total ? ' kv__row--total' : '') + '">' +
          '<span class="kv__k">' + row.k + (row.note ? '<br><span class="small muted">' + row.note + '</span>' : '') + '</span>' +
          '<span class="kv__v' + (row.cls ? ' ' + row.cls : '') + '">' + row.v +
          (row.unit ? ' <small>' + row.unit + '</small>' : '') + '</span></div>';
      }).join('') + '</div></div>');
    }
    if (r.bars && r.bars.length) {
      h.push('<div class="card"><div class="bars">' + r.bars.map(function (b) {
        var w = Math.max(0, Math.min(100, (b.v / (b.max || 100)) * 100));
        return '<div class="bar"><div class="bar__top">' + b.l + '<b>' + (b.text || fmt(b.v)) + '</b></div>' +
          '<div class="bar__track"><span class="bar__fill ' + (b.color || 'bar__fill--accent') +
          '" style="width:' + (b.hidden ? 0 : w).toFixed(1) + '%"></span></div></div>';
      }).join('') + '</div></div>');
    }
    if (r.table && r.table.rows && r.table.rows.length) {
      h.push('<div class="card"><div class="table-wrap"><table class="rtable"><thead><tr>' +
        r.table.head.map(function (t) { return '<th>' + t + '</th>'; }).join('') +
        '</tr></thead><tbody>' + r.table.rows.map(function (tr) {
          return '<tr>' + tr.map(function (td, i) {
            return i === 0 ? '<td class="rtable__step">' + td + '</td>' : '<td>' + td + '</td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>' +
        (r.table.note ? '<p class="card__hint">' + r.table.note + '</p>' : '') + '</div>');
    }
    if (r.html) h.push(r.html);
    if (r.notes && r.notes.length) {
      h.push(r.notes.map(function (n) {
        return '<div class="note-box' + (n.cls ? ' ' + n.cls : '') + '">' + n.html + '</div>';
      }).join(''));
    }
    outEl.innerHTML = h.join('');
  }

  /* ---------- mount ---------- */
  function mount(opt) {
    var $ = function (id) { return document.getElementById(id); };
    var outEl = $('out');
    var resultSec = $('result');
    var hintEl = $('countHint');
    var shown = false;
    var defaultHint = hintEl ? hintEl.textContent : '';

    function get(id) {
      var el = $(id);
      if (!el) return NaN;
      var raw = String(el.value || '').replace(/[,\s원%]/g, '');
      if (raw === '') return NaN;
      var n = Number(raw);
      return isFinite(n) ? n : NaN;
    }
    function val(id) {
      var el = $(id);
      return el ? String(el.value || '').trim() : '';
    }
    function seg(id) {
      var g = document.querySelector('[data-seg-group="' + id + '"]');
      if (!g) return '';
      var on = g.querySelector('.seg__btn.is-on');
      return on ? on.dataset.val : '';
    }
    function chk(id) {
      var g = document.querySelector('[data-chk-group="' + id + '"]');
      if (!g) return [];
      return Array.prototype.slice.call(g.querySelectorAll('input:checked')).map(function (i) { return i.value; });
    }

    /* 세그먼트 토글 */
    Array.prototype.forEach.call(document.querySelectorAll('[data-seg-group]'), function (g) {
      g.addEventListener('click', function (e) {
        var b = e.target.closest('.seg__btn');
        if (!b || !g.contains(b)) return;
        Array.prototype.forEach.call(g.querySelectorAll('.seg__btn'), function (x) {
          x.classList.toggle('is-on', x === b);
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        if (shown) run(false);
      });
    });

    function setSeg(id, value) {
      var g = document.querySelector('[data-seg-group="' + id + '"]');
      if (!g) return;
      Array.prototype.forEach.call(g.querySelectorAll('.seg__btn'), function (x) {
        x.classList.toggle('is-on', x.dataset.val === String(value));
        x.setAttribute('aria-pressed', x.dataset.val === String(value) ? 'true' : 'false');
      });
    }
    function setChk(id, values) {
      var g = document.querySelector('[data-chk-group="' + id + '"]');
      if (!g) return;
      Array.prototype.forEach.call(g.querySelectorAll('input[type=checkbox]'), function (x) {
        x.checked = (values || []).indexOf(x.value) >= 0;
      });
    }

    function checkRequired() {
      var missing = [];
      (opt.required || []).forEach(function (id) {
        var el = $(id);
        if (!el) return;
        if (el.tagName === 'TEXTAREA' || el.type === 'text' || el.type === 'date') {
          if (!String(el.value || '').trim()) missing.push(id);
        } else if (!isFinite(get(id))) missing.push(id);
      });
      if (opt.validate) {
        var msg = opt.validate(get, seg, chk, val);
        if (msg) return msg;
      }
      if (missing.length) return '값을 먼저 넣어주세요.';
      return null;
    }

    function run(scroll) {
      var err = checkRequired();
      if (err) {
        if (hintEl) hintEl.textContent = err;
        toast(err);
        return false;
      }
      if (hintEl) hintEl.textContent = defaultHint;
      var res;
      try {
        res = opt.compute(get, seg, chk, val, fmt, won, wonShort, pct);
      } catch (e) {
        toast('입력값을 다시 확인해 주세요.');
        return false;
      }
      if (!res) return false;
      render(outEl, res);
      if (!shown) {
        resultSec.hidden = false;
        shown = true;
        if (scroll) {
          var y = resultSec.getBoundingClientRect().top + window.pageYOffset - 64;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }
      return true;
    }

    /* 자동 재계산 */
    var t = null;
    document.addEventListener('input', function (e) {
      if (!shown) return;
      if (!e.target.matches('input, textarea')) return;
      clearTimeout(t);
      t = setTimeout(function () { run(false); }, 260);
    });
    document.addEventListener('change', function (e) {
      if (!shown) return;
      if (!e.target.matches('input[type=checkbox]')) return;
      clearTimeout(t);
      t = setTimeout(function () { run(false); }, 60);
    });

    var btn = $('analyzeBtn');
    if (btn) btn.addEventListener('click', function () { run(true); });

    var reset = $('resetBtn');
    if (reset) reset.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('.fgrid input, .fgrid textarea'), function (el) {
        if (el.type === 'checkbox') return;
        el.value = '';
      });
      Array.prototype.forEach.call(document.querySelectorAll('[data-chk-group] input'), function (el) { el.checked = false; });
      Array.prototype.forEach.call(document.querySelectorAll('.preset'), function (p) { p.classList.remove('is-on'); });
      if (hintEl) hintEl.textContent = defaultHint;
      if (opt.onReset) opt.onReset();
      if (shown) { resultSec.hidden = true; shown = false; }
      var toolSec = $('tool');
      if (toolSec) window.scrollTo({ top: toolSec.getBoundingClientRect().top + window.pageYOffset - 60, behavior: 'smooth' });
      toast('입력값을 지웠습니다.');
    });

    var edit = $('editBtn');
    if (edit) edit.addEventListener('click', function () {
      document.getElementById('tool').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    var copy = $('copyBtn');
    if (copy) copy.addEventListener('click', function () {
      var txt = outEl.innerText.replace(/\n{3,}/g, '\n\n').trim();
      var full = document.title.split('|')[0].trim() + '\n' + txt + '\n\n' + location.href;
      var done = function () { toast('결과를 복사했습니다.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(full).then(done, function () { fallback(full, done); });
      } else fallback(full, done);
    });
    function fallback(text, done) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('복사가 막혀 있어요.'); }
      document.body.removeChild(ta);
    }

    /* 예시 */
    Array.prototype.forEach.call(document.querySelectorAll('[data-preset]'), function (b) {
      b.addEventListener('click', function () {
        var p = (opt.presets || {})[b.dataset.preset];
        if (!p) return;
        Array.prototype.forEach.call(document.querySelectorAll('.preset'), function (x) { x.classList.remove('is-on'); });
        b.classList.add('is-on');
        if (p.fields) Object.keys(p.fields).forEach(function (id) {
          var el = $(id);
          if (el) el.value = p.fields[id];
        });
        if (p.segs) Object.keys(p.segs).forEach(function (id) { setSeg(id, p.segs[id]); });
        if (p.checks) Object.keys(p.checks).forEach(function (id) { setChk(id, p.checks[id]); });
        if (opt.onPreset) opt.onPreset(p, setSeg, setChk);
        run(true);
      });
    });

    if (opt.auto) {
      var at = null;
      document.addEventListener('input', function () {
        clearTimeout(at);
        at = setTimeout(function () { run(false); }, 140);
      });
    }

    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();

    if (opt.onInit) opt.onInit(get, seg, chk, val, run);
  }

  return { mount: mount, fmt: fmt, won: won, wonShort: wonShort, pct: pct, toast: toast, render: render };
})();
