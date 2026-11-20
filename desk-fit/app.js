/* ==========================================================================
   내 키에 맞는 의자·책상·모니터 높이 계산기 — desk-fit/app.js
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
  var STORE = 'fchl-desk-v1';
  var resultEl = $('result');
  var state = { desk: 'fixed', posture: 'upright', foot: 'none' };

  /* ---------- 비율 계수 (신장 대비) ---------- */
  var R = {
    seat: 0.246,      // 오금(무릎 뒤) 높이 → 좌판 높이
    elbow: 0.17,      // 앉은팔꿈치 높이(좌판 기준) → 책상 높이
    eye: 0.455,       // 앉은눈높이(좌판 기준) → 모니터 상단
    depth: 0.23,      // 엉덩이-오금 길이 → 좌판 깊이
    stand: 0.63,      // 선 팔꿈치 높이 → 스탠딩 데스크
    dist: 0.40        // 시거리 기준
  };

  function r1(x) { return Math.round(x * 2) / 2; }
  function fmt(x) {
    var v = r1(x);
    return (Math.abs(v - Math.round(v)) < 0.01) ? String(Math.round(v)) : v.toFixed(1);
  }
  function rng(base, pm) { return fmt(base - pm) + '~' + fmt(base + pm) + 'cm'; }

  /* ---------- 저장 ---------- */
  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        height: $('height').value, deskNow: $('deskNow').value,
        desk: state.desk, posture: state.posture, foot: state.foot
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
    if (d.height) $('height').value = d.height;
    if (d.deskNow) $('deskNow').value = d.deskNow;
    if (d.desk) state.desk = d.desk;
    if (d.posture) state.posture = d.posture;
    if (d.foot) state.foot = d.foot;
  }

  /* ---------- 계산 ---------- */
  function compute() {
    var H = Number($('height').value);
    if (!isFinite(H) || H < 130 || H > 215) return { error: 'height' };

    var deskNowRaw = Number($('deskNow').value);
    var deskNow = (isFinite(deskNowRaw) && deskNowRaw >= 50 && deskNowRaw <= 120) ? deskNowRaw : null;

    var seatBase = R.seat * H;
    var deskIdeal = seatBase + R.elbow * H;      // = 0.416H
    var seat = seatBase;
    var footNeed = 0;
    var deskLift = 0;
    var deskH = deskIdeal;
    var adjusted = false;

    if (state.desk === 'fixed' && deskNow) {
      deskH = deskNow;
      seat = deskNow - R.elbow * H;              // 팔꿈치를 책상 높이에 맞춘 좌판
      footNeed = seat - seatBase;
      adjusted = true;
      if (footNeed < -0.5) {                     // 책상이 오히려 낮다
        deskLift = -footNeed;
        footNeed = 0;
        seat = seatBase;
      }
    } else if (state.foot === 'use') {
      seat = seatBase + 2;
      footNeed = 2;
    }

    var recline = state.posture === 'recline';
    if (recline) seat -= 1;

    var eyeTop = seat + R.eye * H - (recline ? 3 : 0);
    var dist = R.dist * H + (recline ? 5 : 0);
    var depth = R.depth * H;
    var standing = R.stand * H;
    var elbowH = seat + R.elbow * H;

    return {
      H: H, seat: seat, seatBase: seatBase, deskH: deskH, deskIdeal: deskIdeal,
      deskNow: deskNow, adjusted: adjusted, footNeed: footNeed, deskLift: deskLift,
      eyeTop: eyeTop, dist: dist, depth: depth, standing: standing, elbowH: elbowH,
      recline: recline
    };
  }

  /* ---------- 도해 ---------- */
  function diagram(c) {
    var FLOOR = 208, X0 = 46;
    function y(cm) { return FLOOR - cm; }
    var seatY = y(c.seat);
    var deskY = y(c.deskH);
    var eyeY = y(c.eyeTop);

    // 사람(옆모습) 기준점
    var hipX = X0 + 30, kneeX = X0 + 86;
    var shX = hipX + 2, shY = seatY - 52;
    var headCy = shY - 24, headR = 12;

    // 책상·모니터
    var deskX1 = 150, deskX2 = 300;
    var monCx = (deskX1 + deskX2) / 2;
    var monW = 92, scrTop = eyeY, scrBot = Math.min(deskY - 16, eyeY + 44);
    var scrX1 = monCx - monW / 2, scrX2 = monCx + monW / 2;

    var s = '';
    s += '<svg viewBox="0 0 360 232" role="img" aria-label="내 치수 도해: 좌판 ' + fmt(c.seat) + 'cm, 책상 ' + fmt(c.deskH) + 'cm, 모니터 상단 ' + fmt(c.eyeTop) + 'cm">';
    // 바닥
    s += '<line x1="10" y1="' + FLOOR + '" x2="350" y2="' + FLOOR + '" stroke="currentColor" stroke-opacity=".35" stroke-width="1.5"/>';

    // 책상 상판 + 다리
    s += '<rect x="' + deskX1 + '" y="' + deskY + '" width="' + (deskX2 - deskX1) + '" height="5" rx="2" fill="currentColor" opacity=".55"/>';
    s += '<line x1="' + (deskX1 + 10) + '" y1="' + (deskY + 5) + '" x2="' + (deskX1 + 10) + '" y2="' + FLOOR + '" stroke="currentColor" stroke-opacity=".35" stroke-width="3"/>';
    s += '<line x1="' + (deskX2 - 10) + '" y1="' + (deskY + 5) + '" x2="' + (deskX2 - 10) + '" y2="' + FLOOR + '" stroke="currentColor" stroke-opacity=".35" stroke-width="3"/>';

    // 모니터 (화면 + 스탠드)
    s += '<rect x="' + (monCx - 6) + '" y="' + (scrBot - 6) + '" width="12" height="' + (deskY - scrBot + 6) + '" fill="currentColor" opacity=".35"/>';
    s += '<rect x="' + (monCx - 15) + '" y="' + (deskY - 4) + '" width="30" height="4" rx="2" fill="currentColor" opacity=".45"/>';
    s += '<rect x="' + scrX1 + '" y="' + scrTop + '" width="' + monW + '" height="' + (scrBot - scrTop) + '" rx="4" fill="var(--accent)" opacity=".17" stroke="var(--accent)" stroke-width="1.6"/>';

    // 의자 좌판 + 다리 + 등받이
    s += '<rect x="' + (hipX - 22) + '" y="' + seatY + '" width="76" height="6" rx="2.5" fill="var(--accent)" opacity=".9"/>';
    s += '<line x1="' + (hipX + 46) + '" y1="' + (seatY + 6) + '" x2="' + (hipX + 46) + '" y2="' + FLOOR + '" stroke="currentColor" stroke-opacity=".45" stroke-width="3"/>';
    s += '<line x1="' + (hipX - 20) + '" y1="' + seatY + '" x2="' + (hipX - 26) + '" y2="' + (seatY - 48) + '" stroke="currentColor" stroke-opacity=".45" stroke-width="4" stroke-linecap="round"/>';

    // 사람(옆모습): 다리 90도 + 몸통 + 팔(책상까지)
    s += '<g stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none" opacity=".85">';
    s += '<path d="M' + (hipX - 4) + ' ' + seatY + ' L' + kneeX + ' ' + seatY + ' L' + kneeX + ' ' + FLOOR + '"/>';
    s += '<path d="M' + (hipX - 4) + ' ' + seatY + ' L' + shX + ' ' + shY + '"/>';
    s += '<path d="M' + shX + ' ' + (shY + 4) + ' L' + (shX + 38) + ' ' + (deskY - 3) + ' L' + (deskX1 + 8) + ' ' + (deskY - 3) + '"/>';
    s += '</g>';
    s += '<circle cx="' + (shX + 2) + '" cy="' + headCy + '" r="' + headR + '" fill="currentColor" opacity=".85"/>';

    // 90도 표시(무릎·팔꿈치)
    s += '<path d="M' + kneeX + ' ' + (seatY + 15) + ' A15 15 0 0 0 ' + (kneeX - 15) + ' ' + seatY + '" fill="none" stroke="var(--accent)" stroke-width="1.6"/>';
    s += '<path d="M' + shX + ' ' + (shY + 17) + ' A17 17 0 0 0 ' + (shX + 17) + ' ' + shY + '" fill="none" stroke="var(--accent)" stroke-width="1.6"/>';

    // 눈높이 점선 + 라벨
    s += '<line x1="' + (shX + headR) + '" y1="' + eyeY + '" x2="' + (scrX2 + 10) + '" y2="' + eyeY + '" stroke="var(--accent)" stroke-width="1.2" stroke-dasharray="4 4" opacity=".85"/>';
    s += '<text x="' + (scrX1 - 8) + '" y="' + (eyeY - 6) + '" font-size="10.5" font-weight="800" fill="var(--accent-strong)" text-anchor="end">눈높이 ' + fmt(c.eyeTop) + '</text>';

    // 좌판 치수(왼쪽)
    s += '<g stroke="currentColor" stroke-opacity=".45" stroke-width="1">';
    s += '<line x1="' + 26 + '" y1="' + seatY + '" x2="' + (hipX - 24) + '" y2="' + seatY + '" stroke-dasharray="3 3"/>';
    s += '<line x1="26" y1="' + seatY + '" x2="26" y2="' + FLOOR + '"/>';
    s += '<line x1="21" y1="' + FLOOR + '" x2="31" y2="' + FLOOR + '"/>';
    s += '</g>';
    s += '<text x="4" y="' + (seatY - 7) + '" font-size="11" font-weight="800" fill="currentColor" text-anchor="start">좌판 ' + fmt(c.seat) + '</text>';

    // 책상 치수(책상 왼쪽 세로선)
    var dimX = deskX2 + 12;
    s += '<g stroke="currentColor" stroke-opacity=".45" stroke-width="1">';
    s += '<line x1="' + (deskX2 + 2) + '" y1="' + deskY + '" x2="' + (dimX + 4) + '" y2="' + deskY + '" stroke-dasharray="3 3"/>';
    s += '<line x1="' + dimX + '" y1="' + deskY + '" x2="' + dimX + '" y2="' + FLOOR + '"/>';
    s += '<line x1="' + (dimX - 5) + '" y1="' + FLOOR + '" x2="' + (dimX + 5) + '" y2="' + FLOOR + '"/>';
    s += '</g>';
    var midY = (deskY + FLOOR) / 2;
    s += '<text x="' + (dimX + 11) + '" y="' + midY + '" font-size="11" font-weight="800" fill="currentColor" text-anchor="middle" transform="rotate(-90 ' + (dimX + 11) + ' ' + midY + ')">책상 ' + fmt(c.deskH) + '</text>';
    s += '</svg>';
    return s;
  }

  /* ---------- 렌더 ---------- */
  function render(scroll) {
    var c = compute();

    if (c.error) {
      $('bmiNote').textContent = '키 확인';
      resultEl.innerHTML = '<div class="result__empty"><span class="result__empty-icon" aria-hidden="true">📏</span><strong>키를 넣어주세요</strong><span>130~215cm 사이의 키를 입력하면 권장 치수를 계산합니다.</span></div>';
      return;
    }

    $('bmiNote').textContent = '키 ' + fmt(c.H) + 'cm 기준';

    var html = '';
    html += '<div class="verdict verdict--info">' +
      '<span class="verdict__icon" aria-hidden="true">🪑</span>' +
      '<div class="verdict__body">' +
        '<p class="verdict__kicker">키 ' + fmt(c.H) + 'cm · 인체측정 비율</p>' +
        '<p class="verdict__title">좌판 ' + fmt(c.seat) + ' · 책상 ' + fmt(c.deskH) + ' · 모니터 상단 ' + fmt(c.eyeTop) + 'cm</p>' +
        '<p class="verdict__desc">' + (c.recline
          ? '등받이를 기대는 자세라 좌판을 1cm 낮추고, 모니터는 3cm 낮게·거리는 5cm 멀게 잡았습니다.'
          : '등을 펴고 앉는 자세 기준입니다. 무릎·팔꿈치가 90도가 되는 높이입니다.') + '</p>' +
      '</div>' +
    '</div>';

    html += '<div class="card">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">📐</span><span class="card__title">내 몸 기준 도해</span><span class="card__note">단위 cm</span></div>' +
      '<div class="dia">' + diagram(c) + '<p class="dia__cap">옆모습 기준 · 좌판·책상·눈높이 3개만 맞추면 됩니다</p></div>' +
      '<button class="btn btn--sm btn--block mt-8" type="button" id="copyBtn">치수 복사하기</button>' +
    '</div>';

    var footRow = '';
    if (c.adjusted && c.footNeed > 0.4) {
      footRow = '<div class="kv__row"><span class="kv__k">필요한 발판 높이</span><span class="kv__v">' + fmt(c.footNeed) + 'cm</span></div>';
    } else if (c.adjusted && c.deskLift > 0.4) {
      footRow = '<div class="kv__row"><span class="kv__k">책상 올림 필요</span><span class="kv__v">' + fmt(c.deskLift) + 'cm</span></div>';
    } else if (c.footNeed > 0) {
      footRow = '<div class="kv__row"><span class="kv__k">발판 높이</span><span class="kv__v">' + fmt(c.footNeed) + 'cm</span></div>';
    }

    var rows = [
      ['의자 좌판 높이', fmt(c.seat) + 'cm', rng(c.seat, 2)],
      ['좌판 깊이', fmt(c.depth) + 'cm', rng(c.depth, 2)],
      ['등받이 각도', c.recline ? '110~120°' : '100~110°', '허리(요추) 지지'],
      ['책상 상판 높이', fmt(c.deskH) + 'cm', rng(c.deskH, 3)],
      ['팔꿈치 높이', fmt(c.elbowH) + 'cm', '90~110° 유지'],
      ['모니터 상단 높이', fmt(c.eyeTop) + 'cm', '눈높이 −0~5cm'],
      ['모니터 거리', fmt(c.dist) + 'cm', rng(c.dist, 5)],
      ['스탠딩 데스크', fmt(c.standing) + 'cm', rng(c.standing, 5)]
    ];

    html += '<div class="card">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">📊</span><span class="card__title">권장 치수표</span><span class="card__note">±2~5cm</span></div>' +
      '<div class="kv">' + rows.map(function (r) {
        return '<div class="kv__row"><span class="kv__k">' + r[0] + '</span><span class="kv__v">' + r[1] + ' <small>' + r[2] + '</small></span></div>';
      }).join('') + footRow + '</div>' +
      (c.adjusted
        ? '<p class="field__hint mt-8">입력한 책상 높이(' + fmt(c.deskNow) + 'cm)에 팔꿈치를 맞추려면 좌판이 <b>' + fmt(c.seat) + 'cm</b>가 되어야 합니다. ' +
          (c.footNeed > 0.4
            ? '발이 바닥에서 ' + fmt(c.footNeed) + 'cm 뜨므로 <b>그 높이의 발판</b>이 필요합니다.'
            : (c.deskLift > 0.4 ? '책상이 <b>' + fmt(c.deskLift) + 'cm 낮습니다</b>. 상판 받침이나 다리 패드로 올리세요.' : '발판 없이도 발이 바닥에 닿습니다.')) + '</p>'
        : '<p class="field__hint mt-8">지금 쓰는 책상 높이를 넣으면 <b>발판이 필요한지</b>까지 계산해 드립니다.</p>') +
    '</div>';

    html += '<div class="card" style="background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 30%,var(--line))">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">✅</span><span class="card__title">이 순서로 세팅</span></div>' +
      '<div class="tips">' +
        '<div class="tip"><span class="tip__n">1</span><span class="tip__text">좌판 <b>' + fmt(c.seat) + 'cm</b> — 발바닥이 바닥(또는 발판)에 닿고 무릎 90°</span></div>' +
        '<div class="tip"><span class="tip__n">2</span><span class="tip__text">좌판 깊이 <b>약 ' + fmt(c.depth) + 'cm</b> — 오금과 좌판 앞끝 3~5cm 간격</span></div>' +
        '<div class="tip"><span class="tip__n">3</span><span class="tip__text">책상 <b>' + fmt(c.deskH) + 'cm</b> — 팔꿈치 90~110°, 손목은 평평하게</span></div>' +
        '<div class="tip"><span class="tip__n">4</span><span class="tip__text">모니터 상단 <b>' + fmt(c.eyeTop) + 'cm</b>, 거리 <b>' + fmt(c.dist) + 'cm</b> — 시선은 10~15° 아래</span></div>' +
      '</div>' +
    '</div>';

    html += '<p class="disclaimer"><b>참고용 안내</b> — 평균 인체측정 비율로 계산한 권장값입니다. 다리 길이·몸통 비율은 개인차가 커서 ±2~3cm 차이가 날 수 있습니다. 통증이 지속되면 정형외과·재활의학과 상담을 권합니다.</p>';

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
    L.push('[내 키 데스크 치수] ' + fmt(c.H) + 'cm');
    L.push('· 의자 좌판 높이: ' + fmt(c.seat) + 'cm');
    L.push('· 좌판 깊이: ' + fmt(c.depth) + 'cm (오금 앞 3~5cm)');
    L.push('· 책상 상판: ' + fmt(c.deskH) + 'cm');
    L.push('· 팔꿈치 높이: ' + fmt(c.elbowH) + 'cm');
    L.push('· 모니터 상단: ' + fmt(c.eyeTop) + 'cm · 거리 ' + fmt(c.dist) + 'cm');
    L.push('· 스탠딩 데스크: ' + fmt(c.standing) + 'cm');
    if (c.adjusted && c.footNeed > 0.4) L.push('· 필요한 발판 높이: ' + fmt(c.footNeed) + 'cm');
    if (c.adjusted && c.deskLift > 0.4) L.push('· 책상 올림: ' + fmt(c.deskLift) + 'cm');
    L.push('', '팩트체크 건강연구소 데스크 높이 계산기 https://hjh7085-bit.github.io/desk-fit/');
    return L.join('\n');
  }

  function copy(c) {
    var text = buildText(c);
    function fb() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('치수를 복사했어요'); } catch (e) { toast('복사가 막혀 있어요'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('치수를 복사했어요'); }, fb);
    } else fb();
  }

  /* ---------- 세그먼트 ---------- */
  function bindSeg(id, key, attr) {
    document.querySelectorAll('#' + id + ' [data-' + attr + ']').forEach(function (b) {
      b.addEventListener('click', function () {
        state[key] = b.getAttribute('data-' + attr);
        document.querySelectorAll('#' + id + ' .seg__btn').forEach(function (x) {
          var on = x === b;
          x.classList.toggle('is-on', on);
          x.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        save();
        render(false);
      });
    });
  }
  bindSeg('deskSeg', 'desk', 'desk');
  bindSeg('postureSeg', 'posture', 'posture');
  bindSeg('footSeg', 'foot', 'foot');

  ['height', 'deskNow'].forEach(function (id) {
    var el = $(id);
    if (!el) return;
    el.addEventListener('input', function () { save(); render(false); });
    el.addEventListener('change', function () { save(); render(false); });
  });

  function syncSegs() {
    [['deskSeg', 'desk'], ['postureSeg', 'posture'], ['footSeg', 'foot']].forEach(function (p) {
      document.querySelectorAll('#' + p[0] + ' .seg__btn').forEach(function (x) {
        var on = x.getAttribute('data-' + p[1]) === state[p[1]];
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
  }

  var calcBar = $('calcBar');
  if (calcBar) calcBar.addEventListener('click', function () { render(true); });

  /* ---------- 초기화 ---------- */
  load();
  if (!$('height').value) $('height').value = '175';
  syncSegs();
  render(false);
})();
