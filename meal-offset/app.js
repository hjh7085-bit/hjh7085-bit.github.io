/* ==========================================================================
   야식·외식 상쇄 계산기 — meal-offset/app.js
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

  /* ---------- 메뉴 데이터 (1인분 기준 추정) ---------- */
  var MENU = [
    { id: 'gukbap', emoji: '🍲', name: '돼지국밥', unit: '1그릇', kcal: 620, carb: 78, prot: 28, fat: 19, sodium: 2300 },
    { id: 'chicken', emoji: '🍗', name: '후라이드 치킨', unit: '1마리', kcal: 1800, carb: 60, prot: 110, fat: 110, sodium: 3200 },
    { id: 'ramyeon', emoji: '🍜', name: '라면', unit: '1봉지', kcal: 505, carb: 79, prot: 10, fat: 16, sodium: 1790 },
    { id: 'pizza', emoji: '🍕', name: '피자', unit: '2조각', kcal: 600, carb: 66, prot: 26, fat: 26, sodium: 1200 },
    { id: 'samgyeop', emoji: '🥓', name: '삼겹살', unit: '200g', kcal: 700, carb: 3, prot: 34, fat: 62, sodium: 900 },
    { id: 'malatang', emoji: '🌶️', name: '마라탕', unit: '1인분', kcal: 800, carb: 70, prot: 35, fat: 40, sodium: 3500 },
    { id: 'tteokbokki', emoji: '🍢', name: '떡볶이', unit: '1인분', kcal: 500, carb: 92, prot: 12, fat: 10, sodium: 1500 },
    { id: 'gimbap', emoji: '🍙', name: '김밥', unit: '1줄', kcal: 480, carb: 70, prot: 16, fat: 13, sodium: 900 },
    { id: 'jjajang', emoji: '🍝', name: '짜장면', unit: '1그릇', kcal: 780, carb: 115, prot: 22, fat: 24, sodium: 2200 },
    { id: 'burger', emoji: '🍔', name: '햄버거 세트', unit: '버거+감자+콜라', kcal: 1050, carb: 125, prot: 30, fat: 45, sodium: 1800 },
    { id: 'cafe', emoji: '☕', name: '아이스아메리카노+케이크', unit: '1조각 1잔', kcal: 450, carb: 55, prot: 6, fat: 22, sodium: 250 },
    { id: 'soju', emoji: '🍶', name: '소주', unit: '1병', kcal: 400, carb: 0, prot: 0, fat: 0, sodium: 0 }
  ];

  var PACES = {
    slow: { label: '천천히', met: 2.8, speed: '3km/h' },
    normal: { label: '보통', met: 3.5, speed: '4.5km/h' },
    fast: { label: '빠르게', met: 4.3, speed: '6km/h' }
  };

  var STORE = 'fchl-meal-v1';
  var state = { picked: [], weight: '', pace: 'normal' };

  var $ = function (id) { return document.getElementById(id); };
  var resultEl = $('result');
  var pickedList = $('pickedList');

  /* ---------- 저장 ---------- */
  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({
        picked: state.picked, weight: $('weight').value, pace: state.pace
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
    if (Array.isArray(d.picked)) {
      state.picked = d.picked.filter(function (p) {
        return p && MENU.some(function (m) { return m.id === p.id; }) && p.qty > 0;
      }).map(function (p) { return { id: p.id, qty: Number(p.qty) || 1 }; });
    }
    if (d.weight) $('weight').value = d.weight;
    if (d.pace && PACES[d.pace]) state.pace = d.pace;
  }

  function findBy(id) { return MENU.filter(function (m) { return m.id === id; })[0]; }
  function qtyOf(id) {
    var p = state.picked.filter(function (x) { return x.id === id; })[0];
    return p ? p.qty : 0;
  }
  function bump(id, delta) {
    var p = state.picked.filter(function (x) { return x.id === id; })[0];
    if (!p) {
      if (delta <= 0) return;
      state.picked.push({ id: id, qty: delta });
    } else {
      p.qty = Math.round((p.qty + delta) * 2) / 2;
      if (p.qty <= 0) state.picked = state.picked.filter(function (x) { return x.id !== id; });
    }
    save();
    renderMenu();
    renderPicked();
    render(false);
  }

  /* ---------- 메뉴 그리드 ---------- */
  function renderMenu() {
    var grid = $('menuGrid');
    grid.innerHTML = MENU.map(function (m) {
      var on = qtyOf(m.id) > 0;
      return '<button class="menu' + (on ? ' is-on' : '') + '" type="button" data-id="' + m.id + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        '<span class="menu__check" aria-hidden="true">✓</span>' +
        '<span class="menu__emoji" aria-hidden="true">' + m.emoji + '</span>' +
        '<span class="menu__name">' + m.name + '</span>' +
        '<span class="menu__kcal">' + m.kcal.toLocaleString('ko-KR') + ' kcal</span>' +
      '</button>';
    }).join('');
    grid.querySelectorAll('.menu').forEach(function (b) {
      b.addEventListener('click', function () { bump(b.getAttribute('data-id'), 1); });
    });
  }

  function renderPicked() {
    var count = state.picked.length;
    var qtySum = state.picked.reduce(function (a, p) { return a + p.qty; }, 0);
    $('pickedNote').textContent = count ? count + '종 · ' + qtySum + '인분' : '0개';
    var cb = $('clearBtn');
    if (cb) cb.hidden = !count;
    if (!count) {
      pickedList.innerHTML = '<p class="field__hint" style="margin:0">메뉴를 고르면 여기에 담깁니다.</p>';
      return;
    }
    pickedList.innerHTML = state.picked.map(function (p) {
      var m = findBy(p.id);
      return '<div class="pick">' +
        '<span class="pick__emoji" aria-hidden="true">' + m.emoji + '</span>' +
        '<div class="pick__body">' +
          '<p class="pick__name">' + m.name + '</p>' +
          '<p class="pick__meta">' + Math.round(m.kcal * p.qty) + ' kcal · 탄수 ' + Math.round(m.carb * p.qty) + 'g · ' + m.unit + ' × ' + p.qty + '</p>' +
        '</div>' +
        '<div class="pick__qty">' +
          '<button class="pick__btn" type="button" data-dec="' + m.id + '" aria-label="' + m.name + ' 줄이기">−</button>' +
          '<b>' + p.qty + '</b>' +
          '<button class="pick__btn" type="button" data-inc="' + m.id + '" aria-label="' + m.name + ' 늘리기">+</button>' +
          '<button class="pick__del" type="button" data-del="' + m.id + '" aria-label="' + m.name + ' 삭제">✕</button>' +
        '</div>' +
      '</div>';
    }).join('');
    pickedList.querySelectorAll('[data-dec]').forEach(function (b) {
      b.addEventListener('click', function () { bump(b.getAttribute('data-dec'), -0.5); });
    });
    pickedList.querySelectorAll('[data-inc]').forEach(function (b) {
      b.addEventListener('click', function () { bump(b.getAttribute('data-inc'), 0.5); });
    });
    pickedList.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-del');
        state.picked = state.picked.filter(function (x) { return x.id !== id; });
        save(); renderMenu(); renderPicked(); render(false);
      });
    });
  }

  /* ---------- 계산 ---------- */
  function totals() {
    var t = { kcal: 0, carb: 0, prot: 0, fat: 0, sodium: 0 };
    state.picked.forEach(function (p) {
      var m = findBy(p.id);
      if (!m) return;
      t.kcal += m.kcal * p.qty;
      t.carb += m.carb * p.qty;
      t.prot += m.prot * p.qty;
      t.fat += m.fat * p.qty;
      t.sodium += m.sodium * p.qty;
    });
    return t;
  }

  function weightVal() {
    var w = parseFloat($('weight').value);
    if (!isFinite(w) || w < 30 || w > 250) return 0;
    return w;
  }

  function spikeWalkMin(carb) {
    if (carb < 25) return 10;
    if (carb < 50) return 15;
    if (carb < 80) return 20;
    if (carb < 120) return 30;
    if (carb < 160) return 40;
    return 45;
  }

  function waterMl(t) {
    var v = 200 + t.kcal * 0.22 + t.sodium * 0.13;
    v = Math.min(900, Math.max(250, v));
    return Math.round(v / 50) * 50;
  }

  var lastText = '';

  function render(scroll) {
    var t = totals();
    if (!state.picked.length) {
      resultEl.innerHTML = '<div class="result__empty">' +
        '<span class="result__empty-icon" aria-hidden="true">🍜</span>' +
        '<strong>메뉴를 고르면 계산이 시작됩니다</strong>' +
        '<span>야식·외식 메뉴를 누르면 칼로리·탄수화물과 함께 걷기 시간, 물 보충량, 다음 끼니 조절법이 나옵니다.</span>' +
        '</div>';
      lastText = '';
      return;
    }

    var w = weightVal();
    var pace = PACES[state.pace];
    var met = pace.met;
    var kcalPerMin = w ? met * 3.5 * w / 200 : 0;
    var fullMin = kcalPerMin ? Math.round(t.kcal / kcalPerMin) : 0;
    var spikeMin = spikeWalkMin(t.carb);
    var water = waterMl(t);
    var dayPct = Math.round(t.kcal / 2000 * 100);

    var level = t.kcal < 600 ? 'ok' : t.kcal < 1000 ? 'warn' : 'bad';
    var vCls = level === 'ok' ? 'verdict--ok' : level === 'warn' ? 'verdict--warn' : 'verdict--bad';
    var vIcon = level === 'ok' ? '🟢' : level === 'warn' ? '🟡' : '🔴';
    var vTitle = t.kcal.toLocaleString('ko-KR') + ' kcal · 하루의 ' + dayPct + '%';
    var vDesc = level === 'ok'
      ? '한 끼로 무난한 양입니다. 그래도 탄수화물이 ' + Math.round(t.carb) + 'g이라면 식후 10~20분 걷기를 붙여 주세요.'
      : level === 'warn'
        ? '한 끼로는 넉넉한 양입니다. 다음 끼니에서 탄수화물을 줄이고, 식후 걷기를 꼭 붙이세요.'
        : '한 끼로는 과한 양입니다. 먹는 양을 3분의 1만 줄여도 ' + Math.round(t.kcal / 3).toLocaleString('ko-KR') + ' kcal가 사라집니다.';

    var protTarget = w ? Math.round(w * 1.4 / 3) : 25;
    var carbCut = t.carb >= 120 ? '밥 1/2공기(약 35g) 또는 면 1/3' : t.carb >= 70 ? '밥 2/3공기(약 25g)' : '평소 양 그대로';

    var html = '<div class="result reveal">' +
      '<div class="verdict ' + vCls + '">' +
        '<span class="verdict__icon" aria-hidden="true">' + vIcon + '</span>' +
        '<div class="verdict__body">' +
          '<p class="verdict__kicker">먹은 메뉴 ' + state.picked.length + '종 · ' + pace.label + ' 걷기 ' + pace.speed + '</p>' +
          '<p class="verdict__title">' + vTitle + '</p>' +
          '<p class="verdict__desc">' + vDesc + '</p>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card__head"><span class="card__icon" aria-hidden="true">📊</span><span class="card__title">영양 요약</span><span class="card__note">하루 기준 대비</span></div>' +
        '<div class="bars">' +
          bar('칼로리', Math.round(t.kcal).toLocaleString('ko-KR') + ' kcal', t.kcal, 2000, 'kcal') +
          bar('탄수화물', Math.round(t.carb) + ' g', t.carb, 250, 'carb') +
          bar('단백질', Math.round(t.prot) + ' g', t.prot, w ? Math.round(w * 1.4) : 90, 'prot') +
          bar('지방', Math.round(t.fat) + ' g', t.fat, 55, 'fat') +
        '</div>' +
        '<p class="field__hint mt-8">하루 기준은 2,000kcal · 탄수화물 250g · 지방 55g, 단백질은 체중 1.4g/kg입니다' + (w ? ' (내 체중 ' + w + 'kg 기준 ' + Math.round(w * 1.4) + 'g)' : '') + '. 나트륨은 약 ' + Math.round(t.sodium).toLocaleString('ko-KR') + 'mg(하루 2,000mg 기준 ' + Math.round(t.sodium / 2000 * 100) + '%).</p>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card__head"><span class="card__icon" aria-hidden="true">🚶</span><span class="card__title">식후 걷기</span><span class="card__note">혈당 스파이크 컷</span></div>' +
        '<div class="big-number">' + spikeMin + '<small>분</small></div>' +
        '<p class="field__hint mt-8">식사를 마치고 <b>15~30분 안에</b> 시작해 ' + (spikeMin >= 40 ? '10~15분씩 3~4번 나눠' : '한 번에') + ' 걸으세요. 탄수화물 ' + Math.round(t.carb) + 'g 기준 권장 시간입니다.</p>' +
        '<div class="kv mt-12">' +
          '<div class="kv__row"><span class="kv__k">칼로리를 전부 태우려면 <span class="small muted">(' + pace.label + ' ' + pace.speed + ')</span></span><span class="kv__v">' + (w ? fullMin + '분' : '체중 입력 필요') + '</span></div>' +
          '<div class="kv__row"><span class="kv__k">걷기 1분 소모 <span class="small muted">(' + (w ? w + 'kg' : '체중 미입력') + ')</span></span><span class="kv__v">' + (w ? kcalPerMin.toFixed(1) + ' kcal' : '—') + '</span></div>' +
          '<div class="kv__row"><span class="kv__k">같은 양을 걷기로 다 태울 때 걸음 수 <span class="small muted">(약 1분 100보)</span></span><span class="kv__v">' + (w ? (fullMin * 100).toLocaleString('ko-KR') + '보' : '—') + '</span></div>' +
        '</div>' +
        (w ? '' : '<p class="field__hint mt-8" style="color:var(--amber)">체중을 넣으면 걷기 소모량과 전액 상쇄 시간이 정확해집니다.</p>') +
        '<p class="field__hint mt-8">걷기로 먹은 칼로리를 다 태우는 건 현실적으로 어렵습니다. <b>다음 끼니 조절</b>이 훨씬 효율적이에요.</p>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card__head"><span class="card__icon" aria-hidden="true">💧</span><span class="card__title">수분 보충</span><span class="card__note">나트륨 ' + Math.round(t.sodium).toLocaleString('ko-KR') + 'mg</span></div>' +
        '<div class="big-number">' + water.toLocaleString('ko-KR') + '<small>mL</small></div>' +
        '<p class="field__hint mt-8">' + (t.sodium >= 2500
          ? '나트륨이 많은 메뉴입니다. 다음 날 아침 부종·혈압 상승을 막으려면 물을 나눠 마시고, 짠 국물은 남기세요.'
          : '식후 1~2시간에 나눠 마시면 포만감과 나트륨 배출에 도움이 됩니다. 한 번에 들이켜지 마세요.') + '</p>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card__head"><span class="card__icon" aria-hidden="true">🥗</span><span class="card__title">다음 끼니 이렇게 조절</span></div>' +
        '<div class="kv">' +
          '<div class="kv__row"><span class="kv__k">탄수화물</span><span class="kv__v">' + carbCut + '</span></div>' +
          '<div class="kv__row"><span class="kv__k">단백질</span><span class="kv__v">' + protTarget + 'g 이상</span></div>' +
          '<div class="kv__row"><span class="kv__k">채소</span><span class="kv__v">2주먹(약 200g)</span></div>' +
          '<div class="kv__row"><span class="kv__k">다음 끼니 총량</span><span class="kv__v">' + (t.kcal >= 1000 ? '400~500 kcal' : t.kcal >= 700 ? '500~600 kcal' : '평소대로') + '</span></div>' +
        '</div>' +
        '<p class="field__hint mt-8">먹는 순서는 <b>채소 → 단백질 → 탄수화물</b>. 같은 밥도 순서만 바꿔도 식후 혈당 상승 폭이 줄어듭니다. ' + (protTarget >= 30 ? '단백질 ' + protTarget + 'g은 닭가슴살 100g+계란 2개 정도입니다.' : '단백질 ' + protTarget + 'g은 두부 200g 또는 계란 3개 정도입니다.') + '</p>' +
      '</div>';

    var tips = [
      '먹은 뒤 <b>바로 눕지 말고</b> 30분은 앉거나 서서 움직이세요. 역류와 혈당 상승을 함께 막습니다.',
      t.sodium >= 2500 ? '국물은 절반만, 소스는 따로. 나트륨 1,000mg을 줄이면 다음 날 부기가 눈에 띄게 덜합니다.' : '단백질 반찬(계란·두부·살코기)을 먼저 먹으면 같은 양으로도 덜 배고픕니다.',
      '야식은 잠들기 <b>3시간 전</b>까지. 늦었다면 양을 절반으로 줄이고 단백질 위주로 드세요.',
      state.pace === 'slow' ? '걷기가 힘들면 속도보다 <b>시간</b>을 채우세요. 천천히 30분도 충분합니다.' : '빠르게 걸을수록 혈당 개선 효과가 크지만, 무릎·발목이 아프면 보통 속도로 나눠 걷는 게 낫습니다.'
    ];

    html += '<div class="card">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">💡</span><span class="card__title">이렇게 하면 더 좋아요</span></div>' +
      '<div class="tips">' + tips.map(function (x, i) {
        return '<div class="tip"><span class="tip__n">' + (i + 1) + '</span><span class="tip__text">' + x + '</span></div>';
      }).join('') + '</div>' +
      '<button class="btn btn--sm btn--block mt-12" type="button" id="copyBtn">결과 복사</button>' +
    '</div>' +
    '<p class="disclaimer"><b>참고용 안내</b> — 일반적인 1인분 영양성분 기반 추정치이고, 걷기 소모량은 개인차가 큽니다. 당뇨·신장질환·심장질환이 있거나 약을 복용 중이면 식사·운동 계획을 의료진과 상담하세요.</p>' +
    '</div>';

    resultEl.innerHTML = html;

    var copyBtn = $('copyBtn');
    if (copyBtn) copyBtn.addEventListener('click', function () {
      var lines = ['[야식·외식 상쇄 계산]'];
      state.picked.forEach(function (p) {
        var m = findBy(p.id);
        lines.push('· ' + m.name + ' ' + p.qty + '인분 — ' + Math.round(m.kcal * p.qty) + ' kcal');
      });
      lines.push('합계 ' + Math.round(t.kcal) + ' kcal · 탄수화물 ' + Math.round(t.carb) + 'g (하루의 ' + dayPct + '%)');
      lines.push('식후 걷기 ' + spikeMin + '분 · 물 ' + water + 'mL');
      if (w) lines.push('전액 상쇄 걷기 ' + fullMin + '분 (' + pace.label + ' ' + pace.speed + ')');
      lines.push('', '팩트체크 건강연구소 야식 상쇄 계산기 https://hjh7085-bit.github.io/meal-offset/');
      copyText(lines.join('\n'));
    });

    lastText = '';

    if (scroll && window.innerWidth < 980) {
      var top = resultEl.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  function bar(label, valueText, value, max, kind) {
    var pct = Math.max(0, Math.min(100, value / max * 100));
    return '<div class="bar">' +
      '<div class="bar__top"><span>' + label + '</span><b>' + valueText + '</b></div>' +
      '<div class="bar__track"><span class="bar__fill bar__fill--' + kind + '" style="width:' + pct.toFixed(1) + '%"></span></div>' +
    '</div>';
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('결과를 복사했어요'); }, fb);
    } else fb();
    function fb() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('결과를 복사했어요'); } catch (e) { toast('복사가 막혀 있어요'); }
      document.body.removeChild(ta);
    }
  }

  /* ---------- 걷기 속도 ---------- */
  document.querySelectorAll('#paceSeg [data-pace]').forEach(function (b) {
    b.addEventListener('click', function () {
      state.pace = b.getAttribute('data-pace');
      document.querySelectorAll('#paceSeg [data-pace]').forEach(function (x) {
        var on = x === b;
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      save();
      render(false);
    });
  });

  var weightEl = $('weight');
  if (weightEl) {
    weightEl.addEventListener('input', function () { save(); render(false); });
  }

  var clearBtn = $('clearBtn');
  if (clearBtn) clearBtn.addEventListener('click', function () {
    state.picked = [];
    save(); renderMenu(); renderPicked(); render(false);
    toast('목록을 비웠어요');
  });

  var calcBar = $('calcBar');
  if (calcBar) calcBar.addEventListener('click', function () {
    if (!state.picked.length) {
      toast('먹은 메뉴를 먼저 골라 주세요');
      $('tool').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    render(true);
  });

  /* ---------- 영양표 ---------- */
  function renderTable() {
    var tb = $('menuTable');
    if (!tb) return;
    tb.innerHTML = MENU.map(function (m) {
      return '<tr><td><b>' + m.emoji + ' ' + m.name + '</b></td><td>' + m.unit + '</td><td>' + m.kcal.toLocaleString('ko-KR') + '</td><td>' + m.carb + 'g</td><td>' + m.prot + 'g</td></tr>';
    }).join('');
  }

  /* ---------- 초기화 ---------- */
  load();
  document.querySelectorAll('#paceSeg [data-pace]').forEach(function (x) {
    var on = x.getAttribute('data-pace') === state.pace;
    x.classList.toggle('is-on', on);
    x.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  renderMenu();
  renderPicked();
  renderTable();
  render(false);
})();
