/* ==========================================================================
   건강검진표 수치 해독기 — checkup-lab/app.js
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 공통: 테마 · 토스트 ---------- */
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
  var state = { sex: 'male' };
  var form = document.getElementById('checkupForm');
  var resultEl = document.getElementById('result');

  document.querySelectorAll('[data-sex]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.sex = btn.getAttribute('data-sex');
      document.querySelectorAll('[data-sex]').forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
  });

  function num(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    var raw = String(el.value || '').replace(',', '.').trim();
    if (raw === '') return null;
    var v = parseFloat(raw);
    if (!isFinite(v) || v < 0) return null;
    return v;
  }

  /* ---------- 분류 엔진 ---------- */
  function cls(level) {
    return level === 'bad' ? 'bad' : level === 'warn' ? 'warn' : 'ok';
  }
  function badge(level, label) {
    return '<span class="badge badge--' + cls(level) + '">' + label + '</span>';
  }
  function fmt(v, digits) {
    if (v == null) return '—';
    var d = digits == null ? (Math.abs(v) < 10 ? 2 : Math.abs(v) < 100 ? 1 : 0) : digits;
    var s = v.toFixed(d);
    return s.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  }

  // CKD-EPI 2021 (크레아티닌 기준)
  function egfrFromCr(cr, age, sex) {
    if (!cr || !age) return null;
    var k = sex === 'female' ? 0.7 : 0.9;
    var a = sex === 'female' ? -0.241 : -0.302;
    var ratio = cr / k;
    var val = 142 * Math.pow(Math.min(ratio, 1), a) * Math.pow(Math.max(ratio, 1), -1.2) * Math.pow(0.9938, age);
    if (sex === 'female') val *= 1.012;
    return Math.round(val);
  }

  /* ---------- 항목 정의 ---------- */
  function buildMetrics() {
    var sex = state.sex;
    var age = num('age');
    var out = [];

    function push(cfg) { out.push(cfg); }

    function simple(o) {
      // o: {id,name,group,unit,value,okTo,warnTo,max,min,tip,ref,digits,lowWarnTo}
      var v = o.value;
      var level, label;
      if (o.lowWarnTo != null && v < o.lowWarnTo) { level = 'warn'; label = '낮음'; }
      else if (v <= o.okTo) { level = 'ok'; label = '정상'; }
      else if (v <= o.warnTo) { level = 'warn'; label = '경계'; }
      else { level = 'bad'; label = '관리 필요'; }
      var min = o.min == null ? 0 : o.min;
      var max = o.max;
      var zones = [];
      if (o.lowWarnTo != null) zones.push({ to: o.lowWarnTo, c: 'warn' });
      zones.push({ to: o.okTo, c: 'ok' });
      zones.push({ to: o.warnTo, c: 'warn' });
      zones.push({ to: max, c: 'bad' });
      return {
        id: o.id, name: o.name, group: o.group, unit: o.unit,
        value: v, level: level, label: label, ref: o.ref, tip: o.tip,
        digits: o.digits, min: min, max: max, zones: zones
      };
    }

    // 간
    var ast = num('ast');
    if (ast != null) push(simple({
      id: 'ast', name: 'AST (간수치)', group: 'liver', unit: 'U/L', value: ast,
      okTo: 40, warnTo: 80, max: 160, ref: '정상 ≤40 · 경계 41~80 · 관리 80 초과', digits: 0,
      tip: 'AST는 간뿐 아니라 근육·심장에서도 올라갑니다. 검사 전 격한 운동이나 음주가 있었다면 4~8주 금주 후 재검을 해보세요.'
    }));
    var alt = num('alt');
    if (alt != null) push(simple({
      id: 'alt', name: 'ALT (간수치)', group: 'liver', unit: 'U/L', value: alt,
      okTo: 40, warnTo: 80, max: 160, ref: '정상 ≤40 · 경계 41~80 · 관리 80 초과', digits: 0,
      tip: 'ALT는 간에 더 특이적인 효소입니다. 지방간·음주가 가장 흔한 원인이니 3개월 금주 + 체중 5% 감량 후 재검을 권합니다.'
    }));
    var ggtLimit = sex === 'female' ? 35 : 63;
    var ggt = num('ggt');
    if (ggt != null) push(simple({
      id: 'ggt', name: 'GGT', group: 'liver', unit: 'U/L', value: ggt,
      okTo: ggtLimit, warnTo: ggtLimit * 2, max: 250, ref: (sex === 'female' ? '여성 정상 ≤35' : '남성 정상 ≤63') + ' · 2배 초과 시 관리', digits: 0,
      tip: 'GGT는 음주·흡연에 민감합니다. 술을 3주만 끊어도 절반 가까이 떨어지는 경우가 많으니 금주 후 재측정으로 원인을 확인하세요.'
    }));

    // 지질
    var tc = num('tc');
    if (tc != null) push(simple({
      id: 'tc', name: '총콜레스테롤', group: 'lipid', unit: 'mg/dL', value: tc,
      okTo: 199, warnTo: 239, max: 320, min: 100, ref: '정상 <200 · 경계 200~239 · 관리 ≥240', digits: 0,
      tip: '포화지방(삼겹살·버터·튀김)과 가공육을 줄이고, 식이섬유(채소·통곡물·콩)를 하루 25g 이상으로 올려 보세요.'
    }));
    var ldl = num('ldl');
    if (ldl != null) push(simple({
      id: 'ldl', name: 'LDL (나쁜 콜레스테롤)', group: 'lipid', unit: 'mg/dL', value: ldl,
      okTo: 129, warnTo: 159, max: 220, min: 40, ref: '정상 <130 · 경계 130~159 · 관리 ≥160', digits: 0,
      tip: 'LDL은 심혈관질환 위험과 직결됩니다. 당뇨·고혈압·심근경색 병력이 있다면 목표가 100(초고위험 70) 미만으로 낮아지니 담당 의사와 목표를 확인하세요.'
    }));
    var hdl = num('hdl');
    if (hdl != null) {
      var hdlCut = sex === 'female' ? 50 : 40;
      var hLevel = hdl < hdlCut ? 'bad' : 'ok';
      push({
        id: 'hdl', name: 'HDL (좋은 콜레스테롤)', group: 'lipid', unit: 'mg/dL', value: hdl,
        level: hLevel, label: hdl < hdlCut ? '낮음(위험)' : hdl >= 60 ? '정상(좋음)' : '정상',
        ref: (sex === 'female' ? '여성 50' : '남성 40') + ' 이상 정상 · 60 이상 좋음', digits: 0,
        min: 20, max: 90,
        zones: [{ to: hdlCut, c: 'bad' }, { to: 60, c: 'ok' }, { to: 90, c: 'ok' }],
        tip: 'HDL을 올리는 가장 확실한 방법은 유산소 운동(주 150분)과 금연입니다. 정제 탄수화물·야식도 HDL을 끌어내립니다.'
      });
    }
    var tg = num('tg');
    if (tg != null) {
      var tgLevel = tg < 150 ? 'ok' : tg < 200 ? 'warn' : 'bad';
      push({
        id: 'tg', name: '중성지방', group: 'lipid', unit: 'mg/dL', value: tg,
        level: tgLevel, label: tgLevel === 'bad' ? (tg >= 500 ? '매우 높음' : '관리 필요') : tgLevel === 'warn' ? '경계' : '정상',
        ref: '정상 <150 · 경계 150~199 · 관리 ≥200 (500 이상 응급)', digits: 0,
        min: 30, max: 400,
        zones: [{ to: 150, c: 'ok' }, { to: 200, c: 'warn' }, { to: 400, c: 'bad' }],
        tip: tg >= 500
          ? '중성지방 500 이상은 급성 췌장염 위험이 커서 약물 치료가 필요할 수 있습니다. 술은 즉시 끊고 진료를 받으세요.'
          : '술·설탕음료·과일주스·흰쌀밥 과다가 중성지방을 올립니다. 재검 전에는 12시간 공복을 꼭 지키세요.'
      });
    }

    // 신장
    var cr = num('cr');
    var crLow = sex === 'female' ? 0.6 : 0.7;
    var crHigh = sex === 'female' ? 1.1 : 1.3;
    if (cr != null) {
      var crLevel = cr > (sex === 'female' ? 1.3 : 1.5) ? 'bad' : cr > crHigh ? 'warn' : cr < crLow ? 'warn' : 'ok';
      push({
        id: 'cr', name: '크레아티닌', group: 'kidney', unit: 'mg/dL', value: cr,
        level: crLevel, label: crLevel === 'bad' ? '관리 필요' : crLevel === 'warn' ? (cr < crLow ? '낮음' : '경계') : '정상',
        ref: (sex === 'female' ? '여성 0.6~1.1' : '남성 0.7~1.3') + ' mg/dL', digits: 2,
        min: 0.4, max: 2.0,
        zones: [{ to: crLow, c: 'warn' }, { to: crHigh, c: 'ok' }, { to: 2.0, c: 'bad' }],
        tip: '크레아티닌이 높으면 수분이 부족하거나 진통소염제(NSAIDs)를 자주 먹었을 수 있습니다. 근육량이 많으면 정상보다 높게 나오기도 해요.'
      });
    }
    var egfr = num('egfr');
    var egfrAuto = false;
    if (egfr == null && cr != null && age != null) {
      egfr = egfrFromCr(cr, age, sex);
      egfrAuto = egfr != null;
    }
    if (egfr != null) {
      var eLevel = egfr >= 90 ? 'ok' : egfr >= 60 ? 'warn' : 'bad';
      push({
        id: 'egfr', name: 'eGFR (사구체여과율)', group: 'kidney', unit: 'mL/분', value: egfr,
        level: eLevel, label: eLevel === 'bad' ? (egfr < 30 ? '중증 감소' : '관리 필요') : eLevel === 'warn' ? '경도 감소' : '정상',
        ref: '정상 ≥90 · 경도 60~89 · 관리 <60', digits: 0,
        min: 0, max: 120, auto: egfrAuto,
        zones: [{ to: 60, c: 'bad' }, { to: 90, c: 'warn' }, { to: 120, c: 'ok' }],
        tip: egfr < 60
          ? '60 미만이 3개월 이상 지속되면 만성콩팥병을 의심합니다. 혈압·혈당 관리와 함께 신장내과에서 소변 단백뇨 검사를 받아보세요.'
          : 'eGFR은 나이·성별·크레아티닌으로 추정한 값입니다. 90 이상이어도 소변 단백뇨가 있으면 신장 손상이 있을 수 있어 함께 확인합니다.'
      });
    }
    var ua = num('ua');
    if (ua != null) {
      var uaOk = sex === 'female' ? 6.0 : 7.0;
      var uaBad = sex === 'female' ? 8.0 : 9.0;
      var uaLevel = ua >= uaBad ? 'bad' : ua > uaOk ? 'warn' : ua < 2.5 ? 'warn' : 'ok';
      push({
        id: 'ua', name: '요산', group: 'kidney', unit: 'mg/dL', value: ua,
        level: uaLevel, label: uaLevel === 'bad' ? '관리 필요' : uaLevel === 'warn' ? (ua < 2.5 ? '낮음' : '경계(고요산)') : '정상',
        ref: (sex === 'female' ? '여성 2.4~6.0' : '남성 3.4~7.0') + ' mg/dL', digits: 1,
        min: 0, max: 12,
        zones: [{ to: uaOk, c: 'ok' }, { to: uaBad, c: 'warn' }, { to: 12, c: 'bad' }],
        tip: '맥주·내장·육수·조개류를 줄이고 물을 하루 2L 이상 드세요. 급격한 단식·다이어트도 요산을 올리니 천천히 감량하는 게 좋습니다.'
      });
    }

    // 혈압
    var sbp = num('sbp'), dbp = num('dbp');
    if (sbp != null || dbp != null) {
      var s = sbp == null ? 0 : sbp, d = dbp == null ? 0 : dbp;
      var bpLevel, bpLabel;
      if (s >= 160 || d >= 100) { bpLevel = 'bad'; bpLabel = '2기 고혈압'; }
      else if (s >= 140 || d >= 90) { bpLevel = 'bad'; bpLabel = '고혈압(1기)'; }
      else if (s >= 130 || d >= 80) { bpLevel = 'warn'; bpLabel = '고혈압 전단계'; }
      else if (s >= 120) { bpLevel = 'warn'; bpLabel = '주의혈압'; }
      else { bpLevel = 'ok'; bpLabel = '정상'; }
      var bpMax = 200;
      var pos = sbp != null ? sbp : d;
      push({
        id: 'bp', name: '혈압 (수축기/이완기)', group: 'bp', unit: 'mmHg',
        value: pos, display: (sbp == null ? '—' : sbp) + '/' + (dbp == null ? '—' : dbp),
        level: bpLevel, label: bpLabel,
        ref: '정상 <120/<80 · 전단계 130~139/80~89 · 고혈압 ≥140/90', digits: 0,
        min: 80, max: bpMax,
        zones: [{ to: 120, c: 'ok' }, { to: 140, c: 'warn' }, { to: bpMax, c: 'bad' }],
        tip: bgTip(bpLevel)
      });
    }

    return out;
  }

  function bgTip(level) {
    if (level === 'bad') return '고혈압은 증상이 없어도 혈관·신장·눈을 서서히 망칩니다. 같은 날 다시 재고, 2주간 가정혈압을 기록해 진료 시 보여 주세요.';
    if (level === 'warn') return '전단계는 생활습관으로 되돌릴 수 있는 구간입니다. 나트륨을 하루 2,000mg 이하로 줄이고, 5% 감량 + 주 150분 유산소를 시작해 보세요.';
    return '정상 범위입니다. 가정혈압은 135/85 미만이 목표이며, 커피·흡연 직후 측정은 피하세요.';
  }

  /* ---------- 렌더 ---------- */
  function zoneHTML(m) {
    var span = m.max - m.min || 1;
    var html = '';
    var prev = m.min;
    m.zones.forEach(function (z) {
      var to = Math.min(Math.max(z.to, m.min), m.max);
      var w = ((to - prev) / span) * 100;
      if (w > 0) html += '<span class="mrow__zone mrow__zone--' + z.c + '" style="width:' + w.toFixed(3) + '%"></span>';
      prev = Math.max(prev, to);
    });
    var p = ((Math.min(Math.max(m.value, m.min), m.max) - m.min) / span) * 100;
    html += '<span class="mrow__pin" style="left:' + p.toFixed(2) + '%"></span>';
    return html;
  }

  function mrowHTML(m) {
    var valText = m.display != null ? m.display : fmt(m.value, m.digits);
    return '' +
      '<div class="mrow">' +
        '<div class="mrow__top">' +
          '<span class="mrow__name">' + m.name + '</span>' +
          badge(m.level, m.label) +
          '<span class="mrow__val">' + valText + '<small>' + m.unit + '</small></span>' +
        '</div>' +
        '<div class="mrow__scale">' + zoneHTML(m) + '</div>' +
        '<div class="mrow__foot"><span class="mrow__ref">' + m.ref + '</span>' +
          (m.auto ? '<span class="badge badge--accent">크레아티닌으로 자동 계산</span>' : '') +
        '</div>' +
        (m.level !== 'ok' ? '<p class="mrow__tip">' + m.tip + '</p>' : '') +
      '</div>';
  }

  var GROUPS = [
    { key: 'liver', title: '간 기능', icon: '🫀' },
    { key: 'lipid', title: '지질 (콜레스테롤)', icon: '🩸' },
    { key: 'kidney', title: '신장 · 요산', icon: '💧' },
    { key: 'bp', title: '혈압', icon: '📈' }
  ];

  var lastResult = null;

  function render() {
    var metrics = buildMetrics();
    var age = num('age');

    if (!metrics.length) {
      resultEl.innerHTML = '' +
        '<div class="result__empty reveal">' +
          '<span class="result__empty-icon" aria-hidden="true">✍️</span>' +
          '<strong>아직 넣은 수치가 없어요</strong>' +
          '<span>검진표에서 항목 하나만 옮겨 적어도 바로 풀이해 드립니다. 빈 칸은 그대로 두세요.</span>' +
        '</div>';
      lastResult = null;
      return;
    }

    var bads = metrics.filter(function (m) { return m.level === 'bad'; });
    var warns = metrics.filter(function (m) { return m.level === 'warn'; });
    var oks = metrics.filter(function (m) { return m.level === 'ok'; });

    var vCls, vIcon, vTitle, vDesc;
    if (bads.length) {
      vCls = 'verdict--bad'; vIcon = '🔴';
      vTitle = '관리 필요 ' + bads.length + '개 항목';
      vDesc = bads.map(function (m) { return m.name.replace(/ \(.*\)/, ''); }).join(' · ') + ' — 생활습관 교정과 진료 상담이 필요한 구간이에요.';
    } else if (warns.length) {
      vCls = 'verdict--warn'; vIcon = '🟡';
      vTitle = '경계 ' + warns.length + '개 항목';
      vDesc = warns.map(function (m) { return m.name.replace(/ \(.*\)/, ''); }).join(' · ') + ' — 지금 잡으면 정상으로 되돌릴 수 있는 구간입니다.';
    } else {
      vCls = 'verdict--ok'; vIcon = '🟢';
      vTitle = '모두 정상 범위';
      vDesc = '넣어 주신 ' + metrics.length + '개 항목이 모두 정상 범위입니다. 다음 검진까지 지금 습관을 유지하세요.';
    }

    var html = '<div class="result reveal">' +
      '<div class="verdict ' + vCls + '">' +
        '<span class="verdict__icon" aria-hidden="true">' + vIcon + '</span>' +
        '<div class="verdict__body">' +
          '<p class="verdict__kicker">10초 해독 결과 · ' + metrics.length + '개 항목</p>' +
          '<p class="verdict__title">' + vTitle + '</p>' +
          '<p class="verdict__desc">' + vDesc + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="counts">' +
        '<div class="count count--ok"><b>' + oks.length + '</b><span>정상</span></div>' +
        '<div class="count count--warn"><b>' + warns.length + '</b><span>경계</span></div>' +
        '<div class="count count--bad"><b>' + bads.length + '</b><span>관리 필요</span></div>' +
      '</div>';

    GROUPS.forEach(function (g) {
      var rows = metrics.filter(function (m) { return m.group === g.key; });
      if (!rows.length) return;
      var worst = rows.some(function (m) { return m.level === 'bad'; }) ? 'bad'
        : rows.some(function (m) { return m.level === 'warn'; }) ? 'warn' : 'ok';
      html += '<div class="card">' +
        '<div class="card__head">' +
          '<span class="card__icon" aria-hidden="true">' + g.icon + '</span>' +
          '<span class="card__title">' + g.title + '</span>' +
          '<span class="card__note">' + (worst === 'bad' ? '관리 필요' : worst === 'warn' ? '경계' : '정상') + '</span>' +
        '</div>' +
        '<div class="metrics">' + rows.map(mrowHTML).join('') + '</div>' +
      '</div>';
    });

    // 오늘부터 할 일
    var focus = bads.concat(warns).slice(0, 4);
    if (focus.length) {
      html += '<div class="card">' +
        '<div class="card__head"><span class="card__icon" aria-hidden="true">✅</span><span class="card__title">오늘부터 할 수 있는 것</span></div>' +
        '<div class="tips">' +
          focus.map(function (m, i) {
            return '<div class="tip"><span class="tip__n">' + (i + 1) + '</span><span class="tip__text"><b>' + m.name.replace(/ \(.*\)/, '') + '</b> — ' + m.tip + '</span></div>';
          }).join('') +
        '</div>' +
      '</div>';
    }

    // 병원에서 물어볼 것
    var asks = [];
    if (bads.length) asks.push('이번에 관리 필요로 나온 항목(' + bads.map(function (m) { return m.name.replace(/ \(.*\)/, ''); }).join(', ') + ')의 원인 검사가 필요한가요?');
    if (metrics.some(function (m) { return m.id === 'ast' || m.id === 'alt' || m.id === 'ggt'; }) && (bads.length || warns.length)) asks.push('지방간 초음파나 B형·C형 간염 검사를 함께 받아야 하나요?');
    if (metrics.some(function (m) { return m.id === 'ldl' && m.level !== 'ok'; })) asks.push('제 나이·혈압·가족력 기준으로 LDL 목표치는 몇 이하인가요?');
    if (metrics.some(function (m) { return m.id === 'egfr' && m.level !== 'ok'; })) asks.push('소변 단백뇨(알부민/크레아티닌 비) 검사를 추가로 받을 수 있나요?');
    if (!asks.length) asks.push('이번 결과에서 추적 검사가 필요한 항목이 있나요? 1년 뒤 검진까지 신경 쓸 것은 무엇인가요?');
    asks = asks.slice(0, 3);

    html += '<div class="card" style="background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 30%,var(--line))">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">🩺</span><span class="card__title">진료실에서 이렇게 물어보세요</span></div>' +
      '<div class="tips">' + asks.map(function (a, i) {
        return '<div class="tip"><span class="tip__n">' + (i + 1) + '</span><span class="tip__text">' + a + '</span></div>';
      }).join('') + '</div>' +
    '</div>';

    html += '<div class="row-between">' +
      '<button class="btn btn--sm" type="button" id="copyBtn">결과 복사</button>' +
      '<button class="btn btn--sm btn--ghost" type="button" id="editBtn">수치 수정하기</button>' +
    '</div>' +
    '<p class="disclaimer"><b>참고용 안내</b> — 이 판정은 국가건강검진 기준으로 수치를 분류한 것이며 진단이 아닙니다. 같은 수치도 나이·병력·복용 약에 따라 의미가 달라지므로, 이상 소견은 담당 의사와 상담하세요.</p>' +
    '</div>';

    resultEl.innerHTML = html;
    lastResult = { metrics: metrics, verdict: vTitle, asks: asks };

    var copyBtn = document.getElementById('copyBtn');
    if (copyBtn) copyBtn.addEventListener('click', copyResult);
    var editBtn = document.getElementById('editBtn');
    if (editBtn) editBtn.addEventListener('click', function () {
      document.getElementById('tool').scrollIntoView({ behavior: 'smooth', block: 'start' });
      var first = form.querySelector('.input');
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 350);
    });

    if (window.innerWidth < 980) {
      setTimeout(function () {
        var top = resultEl.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }, 60);
    }
  }

  function copyResult() {
    if (!lastResult) return;
    var lines = ['[건강검진표 10초 해독] ' + lastResult.verdict];
    lastResult.metrics.forEach(function (m) {
      var v = m.display != null ? m.display : fmt(m.value, m.digits);
      lines.push('· ' + m.name + ': ' + v + ' ' + m.unit + ' — ' + m.label);
    });
    lines.push('', '팩트체크 건강연구소 건강검진 해독기 https://hjh7085-bit.github.io/checkup-lab/');
    var text = lines.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('결과를 복사했어요'); }, fallback);
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('결과를 복사했어요'); } catch (e) { toast('복사가 막혀 있어요'); }
      document.body.removeChild(ta);
    }
  }

  function analyze() {
    var any = ['ast', 'alt', 'ggt', 'tc', 'ldl', 'hdl', 'tg', 'cr', 'egfr', 'ua', 'sbp', 'dbp'].some(function (id) { return num(id) != null; });
    if (!any) {
      toast('검진표 수치를 하나 이상 넣어 주세요');
      var first = form.querySelector('.input');
      if (first) first.focus();
      return;
    }
    // 범위 이상값 표시
    document.querySelectorAll('.input').forEach(function (el) { el.classList.remove('is-error'); });
    [['sbp', 300], ['dbp', 200], ['tc', 1000], ['ldl', 800], ['tg', 3000], ['ast', 5000], ['alt', 5000], ['ggt', 5000], ['cr', 20], ['ua', 30]].forEach(function (p) {
      var v = num(p[0]);
      if (v != null && v > p[1]) {
        var el = document.getElementById(p[0]);
        if (el) el.classList.add('is-error');
      }
    });
    render();
  }

  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); analyze(); });
  var bar = document.getElementById('analyzeBar');
  if (bar) bar.addEventListener('click', analyze);
  var reset = document.getElementById('resetBtn');
  if (reset) reset.addEventListener('click', function () {
    form.reset();
    document.querySelectorAll('.input').forEach(function (el) { el.classList.remove('is-error'); });
    state.sex = 'male';
    document.querySelectorAll('[data-sex]').forEach(function (b, i) {
      b.classList.toggle('is-on', i === 0);
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
    });
    resultEl.innerHTML = '<div class="result__empty"><span class="result__empty-icon" aria-hidden="true">🧪</span><strong>수치를 넣으면 여기에 판정이 나옵니다</strong><span>검진표에서 확인하고 싶은 항목만 넣어도 됩니다.</span></div>';
    lastResult = null;
    toast('입력을 지웠어요');
  });

  // 엔터로 분석
  form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.classList.contains('input')) {
      e.preventDefault(); analyze();
    }
  });
})();
