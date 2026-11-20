/* ==========================================================================
   Zone 2 지방연소 심박수 계산기 — zone2-hr/app.js
   ========================================================================== */
(function () {
  'use strict';

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
  var savedTheme = null;
  try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) {}
  applyTheme(savedTheme || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  if (toggle) toggle.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  });

  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  }

  var $ = function (id) { return document.getElementById(id); };
  var STORE = 'fchl-zone-v1';
  var resultEl = $('result');
  var state = { formula: 'tanaka' };

  var ZONES = [
    { n: 1, name: 'Zone 1 회복', pct: [50, 60], desc: '숨 편하고 노래도 가능 — 워밍업·쿨다운' },
    { n: 2, name: 'Zone 2 지방연소', pct: [60, 70], desc: '대화는 되고 노래는 힘듦 — 오래 가는 강도' },
    { n: 3, name: 'Zone 3 템포', pct: [70, 80], desc: '짧은 문장만 가능 — 심폐 향상' },
    { n: 4, name: 'Zone 4 임계', pct: [80, 90], desc: '숨이 가빠 말이 어려움 — 인터벌' },
    { n: 5, name: 'Zone 5 최대', pct: [90, 100], desc: '수십 초만 버티는 강도 — 스프린트' }
  ];

  /* ---------- 저장 ---------- */
  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        age: $('age').value, rhr: $('rhr').value, formula: state.formula
      }));
    } catch (e) {}
  }
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(STORE); } catch (e) {}
    if (!raw) return;
    var d;
    try { d = JSON.parse(raw); } catch (e) { return; }
    if (!d) return;
    if (d.age) $('age').value = d.age;
    if (d.rhr) $('rhr').value = d.rhr;
    if (d.formula) state.formula = d.formula;
  }

  /* ---------- 계산 ---------- */
  function compute() {
    var age = Number($('age').value);
    if (!isFinite(age) || age < 10 || age > 100) return { error: 'age' };

    var rhrRaw = Number($('rhr').value);
    var rhr = (isFinite(rhrRaw) && rhrRaw >= 30 && rhrRaw <= 120) ? rhrRaw : null;

    var tanaka = 208 - 0.7 * age;
    var classic = 220 - age;
    var hrmax = state.formula === 'classic' ? classic : tanaka;
    var hrr = rhr ? hrmax - rhr : null;

    if (rhr && rhr > hrmax * 0.9) return { error: 'rhr', hrmax: hrmax, rhr: rhr };

    var zones = ZONES.map(function (z, i) {
      var lo = Math.round(hrmax * z.pct[0] / 100);
      var hi = Math.round(hrmax * z.pct[1] / 100);
      var klo = hrr ? Math.round(hrr * z.pct[0] / 100 + rhr) : null;
      var khi = hrr ? Math.round(hrr * z.pct[1] / 100 + rhr) : null;
      return { n: z.n, name: z.name, desc: z.desc, lo: lo, hi: hi, klo: klo, khi: khi };
    });
    // 인접 구간 경계가 겹치지 않도록 상한을 다음 구간 시작 -1로 정리
    for (var i = 0; i < zones.length - 1; i++) {
      zones[i].hi = zones[i + 1].lo - 1;
      if (zones[i].khi && zones[i + 1].klo) zones[i].khi = zones[i + 1].klo - 1;
    }

    return {
      age: age, rhr: rhr, tanaka: tanaka, classic: classic, hrmax: hrmax,
      hrr: hrr, zones: zones, z2: zones[1], z1: zones[0], z3: zones[2]
    };
  }

  /* ---------- 렌더 ---------- */
  function render(scroll) {
    var c = compute();

    if (c.error === 'age') {
      $('hrNote').textContent = '—';
      resultEl.innerHTML = '<div class="result__empty"><span class="result__empty-icon" aria-hidden="true">❤️</span><strong>나이를 넣어주세요</strong><span>10~100세 사이 나이를 입력하면 최대심박수와 구간을 계산합니다.</span></div>';
      return;
    }
    if (c.error === 'rhr') {
      $('hrNote').textContent = '확인 필요';
      resultEl.innerHTML = '<div class="result__empty"><span class="result__empty-icon" aria-hidden="true">⚠️</span><strong>안정시 심박수를 확인해 주세요</strong><span>입력한 안정시 심박수(' + c.rhr + 'bpm)가 최대심박수(' + Math.round(c.hrmax) + 'bpm)에 너무 가깝습니다. 30~120bpm 사이에서 다시 넣거나, 비워두면 최대심박수 % 방식으로 계산합니다.</span></div>';
      return;
    }

    $('hrNote').textContent = '최대HR ' + Math.round(c.hrmax) + 'bpm';

    var z2 = c.z2;
    var html = '';

    html += '<div class="verdict verdict--info">' +
      '<span class="verdict__icon" aria-hidden="true">🔥</span>' +
      '<div class="verdict__body">' +
        '<p class="verdict__kicker">' + c.age + '세 · 최대심박수 ' + Math.round(c.hrmax) + 'bpm (' + (state.formula === 'classic' ? '220−나이' : '타나카') + ')</p>' +
        '<p class="verdict__title">Zone 2 · ' + z2.lo + '~' + z2.hi + ' bpm</p>' +
        '<p class="verdict__desc">' +
          (c.rhr
            ? '카르보넨(안정시 ' + c.rhr + 'bpm 반영) 기준으로는 <b>' + z2.klo + '~' + z2.khi + ' bpm</b>입니다. 두 범위 안에서 몸이 편한 쪽으로 타세요.'
            : '안정시 심박수를 넣으면 <b>카르보넨 공식</b>으로 개인차를 반영한 범위도 함께 보여드립니다.') +
        '</p>' +
      '</div>' +
    '</div>';

    /* 존 바 */
    html += '<div class="card">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">📶</span><span class="card__title">Zone 1~5 구간표</span><span class="card__note">bpm</span></div>' +
      '<div class="zbar" aria-hidden="true">' +
        '<span class="zbar__seg zbar__seg--1" style="width:20%"></span>' +
        '<span class="zbar__seg zbar__seg--2" style="width:20%"></span>' +
        '<span class="zbar__seg zbar__seg--3" style="width:20%"></span>' +
        '<span class="zbar__seg zbar__seg--4" style="width:20%"></span>' +
        '<span class="zbar__seg zbar__seg--5" style="width:20%"></span>' +
      '</div>' +
      '<div class="mt-12">' +
        c.zones.map(function (z) {
          return '<div class="zone' + (z.n === 2 ? ' zone--target' : '') + '">' +
            '<span class="zone__n">Z' + z.n + '</span>' +
            '<div class="zone__body"><p class="zone__name">' + z.name + '</p><p class="zone__desc">' + z.desc + '</p></div>' +
            '<p class="zone__bpm">' + z.lo + '–' + z.hi +
              '<small>' + (z.klo ? '카르보넨 ' + z.klo + '–' + z.khi : (Math.round((z.lo + z.hi) / 2)) + 'bpm 중심') + '</small>' +
            '</p>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<button class="btn btn--sm btn--block mt-12" type="button" id="copyBtn">내 구간 복사하기</button>' +
    '</div>';

    var rows = [
      ['최대심박수 (타나카)', Math.round(c.tanaka) + 'bpm'],
      ['최대심박수 (220−나이)', Math.round(c.classic) + 'bpm'],
      ['안정시 심박수', c.rhr ? c.rhr + 'bpm' : '미입력'],
      ['예비 심박수(HRR)', c.hrr ? Math.round(c.hrr) + 'bpm' : '—'],
      ['Zone 2 중심값', Math.round((z2.lo + z2.hi) / 2) + 'bpm'],
      ['주간 목표', '150분 (30분 × 5회)']
    ];

    html += '<div class="card">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">🧮</span><span class="card__title">계산 근거</span></div>' +
      '<div class="kv">' + rows.map(function (r) {
        return '<div class="kv__row"><span class="kv__k">' + r[0] + '</span><span class="kv__v">' + r[1] + '</span></div>';
      }).join('') + '</div>' +
      '<p class="field__hint mt-8">같은 나이라도 실제 최대심박수는 ±10bpm 차이가 납니다. 구간에 들어오는 데 5~10분 걸리니 <b>워밍업 뒤부터 시간을 세세요</b>.</p>' +
    '</div>';

    html += '<div class="card" style="background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 30%,var(--line))">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">🗓️</span><span class="card__title">이번 주 계획 예시</span></div>' +
      '<div class="tips">' +
        '<div class="tip"><span class="tip__n">월</span><span class="tip__text">Zone 2 · 30분 (' + z2.lo + '–' + z2.hi + ' bpm) — 걷기·자전거</span></div>' +
        '<div class="tip"><span class="tip__n">화</span><span class="tip__text">Zone 2 · 30분 — 대화 가능한 속도 유지</span></div>' +
        '<div class="tip"><span class="tip__n">수</span><span class="tip__text">Zone 3 · 20분 (' + c.z3.lo + '–' + c.z3.hi + ' bpm) — 조금 힘들게</span></div>' +
        '<div class="tip"><span class="tip__n">목</span><span class="tip__text">휴식 또는 Zone 1 · 20분 (' + c.z1.lo + '–' + c.z1.hi + ' bpm)</span></div>' +
        '<div class="tip"><span class="tip__n">금</span><span class="tip__text">Zone 2 · 30분 — 주말 전에 한 번 더</span></div>' +
        '<div class="tip"><span class="tip__n">토</span><span class="tip__text">Zone 2 · 40분 — 길게, 경사나 언덕 활용</span></div>' +
        '<div class="tip"><span class="tip__n">일</span><span class="tip__text">완전 휴식 · 스트레칭 10분</span></div>' +
      '</div>' +
    '</div>';

    html += '<p class="disclaimer"><b>참고용 안내</b> — 나이로 추정한 최대심박수를 쓰는 참고용 계산입니다. 베타차단제 등 심박수를 낮추는 약을 먹거나 심장질환이 있으면 실제 구간과 다릅니다. 운동 중 가슴 통증·실신·비정상 두근거림이 있으면 즉시 멈추고 진료를 받으세요.</p>';

    resultEl.innerHTML = '<div class="result reveal">' + html + '</div>';
    var copyBtn = $('copyBtn');
    if (copyBtn) copyBtn.addEventListener('click', function () { copy(c); });

    if (scroll && window.innerWidth < 980) {
      var top = resultEl.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  function buildText(c) {
    var L = [];
    L.push('[Zone 2 심박수] ' + c.age + '세 · 최대심박수 ' + Math.round(c.hrmax) + 'bpm');
    c.zones.forEach(function (z) {
      L.push('· Z' + z.n + ' ' + z.name + ': ' + z.lo + '–' + z.hi + 'bpm' + (z.klo ? ' (카르보넨 ' + z.klo + '–' + z.khi + ')' : ''));
    });
    L.push('· Zone 2 타깃: ' + c.z2.lo + '–' + c.z2.hi + 'bpm — 대화는 되고 노래는 힘든 강도');
    L.push('· 주 150분 목표 (30분 × 5회)');
    L.push('', '팩트체크 건강연구소 Zone 2 계산기 https://hjh7085-bit.github.io/zone2-hr/');
    return L.join('\n');
  }

  function copy(c) {
    var text = buildText(c);
    function fb() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('구간을 복사했어요'); } catch (e) { toast('복사가 막혀 있어요'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('구간을 복사했어요'); }, fb);
    } else fb();
  }

  /* ---------- 이벤트 ---------- */
  document.querySelectorAll('#formulaSeg [data-formula]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.formula = b.getAttribute('data-formula');
      document.querySelectorAll('#formulaSeg .seg__btn').forEach(function (x) {
        var on = x === b;
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      save();
      render(false);
    });
  });

  document.querySelectorAll('#rhrChips [data-rhr]').forEach(function (b) {
    b.addEventListener('click', function () {
      $('rhr').value = b.getAttribute('data-rhr');
      document.querySelectorAll('#rhrChips .preset').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      save();
      render(false);
    });
  });

  ['age', 'rhr'].forEach(function (id) {
    var el = $(id);
    if (!el) return;
    el.addEventListener('input', function () {
      document.querySelectorAll('#rhrChips .preset').forEach(function (x) { x.classList.toggle('is-on', x.getAttribute('data-rhr') === $('rhr').value); });
      save(); render(false);
    });
    el.addEventListener('change', function () { save(); render(false); });
  });

  var calcBar = $('calcBar');
  if (calcBar) calcBar.addEventListener('click', function () { render(true); });

  /* ---------- 초기화 ---------- */
  load();
  if (!$('age').value) $('age').value = '35';
  document.querySelectorAll('#formulaSeg .seg__btn').forEach(function (x) {
    var on = x.getAttribute('data-formula') === state.formula;
    x.classList.toggle('is-on', on);
    x.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  document.querySelectorAll('#rhrChips .preset').forEach(function (x) {
    x.classList.toggle('is-on', x.getAttribute('data-rhr') === $('rhr').value);
  });
  render(false);
})();
