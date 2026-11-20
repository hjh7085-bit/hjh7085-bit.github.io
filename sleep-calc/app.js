/* ==========================================================================
   90분 수면 사이클 기상 추천기 — sleep-calc/app.js
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

  /* ---------- 상태 ---------- */
  var STORE = 'fchl-sleep-v1';
  var CYCLE = 90;
  var FALL = 15;
  var state = { mode: 'now' };

  var $ = function (id) { return document.getElementById(id); };
  var resultEl = $('result');

  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        mode: state.mode, bed: $('bedTime').value, wake: $('wakeTime').value
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
    if (d.mode === 'target' || d.mode === 'now') state.mode = d.mode;
    if (d.bed) $('bedTime').value = d.bed;
    if (d.wake) $('wakeTime').value = d.wake;
  }

  /* ---------- 시간 유틸 ---------- */
  function nowDate() { return new Date(); }
  function nowMinutes() {
    var d = nowDate();
    return d.getHours() * 60 + d.getMinutes();
  }
  function parseHM(str) {
    if (!str || str.indexOf(':') < 0) return null;
    var p = str.split(':');
    var h = Number(p[0]), m = Number(p[1]);
    if (!isFinite(h) || !isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }
  function wrap(mins) {
    var m = Math.round(mins) % 1440;
    if (m < 0) m += 1440;
    return m;
  }
  function hm(mins) {
    var m = wrap(mins);
    var h = Math.floor(m / 60), mm = m % 60;
    return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  }
  function pretty(mins) {
    var m = wrap(mins);
    var h = Math.floor(m / 60), mm = m % 60;
    var ampm = h < 12 ? '오전' : '오후';
    var h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return ampm + ' ' + h12 + ':' + String(mm).padStart(2, '0');
  }
  function durText(mins) {
    var h = Math.floor(mins / 60), m = Math.round(mins % 60);
    return h ? h + '시간' + (m ? ' ' + m + '분' : '') : m + '분';
  }
  function relFromNow(mins) {
    var diff = wrap(mins - nowMinutes());
    if (diff > 720) diff -= 1440;
    if (diff === 0) return '지금';
    return diff > 0 ? diff + '분 뒤' : (-diff) + '분 전';
  }
  function pad2(n) { return String(n).padStart(2, '0'); }

  /* ---------- 렌더 ---------- */
  var lastText = '';

  function render(scroll) {
    var bestN = 5;
    var nowMin = nowMinutes();
    var html = '';
    var headline = '', subline = '', modeLabel = '';

    if (state.mode === 'now') {
      var bed = parseHM($('bedTime').value);
      if (bed == null) bed = nowMin;
      // 눕는 시각이 이미 지난 시각이면(자정 넘김) 안내
      var cards = [3, 4, 5, 6].map(function (n) {
        var sleepMin = n * CYCLE;
        var wake = bed + FALL + sleepMin;
        return { n: n, sleepMin: sleepMin, wake: wake, bed: bed };
      });
      var pick = cards.filter(function (c) { return c.n === bestN; })[0];
      modeLabel = '지금 바로 잔다면';
      headline = pretty(pick.wake) + ' 기상 추천';
      subline = pretty(bed) + '에 누우면 15분 뒤 잠들어 <b>' + durText(pick.sleepMin) + '</b> 자고 ' + pretty(pick.wake) + '에 일어납니다.';

      html += '<div class="verdict verdict--info">' +
        '<span class="verdict__icon" aria-hidden="true">🌙</span>' +
        '<div class="verdict__body">' +
          '<p class="verdict__kicker">' + modeLabel + ' · ' + pretty(bed) + ' 취침</p>' +
          '<p class="verdict__title">' + headline + '</p>' +
          '<p class="verdict__desc">' + subline + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card__head"><span class="card__icon" aria-hidden="true">⏰</span><span class="card__title">이 중에서 고르세요</span><span class="card__note">입면 15분 포함</span></div>' +
        '<div class="cards">' +
          cards.map(function (c) {
            var cls = 'cycle' + (c.n === bestN ? ' cycle--best' : '') + (c.n === 3 ? ' cycle--short' : '') + (c.n === 6 ? ' cycle--long' : '');
            var note = c.n === 3 ? '최소한만 자야 할 때' : c.n === 4 ? '짧지만 최소선' : c.n === 5 ? '권장 · 7시간 30분' : '주말·회복기';
            return '<div class="' + cls + '">' +
              '<p class="cycle__label">' + c.n + ' 사이클</p>' +
              '<p class="cycle__time">' + pretty(c.wake) + '</p>' +
              '<p class="cycle__dur">수면 ' + durText(c.sleepMin) + '</p>' +
              '<p class="cycle__note">' + note + '</p>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<p class="field__hint mt-8">' + (wrap(bed) === wrap(nowMin) ? '지금 시각 기준입니다.' : '') + ' 늦게 잤다면 <b>4사이클(6시간)</b>이 현실적입니다. 알람은 카드의 기상 시각보다 5분 앞당겨 두세요.</p>' +
      '</div>';

    } else {
      var wake = parseHM($('wakeTime').value);
      if (wake == null) wake = 7 * 60;
      var tCards = [6, 5, 4, 3].map(function (n) {
        var sleepMin = n * CYCLE;
        var bed = wake - FALL - sleepMin;
        var untilBed = wrap(bed - nowMin);
        if (untilBed > 720) untilBed -= 1440;
        return { n: n, sleepMin: sleepMin, bed: bed, untilBed: untilBed, passed: untilBed < 0 };
      });
      var feasible = tCards.filter(function (c) { return !c.passed; }).sort(function (a, b) { return b.n - a.n; })[0];
      var pickT = feasible || null;
      modeLabel = '원하는 기상 ' + pretty(wake);
      var remainToWake = wrap(wake - (nowMin + FALL));
      headline = pickT ? pretty(pickT.bed) + ' 취침 추천' : '오늘 밤은 이미 늦었어요';
      subline = pickT
        ? '15분 안에 잠들어 <b>' + durText(pickT.sleepMin) + '</b> 자려면 ' + pretty(pickT.bed) + '에 눕고 ' + pretty(wake) + '에 일어나면 됩니다.'
        : '지금 <b>' + pretty(nowMin) + '</b>에 눕고 15분 뒤 잠들어도 ' + pretty(wake) + '까지 <b>' + durText(remainToWake) + '</b>뿐입니다. 오늘은 기상 시간을 지키고 내일 취침을 30분씩 당기세요.';

      html += '<div class="verdict verdict--info">' +
        '<span class="verdict__icon" aria-hidden="true">⏰</span>' +
        '<div class="verdict__body">' +
          '<p class="verdict__kicker">' + modeLabel + ' · 역산</p>' +
          '<p class="verdict__title">' + headline + '</p>' +
          '<p class="verdict__desc">' + subline + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="card">' +
        '<div class="card__head"><span class="card__icon" aria-hidden="true">🌙</span><span class="card__title">' + pretty(wake) + '에 일어나려면</span><span class="card__note">입면 15분 포함</span></div>' +
        '<div class="cards">' +
          tCards.map(function (c) {
            var cls = 'cycle' + (pickT && c.n === pickT.n ? ' cycle--best' : '') + (c.passed ? ' cycle--passed' : '');
            var note = c.passed ? '이미 지난 시각' : (c.n === 5 ? '권장 · 7시간 30분' : c.n === 6 ? '주말·회복기' : c.n === 4 ? '짧지만 최소선' : '최소한만 자야 할 때');
            return '<div class="' + cls + '">' +
              '<p class="cycle__label">' + c.n + ' 사이클</p>' +
              '<p class="cycle__time">' + pretty(c.bed) + '</p>' +
              '<p class="cycle__dur">수면 ' + durText(c.sleepMin) + '</p>' +
              '<p class="cycle__note">' + note + '</p>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<p class="field__hint mt-8">' + (feasible ? '지금은 <b>' + pretty(nowMin) + '</b>, ' + pretty(pickT.bed) + '까지 <b>' + (pickT.untilBed > 0 ? durText(pickT.untilBed) : '0분') + '</b> 남았습니다.' : '모든 취침 시각이 이미 지났습니다. 3사이클(4시간 30분)로도 늦다면, 오늘은 일어나는 시간을 지키고 내일 취침을 당기는 편이 낫습니다.') + '</p>' +
      '</div>';
    }

    /* 공통 카드: 지금 시각 & 팁 */
    html += '<div class="card">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">🧭</span><span class="card__title">지금 시각</span><span class="card__note" id="liveClock">' + pretty(nowMinutes()) + '</span></div>' +
      '<div class="kv">' +
        '<div class="kv__row"><span class="kv__k">현재 시각</span><span class="kv__v" id="liveClock2">' + pretty(nowMinutes()) + '</span></div>' +
        '<div class="kv__row"><span class="kv__k">평균 입면 시간</span><span class="kv__v">15분</span></div>' +
        '<div class="kv__row"><span class="kv__k">한 사이클</span><span class="kv__v">90분</span></div>' +
      '</div>' +
    '</div>' +
    '<div class="card" style="background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 30%,var(--line))">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">💡</span><span class="card__title">오늘 밤 이렇게</span></div>' +
      '<div class="tips">' +
        '<div class="tip"><span class="tip__n">1</span><span class="tip__text">' + (state.mode === 'now'
          ? '지금 눕는다면 <b>' + pretty((parseHM($('bedTime').value) || nowMinutes()) + FALL) + '에 잠들어</b> ' + pretty((parseHM($('bedTime').value) || nowMinutes()) + FALL + bestN * CYCLE) + '에 일어나는 게 가장 개운합니다.'
          : (function () {
              var w2 = parseHM($('wakeTime').value) || 420;
              var b5 = w2 - FALL - bestN * CYCLE;
              var until = wrap(b5 - nowMin);
              if (until > 720) until -= 1440;
              return until > 0
                ? '취침 <b>' + pretty(b5) + '</b>까지 ' + durText(until) + ' 남았습니다. 30분 전부터 조명을 낮추고 화면을 끄세요.'
                : '오늘은 이미 늦었습니다. 지금 눕고 내일은 <b>' + pretty(b5) + '</b>에 눕는 것을 목표로 하세요.';
            })()) + '</span></div>' +
        '<div class="tip"><span class="tip__n">2</span><span class="tip__text">알람은 카드의 기상 시각 <b>5분 전</b>으로. 울린 뒤 5분 안에 일어나 커튼을 여세요 — 빛이 생체시계를 리셋합니다.</span></div>' +
        '<div class="tip"><span class="tip__n">3</span><span class="tip__text">잠들기 3시간 전에는 <b>야식·술·카페인</b>을 끊으세요. 늦은 식사는 혈당과 수면 후반부를 함께 흔듭니다.</span></div>' +
      '</div>' +
      '<button class="btn btn--sm btn--block mt-12" type="button" id="copyBtn">추천 시간 복사</button>' +
    '</div>' +
    '<p class="disclaimer"><b>참고용 안내</b> — 90분 주기와 15분 입면은 평균값입니다. 개인차가 크므로 며칠 기록해 나만의 리듬을 찾고, 불면·코골이·주간 졸림이 계속되면 수면클리닉 진료를 받으세요.</p>';

    resultEl.innerHTML = '<div class="result reveal">' + html + '</div>';

    var copyBtn = $('copyBtn');
    if (copyBtn) copyBtn.addEventListener('click', function () { copy(); });

    lastText = buildText();

    if (scroll && window.innerWidth < 980) {
      var top = resultEl.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  function buildText() {
    var lines = [];
    if (state.mode === 'now') {
      var bed = parseHM($('bedTime').value) || nowMinutes();
      lines.push('[수면 사이클] ' + pretty(bed) + ' 취침 기준 추천 기상');
      [3, 4, 5, 6].forEach(function (n) {
        lines.push('· ' + n + '사이클(' + durText(n * CYCLE) + '): ' + pretty(bed + FALL + n * CYCLE));
      });
    } else {
      var wake = parseHM($('wakeTime').value) || 420;
      lines.push('[수면 사이클] ' + pretty(wake) + ' 기상 기준 추천 취침');
      [6, 5, 4, 3].forEach(function (n) {
        lines.push('· ' + n + '사이클(' + durText(n * CYCLE) + '): ' + pretty(wake - FALL - n * CYCLE));
      });
    }
    lines.push('', '팩트체크 건강연구소 수면 사이클 계산기 https://hjh7085-bit.github.io/sleep-calc/');
    return lines.join('\n');
  }

  function copy() {
    var text = buildText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('추천 시간을 복사했어요'); }, fb);
    } else fb();
    function fb() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('추천 시간을 복사했어요'); } catch (e) { toast('복사가 막혀 있어요'); }
      document.body.removeChild(ta);
    }
  }

  /* ---------- 모드 ---------- */
  function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll('#modeSeg [data-mode]').forEach(function (b) {
      var on = b.getAttribute('data-mode') === mode;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    $('modeNow').hidden = mode !== 'now';
    $('modeTarget').hidden = mode !== 'target';
    save();
    render(false);
  }

  document.querySelectorAll('#modeSeg [data-mode]').forEach(function (b) {
    b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
  });

  ['bedTime', 'wakeTime'].forEach(function (id) {
    var el = $(id);
    if (el) el.addEventListener('input', function () { save(); render(false); });
  });

  document.querySelectorAll('#wakeChips [data-wake]').forEach(function (b) {
    b.addEventListener('click', function () {
      $('wakeTime').value = b.getAttribute('data-wake');
      document.querySelectorAll('#wakeChips .preset').forEach(function (p) { p.classList.toggle('is-on', p === b); });
      save();
      render(false);
    });
  });

  function setNow() {
    var d = nowDate();
    $('bedTime').value = pad2(d.getHours()) + ':' + pad2(d.getMinutes());
    updateNowHint();
    save();
    render(false);
  }
  var nowBtn = $('nowBtn');
  if (nowBtn) nowBtn.addEventListener('click', function () { setNow(); toast('지금 시각으로 맞췄어요'); });

  function updateNowHint() {
    var hint = $('nowHint');
    if (!hint) return;
    hint.innerHTML = '지금 <b>' + pretty(nowMinutes()) + '</b> — 눕는 시각을 다르게 잡아도 됩니다.';
  }

  var calcBar = $('calcBar');
  if (calcBar) calcBar.addEventListener('click', function () { render(true); });

  /* ---------- 초기화 ---------- */
  load();
  if (!$('bedTime').value) {
    var d0 = nowDate();
    $('bedTime').value = pad2(d0.getHours()) + ':' + pad2(d0.getMinutes());
  }
  if (!$('wakeTime').value) $('wakeTime').value = '07:00';
  document.querySelectorAll('#wakeChips .preset').forEach(function (p) {
    p.classList.toggle('is-on', p.getAttribute('data-wake') === $('wakeTime').value);
  });
  setMode(state.mode);
  updateNowHint();

  // 30초마다 현재 시각 갱신
  setInterval(function () {
    updateNowHint();
    var c1 = $('liveClock'), c2 = $('liveClock2');
    if (c1) c1.textContent = pretty(nowMinutes());
    if (c2) c2.textContent = pretty(nowMinutes());
  }, 30000);
})();
