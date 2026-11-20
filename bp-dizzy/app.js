/* ==========================================================================
   기립성 저혈압·어지럼증 수분·염분 보충 체크기 — bp-dizzy/app.js
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
  var STORE = 'fchl-bp-v1';
  var resultEl = $('result');
  var state = { freq: 1, flags: {}, reds: {} };

  var FLAG_META = {
    fast: { label: '단식·간헐적 단식', why: '단식은 나트륨·수분 배출을 늘려 기립 시 혈압을 더 떨어뜨립니다.' },
    salt: { label: '저염식', why: '염분 제한은 혈액량을 줄입니다. 기립성 저혈압이 있으면 의사와 염분 목표를 다시 정하세요.' },
    med: { label: '혈압약·이뇨제', why: '약효가 겹치면 기립 시 혈압이 급격히 떨어집니다. 임의 중단은 금물, 용량 조정은 처방의와 상의하세요.' },
    hot: { label: '더운 환경·사우나', why: '피부 혈관이 열리며 혈압이 낮아집니다. 사우나 후에는 천천히, 물을 먼저 드세요.' },
    glp: { label: 'GLP-1 계열(마운자로 등)', why: '식사량·수분 섭취가 줄어 어지럼이 흔합니다. 단백질·수분을 먼저 챙기고 일어설 때 천천히.' }
  };
  var RED_META = {
    syncope: { label: '실신한 적 있음', why: '한 번이라도 정신을 잃었다면 원인 감별(부정맥·신경성)이 필요합니다.' },
    chest: { label: '가슴통증·두근거림', why: '부정맥·심장질환 신호일 수 있어 심전도 검사가 필요합니다.' },
    anemia: { label: '흑색변·빈혈', why: '위장관 출혈·철결핍 빈혈을 먼저 확인해야 합니다.' },
    preg: { label: '임신 가능성', why: '임신 중 어지럼은 빈혈·저혈압·자궁외임신 등 감별이 필요합니다.' }
  };

  /* ---------- 저장 ---------- */
  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        freq: state.freq, flags: state.flags, reds: state.reds,
        water: $('water').value, sbp: $('sbp').value, dbp: $('dbp').value
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
    if (typeof d.freq === 'number') state.freq = d.freq;
    if (d.flags) state.flags = d.flags;
    if (d.reds) state.reds = d.reds;
    if (d.water) $('water').value = d.water;
    if (d.sbp) $('sbp').value = d.sbp;
    if (d.dbp) $('dbp').value = d.dbp;
  }

  /* ---------- 점수 ---------- */
  function compute() {
    var water = Number($('water').value);
    if (!isFinite(water) || water < 0) water = 0;
    var sbp = Number($('sbp').value);
    var dbp = Number($('dbp').value);
    var hasBp = isFinite(sbp) && sbp >= 60 && sbp <= 230 && isFinite(dbp) && dbp >= 30 && dbp <= 150;

    var score = state.freq;
    var items = [];

    items.push({
      kind: state.freq >= 2 ? 'warn' : (state.freq === 1 ? 'info' : 'ok'),
      text: state.freq >= 3 ? '거의 매일 일어설 때 어지럽습니다.'
        : state.freq === 2 ? '주 2회 이상 어지럼이 있습니다.'
        : state.freq === 1 ? '가끔 어지럼이 있습니다.'
        : '일어설 때 어지럼이 거의 없습니다.'
    });

    var waterPt = water < 1.0 ? 2 : (water < 1.5 ? 1 : 0);
    score += waterPt;
    items.push({
      kind: waterPt === 2 ? 'bad' : (waterPt === 1 ? 'warn' : 'ok'),
      text: '하루 물 ' + water.toFixed(1) + 'L' + (waterPt === 2 ? ' — 너무 적습니다(권장 1.5~2L).'
        : waterPt === 1 ? ' — 조금 부족합니다(권장 1.5~2L).' : ' — 충분한 편입니다.')
    });

    var flagCount = 0;
    Object.keys(state.flags).forEach(function (k) { if (state.flags[k]) flagCount++; });
    var flagPt = Math.min(3, flagCount);
    score += flagPt;
    if (flagCount) {
      items.push({ kind: flagPt >= 2 ? 'warn' : 'info', text: '악화 요인 ' + flagCount + '개 — ' + Object.keys(state.flags).filter(function (k) { return state.flags[k]; }).map(function (k) { return FLAG_META[k].label; }).join(', ') });
    }

    if (hasBp) {
      if (sbp < 100) { score += 1; items.push({ kind: 'warn', text: '평소 수축기 ' + sbp + 'mmHg — 낮은 편이라 기립 시 더 떨어지기 쉽습니다.' }); }
      else if (sbp >= 140 || dbp >= 90) { items.push({ kind: 'info', text: '평소 혈압 ' + sbp + '/' + dbp + 'mmHg — 고혈압 범위입니다. 염분 증량은 금물입니다.' }); }
      else { items.push({ kind: 'ok', text: '평소 혈압 ' + sbp + '/' + dbp + 'mmHg — 정상 범위입니다.' }); }
    }

    var redCount = Object.keys(state.reds).filter(function (k) { return state.reds[k]; }).length;
    var level = redCount > 0 ? 'bad' : (score >= 6 ? 'bad' : (score >= 3 ? 'warn' : 'ok'));

    return {
      water: water, sbp: sbp, dbp: dbp, hasBp: hasBp, score: score,
      flagCount: flagCount, redCount: redCount, level: level, items: items,
      waterTarget: Math.max(1.5, Math.min(2.5, Math.round((water + 0.5) * 10) / 10))
    };
  }

  /* ---------- 렌더 ---------- */
  function render(scroll) {
    var c = compute();
    var map = {
      ok: { cls: 'verdict--ok', icon: '💧', kicker: '위험도 낮음', title: '지금 습관이면 충분합니다' },
      warn: { cls: 'verdict--warn', icon: '⚠️', kicker: '주의 · 보충이 필요', title: '수분·기립 습관을 먼저 바꾸세요' },
      bad: { cls: 'verdict--bad', icon: '🚨', kicker: '진료 권장', title: '병원에서 원인 감별이 필요합니다' }
    };
    var m = map[c.level];

    var desc;
    if (c.redCount > 0) {
      desc = '적신호 ' + c.redCount + '개를 선택하셨습니다. <b>' + Object.keys(state.reds).filter(function (k) { return state.reds[k]; }).map(function (k) { return RED_META[k].label; }).join(', ') + '</b> — 이 경우 집에서 보충으로 해결하려 하지 말고 진료를 받으세요.';
    } else if (c.level === 'bad') {
      desc = '점수 ' + c.score + '점. 증상 빈도와 악화 요인이 겹쳤습니다. 실신 위험이 있으니 3단계 기립 요령을 지키고, 내과·신경과에서 혈압 측정과 혈액검사를 받으세요.';
    } else if (c.level === 'warn') {
      desc = '점수 ' + c.score + '점. 물 섭취와 악화 요인을 조정하면 대부분 좋아집니다. 2주 지켜도 그대로면 진료를 권합니다.';
    } else {
      desc = '점수 ' + c.score + '점. 지금은 수분과 기립 습관만 유지해도 충분합니다.';
    }

    var html = '';
    html += '<div class="verdict ' + m.cls + '">' +
      '<span class="verdict__icon" aria-hidden="true">' + m.icon + '</span>' +
      '<div class="verdict__body">' +
        '<p class="verdict__kicker">' + m.kicker + ' · 점수 ' + c.score + '</p>' +
        '<p class="verdict__title">' + m.title + '</p>' +
        '<p class="verdict__desc">' + desc + '</p>' +
      '</div>' +
    '</div>';

    html += '<div class="card">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">📊</span><span class="card__title">체크 결과</span><span class="card__note">' + (c.level === 'ok' ? '양호' : c.level === 'warn' ? '주의' : '진료 권장') + '</span></div>' +
      '<div class="counts">' +
        '<div class="count count--' + (c.redCount ? 'bad' : 'ok') + '"><b>' + c.redCount + '</b><span>적신호</span></div>' +
        '<div class="count count--' + (c.flagCount >= 2 ? 'warn' : 'ok') + '"><b>' + c.flagCount + '</b><span>악화 요인</span></div>' +
        '<div class="count count--' + (c.water < 1.0 ? 'bad' : c.water < 1.5 ? 'warn' : 'ok') + '"><b>' + c.water.toFixed(1) + '</b><span>물(L/일)</span></div>' +
      '</div>' +
      '<div class="mt-12">' + c.items.map(function (it) {
        var cls = it.kind === 'bad' ? 'badge--bad' : it.kind === 'warn' ? 'badge--warn' : it.kind === 'ok' ? 'badge--ok' : 'badge--accent';
        var label = it.kind === 'bad' ? '위험' : it.kind === 'warn' ? '주의' : it.kind === 'ok' ? '양호' : '참고';
        return '<div class="sig"><span class="badge ' + cls + ' sig__badge">' + label + '</span><span>' + it.text + '</span></div>';
      }).join('') + '</div>' +
      '<button class="btn btn--sm btn--block mt-12" type="button" id="copyBtn">결과 복사하기</button>' +
    '</div>';

    html += '<div class="card">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">💧</span><span class="card__title">오늘의 보충 목표</span></div>' +
      '<div class="kv">' +
        '<div class="kv__row"><span class="kv__k">물 목표</span><span class="kv__v">' + c.waterTarget.toFixed(1) + 'L</span></div>' +
        '<div class="kv__row"><span class="kv__k">기상 직후</span><span class="kv__v">물 1컵(200mL)</span></div>' +
        '<div class="kv__row"><span class="kv__k">어지러울 때</span><span class="kv__v">300~500mL 한 번에</span></div>' +
        '<div class="kv__row"><span class="kv__k">염분</span><span class="kv__v">' + (c.hasBp && c.sbp >= 140 ? '증량 금물' : '의사 지시 시만') + '</span></div>' +
        '<div class="kv__row"><span class="kv__k">전해질 음료</span><span class="kv__v">땀 흘린 날 500mL</span></div>' +
      '</div>' +
      '<p class="field__hint mt-8">' + (c.hasBp && c.sbp >= 140
        ? '평소 혈압이 높은 편이므로 <b>소금을 더 먹는 보충법은 피하세요</b>. 수분과 기립 훈련, 약 조정으로 접근합니다.'
        : '염분 보충은 <b>고혈압·심장·신장 질환이 없을 때, 의사 지시가 있을 때만</b> 합니다. 개인 판단으로 소금을 늘리지 마세요.') + '</p>' +
    '</div>';

    if (c.flagCount) {
      html += '<div class="card" style="background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 30%,var(--line))">' +
        '<div class="card__head"><span class="card__icon" aria-hidden="true">🔎</span><span class="card__title">선택한 요인별 조치</span></div>' +
        '<div class="tips">' + Object.keys(state.flags).filter(function (k) { return state.flags[k]; }).map(function (k, i) {
          return '<div class="tip"><span class="tip__n">' + (i + 1) + '</span><span class="tip__text"><b>' + FLAG_META[k].label + '</b> — ' + FLAG_META[k].why + '</span></div>';
        }).join('') + '</div>' +
      '</div>';
    }

    html += '<div class="card">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">🚨</span><span class="card__title">이럴 땐 바로 병원</span></div>' +
      '<div class="tips">' +
        '<div class="tip"><span class="tip__n">1</span><span class="tip__text"><b>실신</b> — 잠깐이라도 정신을 잃었다면 응급. 운전 중이라면 더 위험합니다.</span></div>' +
        '<div class="tip"><span class="tip__n">2</span><span class="tip__text"><b>가슴 통증·두근거림</b> — 부정맥·심장질환 감별을 위해 심전도가 필요합니다.</span></div>' +
        '<div class="tip"><span class="tip__n">3</span><span class="tip__text"><b>흑색변·창백·숨참</b> — 위장관 출혈·철결핍 빈혈 신호입니다.</span></div>' +
        '<div class="tip"><span class="tip__n">4</span><span class="tip__text"><b>임신 중 어지럼</b> — 빈혈·저혈압·자궁외임신 감별이 필요합니다. 산부인과 상담.</span></div>' +
      '</div>' +
    '</div>';

    html += '<p class="disclaimer"><b>참고용 안내</b> — 이 체크기는 생활 습관과 증상 빈도로 위험도를 가늠하는 참고 도구이며, 기립성 저혈압을 진단하지 않습니다. 실제 진단은 누운 자세·선 자세 혈압 측정으로 합니다. 실신·흉통·흑색변이 있으면 즉시 진료를 받으세요.</p>';

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
    L.push('[기립성 저혈압 체크] 점수 ' + c.score + ' · ' + (c.level === 'ok' ? '양호' : c.level === 'warn' ? '주의' : '진료 권장'));
    c.items.forEach(function (it) { L.push('· ' + it.text); });
    L.push('· 물 목표: ' + c.waterTarget.toFixed(1) + 'L/일 · 기상 직후 1컵');
    L.push('· 일어설 때: 앉아 30초 → 서서 30초 → 발뒤꿈치 10회 뒤 걷기');
    if (c.redCount) L.push('· 적신호 ' + c.redCount + '개 — 진료 필요');
    L.push('', '팩트체크 건강연구소 기립성 저혈압 체크기 https://hjh7085-bit.github.io/bp-dizzy/');
    return L.join('\n');
  }

  function copy(c) {
    var text = buildText(c);
    function fb() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('결과를 복사했어요'); } catch (e) { toast('복사가 막혀 있어요'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('결과를 복사했어요'); }, fb);
    } else fb();
  }

  /* ---------- 이벤트 ---------- */
  document.querySelectorAll('#freqSeg [data-freq]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.freq = Number(b.getAttribute('data-freq'));
      document.querySelectorAll('#freqSeg .seg__btn').forEach(function (x) {
        var on = x === b;
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      save(); render(false);
    });
  });

  document.querySelectorAll('#flagChips [data-flag]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-flag');
      state.flags[k] = !state.flags[k];
      b.classList.toggle('is-on', !!state.flags[k]);
      save(); render(false);
    });
  });
  document.querySelectorAll('#redChips [data-red]').forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-red');
      state.reds[k] = !state.reds[k];
      b.classList.toggle('is-on', !!state.reds[k]);
      save(); render(false);
    });
  });

  ['water', 'sbp', 'dbp'].forEach(function (id) {
    var el = $(id);
    if (!el) return;
    el.addEventListener('input', function () { save(); render(false); });
    el.addEventListener('change', function () { save(); render(false); });
  });

  var calcBar = $('calcBar');
  if (calcBar) calcBar.addEventListener('click', function () { render(true); });

  /* ---------- 초기화 ---------- */
  load();
  if (!$('water').value) $('water').value = '1.2';
  document.querySelectorAll('#freqSeg .seg__btn').forEach(function (x) {
    var on = Number(x.getAttribute('data-freq')) === state.freq;
    x.classList.toggle('is-on', on);
    x.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  document.querySelectorAll('#flagChips [data-flag]').forEach(function (b) {
    b.classList.toggle('is-on', !!state.flags[b.getAttribute('data-flag')]);
  });
  document.querySelectorAll('#redChips [data-red]').forEach(function (b) {
    b.classList.toggle('is-on', !!state.reds[b.getAttribute('data-red')]);
  });
  render(false);
})();
