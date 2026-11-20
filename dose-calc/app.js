/* ==========================================================================
   마운자로·위고비 월 순지출 & 주사일 트래커 — dose-calc/app.js
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

  /* ---------- 데이터 ---------- */
  var DRUGS = {
    mounjaro: {
      name: '마운자로',
      generic: '터제파타이드',
      doses: [
        { mg: 2.5, price: 297000 },
        { mg: 5, price: 391000 },
        { mg: 7.5, price: 548000 },
        { mg: 10, price: 545000 }
      ],
      note: '마운자로 4주분(1펜) 전국 평균 약값 기준. 2.5mg 약 29.7만 · 5mg 39.1만 · 7.5mg 54.8만 · 10mg 54.5만 원.'
    },
    wegovy: {
      name: '위고비',
      generic: '세마글루타이드',
      doses: [
        { mg: 0.25, price: 246000 },
        { mg: 0.5, price: 264000 },
        { mg: 1.0, price: 285000 },
        { mg: 1.7, price: 360000 },
        { mg: 2.4, price: 410000 }
      ],
      note: '위고비 1펜(4회분=4주) 전국 평균 약값 기준. 0.25mg 약 24.6만 · 0.5mg 26.4만 · 1.0mg 28.5만 · 1.7mg 36만 · 2.4mg 41만 원.'
    },
    custom: {
      name: '직접 입력',
      generic: '',
      doses: [],
      note: '다른 약제(삭센다·젭바운드 등)는 1회 용량과 월 약값을 직접 넣어 주세요. 주 1회 제품 기준으로 mg당 단가를 계산합니다.'
    }
  };

  var SITES = [
    { id: 'abd-l', label: '복부 좌', mark: '←' },
    { id: 'abd-r', label: '복부 우', mark: '→' },
    { id: 'thigh-l', label: '허벅지 좌', mark: '←' },
    { id: 'thigh-r', label: '허벅지 우', mark: '→' }
  ];

  var STORE = 'fchl-dose-v1';
  var state = { drug: 'mounjaro', history: [] };

  var $ = function (id) { return document.getElementById(id); };
  var form = $('doseForm');
  var resultEl = $('result');

  /* ---------- 저장/복원 ---------- */
  function saveState() {
    var data = {
      drug: state.drug,
      history: state.history,
      doseMg: $('doseMg').value,
      drugCost: $('drugCost').value,
      clinicCost: $('clinicCost').value,
      saveDelivery: $('saveDelivery').value,
      saveDining: $('saveDining').value,
      saveAlcohol: $('saveAlcohol').value,
      lastShot: $('lastShot').value
    };
    try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) {}
  }
  function loadState() {
    var raw = null;
    try { raw = localStorage.getItem(STORE); } catch (e) {}
    if (!raw) return;
    var d;
    try { d = JSON.parse(raw); } catch (e) { return; }
    if (!d) return;
    if (d.drug && DRUGS[d.drug]) state.drug = d.drug;
    if (Array.isArray(d.history)) state.history = d.history.filter(function (h) { return h && h.date; });
    ['doseMg', 'drugCost', 'clinicCost', 'saveDelivery', 'saveDining', 'saveAlcohol', 'lastShot'].forEach(function (k) {
      if (d[k] != null && $(k)) {
        if (MONEY_IDS.indexOf(k) >= 0) setMoney(k, String(d[k]).replace(/[^0-9]/g, ''));
        else $(k).value = d[k];
      }
    });
  }

  /* ---------- 유틸 ---------- */
  function won(v) {
    var n = Math.round(Number(v) || 0);
    return n.toLocaleString('ko-KR');
  }
  var MONEY_IDS = ['drugCost', 'clinicCost', 'saveDelivery', 'saveDining', 'saveAlcohol'];
  function fmtMoney(el) {
    var raw = String(el.value || '').replace(/[^0-9]/g, '');
    if (raw === '') { el.value = ''; return; }
    el.value = Number(raw).toLocaleString('ko-KR');
  }
  function setMoney(id, v) {
    var el = $(id);
    if (!el) return;
    el.value = v === '' || v == null ? '' : Number(v).toLocaleString('ko-KR');
  }

  function numVal(id) {
    var el = $(id);
    if (!el) return 0;
    var v = parseFloat(String(el.value || '').replace(/,/g, ''));
    return isFinite(v) && v > 0 ? v : 0;
  }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function parseDate(s) {
    if (!s) return null;
    var p = s.split('-');
    if (p.length !== 3) return null;
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
  function fmtDate(d) {
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  }
  function weekday(d) {
    return ['일', '월', '화', '수', '목', '금', '토'][d.getDay()] + '요일';
  }

  /* ---------- 용량 프리셋 ---------- */
  function renderDoseChips() {
    var box = $('doseChips');
    var drug = DRUGS[state.drug];
    if (!drug.doses.length) {
      box.innerHTML = '<span class="small muted">용량을 직접 입력해 주세요</span>';
      return;
    }
    var current = parseFloat($('doseMg').value);
    box.innerHTML = drug.doses.map(function (d) {
      var on = Math.abs(d.mg - current) < 0.001;
      return '<button class="preset' + (on ? ' is-on' : '') + '" type="button" data-mg="' + d.mg + '" data-price="' + d.price + '">' +
        d.mg + 'mg · ' + (d.price / 10000).toFixed(1) + '만</button>';
    }).join('');
    box.querySelectorAll('.preset').forEach(function (b) {
      b.addEventListener('click', function () {
        $('doseMg').value = b.getAttribute('data-mg');
        setMoney('drugCost', b.getAttribute('data-price'));
        renderDoseChips();
        saveState();
        render(true);
      });
    });
  }

  function setDrug(key, keepValues) {
    state.drug = key;
    document.querySelectorAll('#drugSeg [data-drug]').forEach(function (b) {
      var on = b.getAttribute('data-drug') === key;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var drug = DRUGS[key];
    $('presetNote').innerHTML = '참고가: ' + drug.note + ' 비급여라 약국·병원마다 차이가 크니 실제 결제액으로 수정하세요.';
    if (!keepValues) {
      if (drug.doses.length) {
        var first = drug.doses[0];
        var cur = parseFloat($('doseMg').value);
        var match = drug.doses.filter(function (d) { return Math.abs(d.mg - cur) < 0.001; })[0];
        if (!match) {
          $('doseMg').value = first.mg;
          setMoney('drugCost', first.price);
        }
      } else {
        $('doseMg').value = '';
        setMoney('drugCost', '');
      }
    }
    $('priceHint').innerHTML = drug.doses.length
      ? '프리셋을 고르면 전국 평균 참고값이 들어갑니다. 실제 결제액으로 고쳐 주세요.'
      : '월 약값을 직접 입력하면 mg당 단가와 순지출을 계산합니다.';
    renderDoseChips();
    saveState();
    render(true);
  }

  /* ---------- 주사 기록 ---------- */
  function sortedHistory() {
    return state.history.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }
  function addShot(date, site) {
    state.history = state.history.filter(function (h) { return h.date !== date; });
    state.history.push({ date: date, site: site });
    state.history = sortedHistory().slice(0, 12);
  }
  function lastSiteUsed() {
    var h = sortedHistory();
    return h.length ? h[0].site : null;
  }
  function recommendedSite() {
    var last = lastSiteUsed();
    if (!last) return SITES[0].id;
    var idx = SITES.map(function (s) { return s.id; }).indexOf(last);
    return SITES[(idx + 1) % SITES.length].id;
  }
  function siteLabel(id) {
    var s = SITES.filter(function (x) { return x.id === id; })[0];
    return s ? s.label : '—';
  }

  /* ---------- 계산 & 렌더 ---------- */
  var lastText = '';

  function calc() {
    var drug = DRUGS[state.drug];
    var doseMg = parseFloat($('doseMg').value) || 0;
    var drugCost = numVal('drugCost');
    var clinicCost = numVal('clinicCost');
    var delivery = numVal('saveDelivery');
    var dining = numVal('saveDining');
    var alcohol = numVal('saveAlcohol');
    var saved = delivery + dining + alcohol;
    var gross = drugCost + clinicCost;
    var net = gross - saved;
    var monthlyMg = doseMg * 4;
    var perMg = monthlyMg > 0 ? drugCost / monthlyMg : 0;
    var preset = drug.doses.filter(function (d) { return Math.abs(d.mg - doseMg) < 0.001; })[0];
    return {
      drug: drug, doseMg: doseMg, drugCost: drugCost, clinicCost: clinicCost,
      saved: saved, parts: { delivery: delivery, dining: dining, alcohol: alcohol },
      gross: gross, net: net, perMg: perMg, monthlyMg: monthlyMg,
      recovery: gross > 0 ? (saved / gross) * 100 : 0,
      preset: preset
    };
  }

  function ddayInfo() {
    var last = parseDate($('lastShot').value);
    if (!last) return null;
    var today = parseDate(todayISO());
    var since = daysBetween(last, today);
    var next = new Date(last.getTime());
    next.setDate(next.getDate() + 7);
    var remain = daysBetween(today, next);
    return { last: last, next: next, since: since, remain: remain };
  }

  function render(scroll) {
    var c = calc();

    if (!c.drugCost) {
      resultEl.innerHTML = '<div class="result__empty">' +
        '<span class="result__empty-icon" aria-hidden="true">💉</span>' +
        '<strong>약값을 넣으면 순지출이 계산됩니다</strong>' +
        '<span>용량을 고르면 참고 약값이 자동으로 들어가요. 마지막 주사일을 넣으면 다음 주사일과 부위도 알려드립니다.</span>' +
        '</div>';
      lastText = '';
      return;
    }

    var netGood = c.net <= 0;
    var vCls = netGood ? 'verdict--ok' : c.recovery >= 30 ? 'verdict--warn' : 'verdict--info';
    var vIcon = netGood ? '🟢' : c.recovery >= 30 ? '🟡' : '💳';
    var vTitle = netGood ? '순이득 ' + won(Math.abs(c.net)) + '원' : '월 순지출 ' + won(c.net) + '원';
    var vDesc = netGood
      ? '줄어든 지출이 약값·진료비를 모두 덮었습니다. ' + won(c.saved) + '원을 아껴서 실제로는 돈이 남는 구조예요.'
      : '약값·진료비 ' + won(c.gross) + '원에서 줄어든 지출 ' + won(c.saved) + '원을 뺀 금액입니다.';

    var html = '<div class="result reveal">' +
      '<div class="verdict ' + vCls + '">' +
        '<span class="verdict__icon" aria-hidden="true">' + vIcon + '</span>' +
        '<div class="verdict__body">' +
          '<p class="verdict__kicker">' + c.drug.name + ' ' + (c.doseMg ? c.doseMg + 'mg' : '') + ' · 4주 기준</p>' +
          '<p class="verdict__title">' + vTitle + '</p>' +
          '<p class="verdict__desc">' + vDesc + '</p>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card__head"><span class="card__icon" aria-hidden="true">🧾</span><span class="card__title">한 달 계산서</span></div>' +
        '<div class="kv">' +
          '<div class="kv__row"><span class="kv__k">월 약값 (4주분)</span><span class="kv__v">' + won(c.drugCost) + '원</span></div>' +
          (c.clinicCost > 0 ? '<div class="kv__row"><span class="kv__k">진료·검사비</span><span class="kv__v">' + won(c.clinicCost) + '원</span></div>' : '') +
          '<div class="kv__row"><span class="kv__k">합계</span><span class="kv__v">' + won(c.gross) + '원</span></div>' +
          '<div class="kv__row"><span class="kv__k">− 배달·포장 절감</span><span class="kv__v ' + (c.parts.delivery ? 'is-good' : '') + '">' + (c.parts.delivery ? '−' + won(c.parts.delivery) + '원' : '—') + '</span></div>' +
          '<div class="kv__row"><span class="kv__k">− 외식·카페 절감</span><span class="kv__v ' + (c.parts.dining ? 'is-good' : '') + '">' + (c.parts.dining ? '−' + won(c.parts.dining) + '원' : '—') + '</span></div>' +
          '<div class="kv__row"><span class="kv__k">− 술·야식 절감</span><span class="kv__v ' + (c.parts.alcohol ? 'is-good' : '') + '">' + (c.parts.alcohol ? '−' + won(c.parts.alcohol) + '원' : '—') + '</span></div>' +
          '<div class="kv__row kv__row--total"><span class="kv__k">월 순지출</span><span class="kv__v ' + (netGood ? 'is-good' : '') + '">' + won(c.net) + '원</span></div>' +
        '</div>' +
        '<p class="field__hint mt-8">줄어든 지출이 약값·진료비의 <b>' + Math.round(c.recovery) + '%</b>를 덮었습니다. 연간으로는 <b>' + won(c.net * 12) + '원</b>입니다.</p>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card__head"><span class="card__icon" aria-hidden="true">⚖️</span><span class="card__title">1mg당 단가</span><span class="card__note">약값 ÷ (용량×4회)</span></div>' +
        '<div class="big-number">' + (c.perMg ? won(c.perMg) : '—') + '<small>원 / 1mg</small></div>' +
        '<div class="kv mt-8">' +
          '<div class="kv__row"><span class="kv__k">한 달 사용량</span><span class="kv__v">' + (c.monthlyMg ? c.monthlyMg + 'mg' : '—') + ' <small>(1회 ' + (c.doseMg || '—') + 'mg × 4회)</small></span></div>' +
          '<div class="kv__row"><span class="kv__k">1회분 약값</span><span class="kv__v">' + won(c.drugCost / 4) + '원</span></div>' +
          (c.preset ? '<div class="kv__row"><span class="kv__k">같은 용량 전국 평균</span><span class="kv__v">' + won(c.preset.price) + '원</span></div>' : '') +
        '</div>' +
        (c.preset ? '<p class="field__hint mt-8">' + (c.drugCost > c.preset.price
          ? '평균보다 <b>' + won(c.drugCost - c.preset.price) + '원</b> 비싸게 사고 있어요. 약국을 한 곳만 바꿔도 연 <b>' + won((c.drugCost - c.preset.price) * 12) + '원</b> 차이입니다.'
          : c.drugCost < c.preset.price
            ? '평균보다 <b>' + won(c.preset.price - c.drugCost) + '원</b> 저렴하게 사고 있어요. 연 <b>' + won((c.preset.price - c.drugCost) * 12) + '원</b> 아끼는 셈입니다.'
            : '전국 평균과 같은 가격입니다.') + '</p>' : '') +
      '</div>';

    // D-day
    var dd = ddayInfo();
    if (dd) {
      var nextSite = recommendedSite();
      var lastSite = lastSiteUsed();
      var ddClass = dd.remain > 0 ? 'verdict--info' : dd.remain === 0 ? 'verdict--warn' : 'verdict--bad';
      html += '<div class="card">' +
        '<div class="card__head"><span class="card__icon" aria-hidden="true">📅</span><span class="card__title">다음 주사</span><span class="card__note">' + fmtDate(dd.next) + ' ' + weekday(dd.next) + '</span></div>' +
        '<div class="dday">' +
          '<div class="dday__num">' + (dd.remain > 0 ? 'D-' + dd.remain : dd.remain === 0 ? 'D-0' : 'D+' + (-dd.remain)) + '</div>' +
          '<div class="dday__body">' +
            '<p class="dday__title">' + (dd.remain > 0 ? '다음 주사까지 ' + dd.remain + '일' : dd.remain === 0 ? '오늘이 주사일이에요' : '주사일이 ' + (-dd.remain) + '일 지났어요') + '</p>' +
            '<p class="dday__sub">마지막 주사 ' + fmtDate(dd.last) + ' (' + dd.since + '일 전) · 7일 간격 기준</p>' +
          '</div>' +
        '</div>' +
        '<div class="bar mt-12"><div class="bar__top"><span>이번 주기 진행</span><b>' + Math.min(7, Math.max(0, dd.since)) + ' / 7일</b></div>' +
          '<div class="bar__track"><span class="bar__fill bar__fill--accent" style="width:' + Math.min(100, Math.max(0, dd.since / 7 * 100)) + '%"></span></div>' +
        '</div>' +
        (dd.since > 10 ? '<p class="field__hint mt-8" style="color:var(--amber)"><b>간격이 10일 넘게 벌어졌습니다.</b> 마운자로는 예정일에서 4일(96시간), 위고비는 5일을 넘기면 건너뛰고 다음 예정일에 맞추는 것이 허가사항 기준입니다. 처방 의사와 상담하세요.</p>' : '') +
        '<div class="divider mt-12"></div>' +
        '<div class="row-between"><p class="field__label" style="margin:0">다음 주사 부위</p><span class="badge badge--accent">' + siteLabel(nextSite) + ' 추천</span></div>' +
        '<div class="site-grid mt-8">' +
          SITES.map(function (s) {
            var cls = 'site' + (s.id === nextSite ? ' is-next' : '') + (s.id === lastSite ? ' is-used' : '');
            return '<div class="' + cls + '"><span aria-hidden="true">◉</span>' + s.label.replace(' ', '<br>') + '</div>';
          }).join('') +
        '</div>' +
        '<p class="field__hint mt-8">마지막으로 쓴 부위는 흐리게 표시됩니다. 복부는 배꼽에서 5cm 이상 떨어진 곳, 허벅지는 앞·바깥쪽에 놓으세요.</p>' +
        '<div class="row-between mt-12">' +
          '<button class="btn btn--sm" type="button" id="recordBtn">' + siteLabel(nextSite) + '에 주사 기록</button>' +
        '</div>' +
      '</div>';

      var hist = sortedHistory();
      if (hist.length) {
        html += '<div class="card">' +
          '<div class="card__head"><span class="card__icon" aria-hidden="true">🗂️</span><span class="card__title">주사 기록</span><span class="card__note">최근 ' + Math.min(6, hist.length) + '회</span></div>' +
          '<div class="history">' + hist.slice(0, 6).map(function (h, i) {
            var d = parseDate(h.date);
            return '<div class="hrow">' +
              '<span class="hrow__date">' + (d ? fmtDate(d) : h.date) + '</span>' +
              '<span class="hrow__site">' + siteLabel(h.site) + '</span>' +
              (i === 0 ? '<span class="badge badge--accent hrow__badge">최근</span>' : '') +
              '<button class="hrow__del" type="button" data-del="' + h.date + '" aria-label="' + h.date + ' 기록 삭제">✕</button>' +
            '</div>';
          }).join('') + '</div>' +
        '</div>';
      }
    } else {
      html += '<div class="card" style="border-style:dashed">' +
        '<div class="card__head"><span class="card__icon" aria-hidden="true">📅</span><span class="card__title">주사일 트래커</span></div>' +
        '<p class="field__hint">마지막 주사한 날을 넣으면 <b>다음 주사 D-day</b>와 <b>부위 로테이션</b>을 알려드려요. 기록은 이 브라우저에만 저장됩니다.</p>' +
      '</div>';
    }

    // 팁
    var tips = [];
    if (c.recovery >= 100) tips.push('줄어든 지출이 약값을 넘었습니다. 다만 단백질 섭취가 부족하면 근손실이 올 수 있으니, <b>체중 1kg당 1.2~1.6g 단백질</b>은 챙기세요.');
    else if (c.recovery >= 30) tips.push('절감액이 약값의 ' + Math.round(c.recovery) + '%를 덮고 있습니다. 남은 ' + won(c.net) + '원이 실제 부담이에요.');
    else tips.push('절감액이 아직 적다면 배달·야식 지출을 한 달만 기록해 보세요. 숫자가 보이면 줄이기 쉬워집니다.');
    if (c.preset && c.drug.doses.length > 1) {
      var nextDose = c.drug.doses.filter(function (d) { return d.mg > c.doseMg; }).sort(function (a, b) { return a.mg - b.mg; })[0];
      if (nextDose) {
        var nextPerMg = nextDose.price / (nextDose.mg * 4);
        tips.push('같은 약 <b>' + nextDose.mg + 'mg</b>로 올리면 1mg당 <b>' + won(nextPerMg) + '원</b>(' + (nextPerMg <= c.perMg ? '더 저렴' : '더 비쌈') + ')입니다. 증량은 효과·부작용을 보고 처방 의사가 결정합니다.');
      }
    }
    tips.push('약값은 같은 용량도 약국마다 2~4만 원 차이가 납니다. 3개월 이상 맞는다면 집 근처 2~3곳 가격을 한 번 비교해 보세요.');
    html += '<div class="card">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">💡</span><span class="card__title">이 숫자를 어떻게 쓸까</span></div>' +
      '<div class="tips">' + tips.map(function (t, i) {
        return '<div class="tip"><span class="tip__n">' + (i + 1) + '</span><span class="tip__text">' + t + '</span></div>';
      }).join('') + '</div>' +
      '<button class="btn btn--sm btn--block mt-12" type="button" id="copyBtn">계산 결과 복사</button>' +
    '</div>';

    html += '<p class="disclaimer"><b>참고용 안내</b> — 약값은 2026-11 공개가 평균이며 실제 결제액과 다를 수 있습니다. 이 도구는 비용·일정 기록용이고, 용량 변경이나 투여 간격 조정은 반드시 처방 의사와 상담하세요.</p>' +
    '</div>';

    resultEl.innerHTML = html;

    var recordBtn = $('recordBtn');
    if (recordBtn) recordBtn.addEventListener('click', function () {
      addShot(todayISO(), recommendedSite());
      $('lastShot').value = todayISO();
      saveState();
      render(false);
      toast(siteLabel(lastSiteUsed()) + ' 주사를 기록했어요');
    });
    var copyBtn = $('copyBtn');
    if (copyBtn) copyBtn.addEventListener('click', function () { copy(c); });
    resultEl.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        var date = b.getAttribute('data-del');
        state.history = state.history.filter(function (h) { return h.date !== date; });
        if ($('lastShot').value === date) $('lastShot').value = state.history.length ? sortedHistory()[0].date : '';
        saveState();
        render(false);
        toast('기록을 삭제했어요');
      });
    });

    lastText = buildText(c, dd);
    if (scroll && window.innerWidth < 980) {
      var top = resultEl.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  function buildText(c, dd) {
    var lines = ['[' + c.drug.name + ' ' + (c.doseMg || '') + 'mg 월 순지출]'];
    lines.push('월 약값 ' + won(c.drugCost) + '원' + (c.clinicCost ? ' + 진료·검사 ' + won(c.clinicCost) + '원' : ''));
    lines.push('− 줄어든 지출 ' + won(c.saved) + '원 = 순지출 ' + won(c.net) + '원');
    lines.push('1mg당 단가 ' + (c.perMg ? won(c.perMg) + '원' : '—'));
    if (dd) lines.push('다음 주사 ' + fmtDate(dd.next) + ' (' + (dd.remain > 0 ? 'D-' + dd.remain : dd.remain === 0 ? '오늘' : 'D+' + (-dd.remain)) + '), 부위 ' + siteLabel(recommendedSite()));
    lines.push('', '팩트체크 건강연구소 순지출 계산기 https://hjh7085-bit.github.io/dose-calc/');
    return lines.join('\n');
  }

  function copy(c) {
    var text = lastText || buildText(c, ddayInfo());
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

  /* ---------- 이벤트 ---------- */
  document.querySelectorAll('#drugSeg [data-drug]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.getAttribute('data-drug') === state.drug) return;
      setDrug(b.getAttribute('data-drug'));
    });
  });

  ['doseMg', 'drugCost', 'clinicCost', 'saveDelivery', 'saveDining', 'saveAlcohol', 'lastShot'].forEach(function (id) {
    var el = $(id);
    if (!el) return;
    el.addEventListener('input', function () {
      if (MONEY_IDS.indexOf(id) >= 0) fmtMoney(el);
      if (id === 'doseMg' && DRUGS[state.drug].doses.length) {
        var mg = parseFloat(el.value);
        var match = DRUGS[state.drug].doses.filter(function (d) { return Math.abs(d.mg - mg) < 0.001; })[0];
        if (match && numVal('drugCost') !== match.price) setMoney('drugCost', match.price);
        document.querySelectorAll('#doseChips .preset').forEach(function (p) {
          p.classList.toggle('is-on', Math.abs(parseFloat(p.getAttribute('data-mg')) - mg) < 0.001);
        });
      }
      saveState();
      render(false);
    });
    el.addEventListener('change', function () { saveState(); render(false); });
  });

  var todayBtn = $('todayBtn');
  if (todayBtn) todayBtn.addEventListener('click', function () {
    var d = todayISO();
    $('lastShot').value = d;
    addShot(d, recommendedSite());
    saveState();
    render(false);
    toast(fmtDate(parseDate(d)) + ' · ' + siteLabel(lastSiteUsed()) + ' 기록 완료');
  });

  var resetBtn = $('resetBtn');
  if (resetBtn) resetBtn.addEventListener('click', function () {
    if (!window.confirm('저장된 입력값과 주사 기록을 모두 지울까요?')) return;
    state.history = [];
    form.reset();
    ['doseMg', 'drugCost', 'saveDelivery', 'saveDining', 'saveAlcohol', 'lastShot'].forEach(function (id) { if ($(id)) $(id).value = ''; });
    if ($('clinicCost')) setMoney('clinicCost', 20000);
    try { localStorage.removeItem(STORE); } catch (e) {}
    setDrug('mounjaro');
    toast('기록을 초기화했어요');
  });

  var calcBar = $('calcBar');
  if (calcBar) calcBar.addEventListener('click', function () {
    if (!numVal('drugCost')) {
      toast('월 약값을 먼저 넣어 주세요');
      $('drugCost').focus();
      return;
    }
    render(true);
  });

  form.addEventListener('submit', function (e) { e.preventDefault(); render(true); });

  /* ---------- 초기화 ---------- */
  if ($('lastShot')) $('lastShot').max = todayISO();
  loadState();
  setDrug(state.drug, true);
  if (!numVal('drugCost') && DRUGS[state.drug].doses.length) {
    var d0 = DRUGS[state.drug].doses[0];
    $('doseMg').value = d0.mg;
    setMoney('drugCost', d0.price);
    renderDoseChips();
  }
  if (state.history.length && !$('lastShot').value) {
    $('lastShot').value = sortedHistory()[0].date;
  }
  render(false);
})();
