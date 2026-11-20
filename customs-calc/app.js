/* ==========================================================================
   팩트체크 건강연구소 — 해외직구 6병·관세 컷 계산기
   계산 로직 + UI
   --------------------------------------------------------------------------
   근거
   - 「관세법」 제94조 제4호 / 시행규칙 제45조 : 자가사용 소액물품 면세
   - 「수입통관 사무처리에 관한 고시」 제67조·별표11 : 건강기능식품 자가사용 = 총 6병
   - 「특송물품 수입통관 사무처리에 관한 고시」 별표1 : 건강기능식품은 목록통관 배제
   - 관세청 : 목록통관 미화 150달러 이하(미국발 200달러), 물품가격 정의, 초과 시 전액 과세
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------ 상수 ------------------------------ */
  var DEFAULT_RATE = 1336;          // 실시간 환율 실패 시 기본값 (참고용)
  var LIMIT_SUPP_USD = 150;         // 건기식: 목록통관 배제 → 발송국 무관 150달러
  var LIMIT_GEN_US_USD = 200;       // 일반 소비재: 미국발 특송 목록통관
  var LIMIT_GEN_OTHER_USD = 150;    // 일반 소비재: 그 외 국가
  var BOTTLE_LIMIT = 6;             // 건강기능식품 자가사용 인정 기준 (총 6병)
  var DUTY_SUPP = 0.08;             // 건강기능식품 기본관세율
  var DUTY_GEN_LOW = 0.08;          // 전자·기계류 등
  var DUTY_GEN_HIGH = 0.13;         // 의류·신발·가방 등
  var VAT = 0.10;                   // 부가가치세
  var STORE_KEY = 'fcCustomsCalc.v1';
  var FX_URL = 'https://open.er-api.com/v6/latest/USD';

  /* ------------------------------ DOM ------------------------------ */
  var $ = function (id) { return document.getElementById(id); };
  var form = $('calcForm');
  var amountField = $('amountField');
  var localShipField = $('localShipField');
  var intlShipField = $('intlShipField');
  var bottleInput = $('bottleInput');
  var rateInput = $('rateInput');
  var rateStatus = $('rateStatus');
  var bottleField = $('bottleField');
  var originHint = $('originHint');
  var bottleHelp = $('bottleHelp');

  var el = {
    verdict: $('verdict'),
    badge: $('verdictBadge'),
    eyebrow: $('verdictEyebrow'),
    title: $('verdictTitle'),
    sub: $('verdictSub'),
    amountValue: $('gaugeAmountValue'),
    amountFill: $('gaugeAmountFill'),
    amountOver: $('gaugeAmountOver'),
    amountTick: $('gaugeAmountTick'),
    amountFoot: $('gaugeAmountFoot'),
    bottleValue: $('gaugeBottleValue'),
    bottleSlots: $('bottleSlots'),
    bottleFoot: $('gaugeBottleFoot'),
    facts: $('facts'),
    issues: $('issues'),
    split: $('split'),
    duty: $('duty')
  };

  var state = {
    itemType: 'supp',
    origin: 'us',
    currency: 'USD',
    amount: 210,
    localShip: 0,
    intlShip: 0,
    bottles: 8,
    rate: DEFAULT_RATE,
    rateLive: false
  };

  /* ------------------------------ 포맷 ------------------------------ */
  function round2(n) { return Math.round(n * 100) / 100; }
  function toNum(v) {
    var n = parseFloat(String(v).replace(/,/g, ''));
    return isFinite(n) && n > 0 ? n : 0;
  }
  function usd(n) {
    var r = round2(n);
    var s = r.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return '$' + s;
  }
  function krw(n) {
    return Math.round(n).toLocaleString('ko-KR') + '원';
  }
  function pct(n) {
    return Math.round(n * 10) / 10;
  }
  /* 숫자 입력 폭을 내용에 맞춰 통화 기호가 숫자에 붙게 한다 */
  function fitInputs() {
    [amountField, localShipField, intlShipField].forEach(function (f) {
      if (!f) return;
      var s = String(f.value === '' ? '0' : f.value);
      f.style.width = (Math.max(3, s.length) + 0.6) + 'ch';
    });
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ------------------------------ 계산 ------------------------------ */
  function limitUSD() {
    if (state.itemType === 'supp') return LIMIT_SUPP_USD;
    return state.origin === 'us' ? LIMIT_GEN_US_USD : LIMIT_GEN_OTHER_USD;
  }

  function compute() {
    var isKrw = state.currency === 'KRW';
    var rate = state.rate > 0 ? state.rate : DEFAULT_RATE;
    var div = isKrw ? rate : 1;

    var itemUSD = (state.amount + state.localShip) / div;
    var intlUSD = state.intlShip / div;
    var limit = limitUSD();
    var bottles = state.itemType === 'supp' ? Math.round(state.bottles) : 0;

    var overAmount = round2(itemUSD - limit);
    var overBottles = state.itemType === 'supp' ? bottles - BOTTLE_LIMIT : 0;
    var bad = overAmount > 0.0001 || overBottles > 0;
    var tight = !bad && (limit - itemUSD < 15 || (state.itemType === 'supp' && bottles === BOTTLE_LIMIT && bottles > 0));
    var idle = itemUSD <= 0 && overBottles <= 0;

    return {
      isKrw: isKrw,
      rate: rate,
      itemUSD: itemUSD,
      itemKRW: itemUSD * rate,
      intlUSD: intlUSD,
      intlKRW: intlUSD * rate,
      limit: limit,
      bottles: bottles,
      overAmount: overAmount > 0 ? overAmount : 0,
      overBottles: overBottles > 0 ? overBottles : 0,
      remainingUSD: round2(limit - itemUSD),
      remainingBottles: BOTTLE_LIMIT - bottles,
      bad: bad,
      tight: tight,
      idle: idle
    };
  }

  /* 분할 주문 계획: 금액·병 수 두 조건을 모두 만족하는 최소 횟수 */
  function planSplit(c, type) {
    if (!c.bad) return null;
    var byAmount = c.itemUSD > 0 ? Math.ceil(c.itemUSD / c.limit - 0.000001) : 1;
    var byBottles = type === 'supp' && c.bottles > 0 ? Math.ceil(c.bottles / BOTTLE_LIMIT - 0.000001) : 1;
    var n = Math.max(1, byAmount, byBottles);
    if (n < 2) return null;

    var counts = [];
    if (type === 'supp') {
      var left = c.bottles;
      for (var i = 0; i < n; i++) {
        var even = Math.ceil(left / (n - i));
        var take = Math.min(BOTTLE_LIMIT, Math.max(0, even));
        counts.push(take);
        left -= take;
      }
    }
    return {
      n: n,
      perAmount: c.itemUSD / n,
      counts: counts,
      amountOK: c.itemUSD / n <= c.limit + 0.0001
    };
  }

  /* 예상 관부가세 (물품가격 초과 시) */
  function dutyEstimate(c, type) {
    var dutiable = c.itemUSD + c.intlUSD; // 과세가격 = 물품가격 + 국제운송료
    function calc(rate) {
      var duty = dutiable * rate;
      var vat = (dutiable + duty) * VAT;
      return { duty: duty, vat: vat, total: duty + vat };
    }
    var lowRate = type === 'supp' ? DUTY_SUPP : DUTY_GEN_LOW;
    var highRate = type === 'supp' ? DUTY_SUPP : DUTY_GEN_HIGH;
    return {
      dutiable: dutiable,
      low: calc(lowRate),
      high: calc(highRate),
      lowRate: lowRate,
      highRate: highRate,
      flat: lowRate === highRate
    };
  }

  /* ------------------------------ 렌더 ------------------------------ */
  function render() {
    var c = compute();
    var type = state.itemType;

    fitInputs();
    renderOriginHint(c);
    renderVerdict(c);
    renderGauges(c);
    renderFacts(c);
    renderIssues(c);

    var plan = planSplit(c, type);
    renderSplit(plan, c);
    renderDuty(c);
  }

  function renderOriginHint(c) {
    var msg = '';
    if (state.itemType === 'supp') {
      msg = state.origin === 'us'
        ? '<b>미국발이어도 200달러가 아니에요.</b> 건강기능식품은 목록통관 배제 품목이라 일반수입신고로 넘어가고, 자가사용 면세 한도인 <b>150달러</b>가 기준이 됩니다.'
        : '<b>캐나다·유럽·일본발 건강기능식품</b>도 똑같이 <b>150달러 + 총 6병</b> 기준이에요.';
    } else {
      msg = state.origin === 'us'
        ? '<b>미국발 특송(아이허브·아마존 등)</b>은 <b>200달러</b>까지 목록통관으로 들어갑니다. 단, 국제우편(EMS)으로 오면 150달러 기준으로 보는 게 안전해요.'
        : '<b>미국 외 국가</b>는 <b>150달러</b>까지 목록통관이에요. 목록통관 배제 품목(식품·의약품·건기식 등)이 하나라도 섞이면 전부 일반통관으로 넘어갑니다.';
    }
    originHint.innerHTML = msg;
    originHint.hidden = false;

    bottleField.hidden = state.itemType !== 'supp';
    bottleHelp.hidden = state.itemType !== 'supp';
  }

  function renderVerdict(c) {
    var tone = 'ok';
    var badge = '🟢';
    var eyebrow = '3초 판정 · 통관 안전';
    var title = '';
    var sub = '';

    if (c.idle) {
      tone = 'idle';
      badge = '🧮';
      eyebrow = '3초 판정';
      title = '금액을 입력하면 바로 판정해요';
      sub = '장바구니 금액과 병 수를 넣어주세요. 결제 화면의 숫자를 그대로 옮기면 됩니다.';
    } else if (c.bad) {
      tone = 'bad';
      badge = '🔴';
      eyebrow = '3초 판정 · 한도 초과';
      var both = c.overAmount > 0 && c.overBottles > 0;
      var onlyBottles = c.overBottles > 0 && c.overAmount <= 0;
      if (both) {
        title = '병 수도 금액도 초과 — 그대로 주문하면 위험해요';
        sub = '<b>' + c.bottles + '병</b>은 6병 기준을 ' + c.overBottles + '병 넘고, 물품가격 <b>' + usd(c.itemUSD) + '</b>는 한도 ' + usd(c.limit) + '를 ' + usd(c.overAmount) + ' 넘어요.';
      } else if (onlyBottles) {
        title = '6병 초과 — 통관이 보류될 수 있어요';
        sub = '<b>' + c.bottles + '병</b>은 자가사용 인정 기준(총 6병)을 <b>' + c.overBottles + '병</b> 넘어요. 금액은 한도 안이지만 수입요건 확인 대상이 됩니다.';
      } else {
        title = usd(c.limit) + ' 초과 — 관부가세가 붙어요';
        sub = '물품가격 <b>' + usd(c.itemUSD) + '</b>는 면세 한도 ' + usd(c.limit) + '를 <b>' + usd(c.overAmount) + '</b> 넘어요. 초과분만이 아니라 <b>전액</b>에 세금이 붙습니다.';
      }
    } else if (c.tight) {
      tone = 'warn';
      badge = '🟡';
      eyebrow = '3초 판정 · 아슬아슬';
      title = '지금은 통관 안전, 다만 여유가 없어요';
      sub = state.itemType === 'supp' && c.bottles === BOTTLE_LIMIT
        ? '병 수가 <b>딱 6병</b>이에요. 하나만 더 담아도 자가사용 한도를 넘습니다.'
        : '한도까지 <b>' + usd(c.remainingUSD) + '</b> 남았어요. 현지 세일즈택스나 환율이 오르면 넘칠 수 있습니다.';
    } else {
      title = '면세 범위 안 — 세금 0원이에요';
      sub = '물품가격 <b>' + usd(c.itemUSD) + '</b>' + (state.itemType === 'supp' ? ' · <b>' + c.bottles + '병</b>' : '') +
        ' → 관세·부가세 0원' + (state.itemType === 'supp' ? ', 수입요건 확인도 면제' : '') + '. 다만 <b>같은 날 다른 주문</b>이 입항하면 금액이 합산됩니다.';
    }

    el.verdict.setAttribute('data-tone', tone);
    el.badge.textContent = badge;
    el.eyebrow.textContent = eyebrow;
    el.title.textContent = title;
    el.sub.innerHTML = sub;
  }

  function renderGauges(c) {
    /* 금액 게이지 */
    var max = Math.max(c.itemUSD, c.limit);
    var inside = Math.min(c.itemUSD, c.limit);
    var fillPct = max > 0 ? (inside / max) * 100 : 0;
    var overPct = max > 0 && c.itemUSD > c.limit ? ((c.itemUSD - c.limit) / max) * 100 : 0;
    var tickPct = max > 0 ? (c.limit / max) * 100 : 100;

    el.amountFill.style.width = fillPct.toFixed(2) + '%';
    el.amountFill.style.left = '0%';
    el.amountOver.style.width = overPct.toFixed(2) + '%';
    el.amountOver.style.left = tickPct.toFixed(2) + '%';
    el.amountTick.style.left = tickPct.toFixed(2) + '%';

    var valHTML = '<span class="' + (c.bad ? 'warn' : c.tight ? '' : 'ok') + '">' + usd(c.itemUSD) + '</span> / ' + usd(c.limit);
    el.amountValue.innerHTML = valHTML;
    el.amountFoot.innerHTML = c.itemUSD > c.limit
      ? '한도 <b>' + usd(c.limit) + '</b> · <b>' + usd(c.overAmount) + '</b> 초과 (' + krw(c.itemUSD * c.rate) + ')'
      : '한도의 <b>' + pct(max > 0 ? (c.itemUSD / c.limit) * 100 : 0) + '%</b> 사용 · 남은 여유 <b>' + usd(Math.max(0, c.remainingUSD)) + '</b> (' + krw(c.itemUSD * c.rate) + ')';

    /* 병 수 게이지 */
    if (state.itemType !== 'supp') {
      el.bottleValue.textContent = '해당 없음';
      el.bottleSlots.innerHTML = '';
      el.bottleSlots.style.gridTemplateColumns = '1fr';
      el.bottleFoot.innerHTML = '의류·잡화·가전은 <b>수량 제한이 없고 금액만</b> 봅니다.';
      return;
    }

    var shown = Math.max(BOTTLE_LIMIT, Math.min(c.bottles, 12));
    var html = '';
    for (var i = 0; i < shown; i++) {
      var cls = 'slots__slot';
      if (i < c.bottles) cls += i < BOTTLE_LIMIT ? ' is-filled' : ' is-over';
      else cls += ' is-empty';
      html += '<span class="' + cls + '"></span>';
    }
    el.bottleSlots.innerHTML = html;
    el.bottleSlots.style.gridTemplateColumns = 'repeat(' + shown + ', 1fr)';
    el.bottleValue.innerHTML = '<span class="' + (c.overBottles > 0 ? 'warn' : c.bottles === BOTTLE_LIMIT ? '' : 'ok') + '">' +
      c.bottles + '병</span> / ' + BOTTLE_LIMIT + '병';
    el.bottleFoot.innerHTML = c.bottles > BOTTLE_LIMIT
      ? '<b>' + c.overBottles + '병</b> 초과 · 초과분은 요건확인 대상'
      : '남은 병 수 <b>' + Math.max(0, c.remainingBottles) + '병</b> · 종류가 달라도 합산입니다';
  }

  function renderFacts(c) {
    var overParts = [];
    if (c.overAmount > 0) overParts.push(usd(c.overAmount));
    if (c.overBottles > 0) overParts.push(c.overBottles + '병');
    var third = c.bad
      ? '<span class="facts__value" style="color:var(--red)">한도 초과</span><small>' +
        overParts.join(' · ') + ' 초과</small>'
      : '<span class="facts__value" style="color:var(--green)">면세</span><small>관세·부가세 0원</small>';

    el.facts.innerHTML =
      '<div class="facts__item"><span class="facts__label">물품가격</span><span class="facts__value">' + usd(c.itemUSD) +
        '<small>' + krw(c.itemUSD * c.rate) + '</small></span></div>' +
      '<div class="facts__item"><span class="facts__label">면세 한도</span><span class="facts__value">' + usd(c.limit) +
        '<small>' + (state.itemType === 'supp' ? '건기식 · 총 6병' : state.origin === 'us' ? '미국발 목록통관' : '목록통관') + '</small></span></div>' +
      '<div class="facts__item"><span class="facts__label">판정</span>' + third + '</div>';
  }

  function renderIssues(c) {
    var out = [];

    if (c.overBottles > 0) {
      out.push({
        cls: 'red', icon: '💊',
        html: '<b>6병 초과 (' + c.bottles + '병)</b> — 건강기능식품 자가사용 인정 기준은 <b>총 6병</b>이에요. 넘으면 수입요건 확인(식품수입검사) 대상이 되어 통관이 보류되거나 폐기될 수 있고, 국내 의사 소견서 등으로 타당성을 소명해야 하는 경우가 많습니다.'
      });
    }
    if (c.overAmount > 0) {
      out.push({
        cls: 'red', icon: '💸',
        html: '<b>' + usd(c.limit) + ' 초과 (' + usd(c.itemUSD) + ')</b> — 면세 한도는 공제가 아니라 <b>절벽</b>이에요. 한도를 넘으면 물품가격 <b>전액</b>에 관세와 부가세가 붙고, 과세가격에는 국제운송료까지 다시 더해집니다.'
      });
    }
    if (state.itemType === 'supp' && state.origin === 'us' && c.overAmount > 0) {
      out.push({
        cls: 'info', icon: 'ℹ️',
        html: '미국발이어도 영양제는 <b>$200 특례가 적용되지 않아요.</b> 목록통관 배제 품목이라 기준은 $150입니다.'
      });
    }
    if (c.bad && c.overAmount <= 0 && c.overBottles > 0) {
      out.push({
        cls: 'amber', icon: '💰',
        html: '금액은 한도 안이라 <b>관세는 0원</b>이에요. 하지만 병 수 초과는 세금 문제가 아니라 <b>통관 자체가 막히는 문제</b>라 더 까다롭습니다.'
      });
    }
    if (!c.bad && c.tight) {
      out.push({
        cls: 'amber', icon: '⚠️',
        html: '<b>한도에 거의 닿았어요.</b> 현지 세일즈택스·배송비가 추가되거나 환율이 오르면 한도를 넘길 수 있으니, 여유를 조금 남기는 게 안전합니다.'
      });
    }
    if (!c.bad && !c.tight && !c.idle) {
      out.push({
        cls: 'green', icon: '✅',
        html: '<b>관세·부가세 0원</b> — 금액과 병 수 모두 한도 안이라 면세로 들어옵니다.' +
          (state.itemType === 'supp' ? ' 6병 이하이므로 수입요건 확인도 면제돼요.' : '')
      });
    }
    if (!c.idle) {
      out.push({
        cls: 'amber', icon: '📦',
        html: '<b>합산과세 주의</b> — 같은 날(입항일 기준) 같은 수하인 앞으로 다른 상자가 들어오면 금액이 합산됩니다. 다음 주문은 <b>이 건의 통관이 끝난 뒤</b>에 하세요.'
      });
    }

    el.issues.innerHTML = out.map(function (o) {
      return '<div class="issue issue--' + o.cls + '"><span class="issue__icon" aria-hidden="true">' + o.icon +
        '</span><span>' + o.html + '</span></div>';
    }).join('');
  }

  function renderSplit(plan, c) {
    if (!plan) { el.split.hidden = true; el.split.innerHTML = ''; return; }

    var rows = '';
    var show = Math.min(plan.n, 4);
    var hasBottles = state.itemType === 'supp' && c.bottles > 0;
    for (var i = 0; i < show; i++) {
      var label = (i + 1) + '차';
      var bTxt = hasBottles ? plan.counts[i] + '병 · ' : '';
      rows += '<div class="split__row"><span><em>' + label + '</em><strong>' + bTxt +
        usd(plan.perAmount) + '</strong></span><span>' + krw(plan.perAmount * c.rate) + '</span></div>';
    }
    if (plan.n > show) {
      rows += '<div class="split__row"><span><em>…</em><strong>외 ' + (plan.n - show) + '회</strong></span><span>같은 금액으로 나눠요</span></div>';
    }

    var desc = hasBottles
      ? '<b>' + c.bottles + '병 · ' + usd(c.itemUSD) + '</b>를 <b>' + plan.n + '회</b>로 나누면 1회당 <b>' + plan.counts[0] + '병 · 약 ' + usd(plan.perAmount) + '</b>로 6병·' + usd(c.limit) + ' 안에 들어와요.'
      : '<b>' + usd(c.itemUSD) + '</b>를 <b>' + plan.n + '회</b>로 나누면 1회당 <b>약 ' + usd(plan.perAmount) + '</b>로 ' + usd(c.limit) + ' 안에 들어와요.';

    var shipNote = c.overAmount > 0
      ? '※ 나누면 <b>국제 배송비가 두 번</b> 들어요. 배송비가 큰 주문이면 한 번에 관부가세를 내는 편이 오히려 쌀 수 있으니, 위 예상 관부가세와 배송비를 함께 비교해 보세요.'
      : '※ 나누면 <b>국제 배송비가 두 번</b> 들어요. 병 수 때문에 어차피 나눠야 한다면, 배송비가 큰 제품은 처음부터 <b>6병 이하</b>로 한 번에 주문하는 게 낫습니다.';

    el.split.innerHTML =
      '<div class="split__head"><span class="split__icon" aria-hidden="true">✂️</span><span class="split__title">안전한 분할 주문 ' + plan.n + '회</span></div>' +
      '<p class="split__desc">' + desc + '</p>' +
      '<div class="split__rows">' + rows + '</div>' +
      '<ul class="split__steps">' +
        '<li>1차 주문·결제 (한도 안으로)</li>' +
        '<li>송장으로 <b>통관 완료</b> 확인 (입항 후 보통 1~3일)</li>' +
        '<li>그다음 2차 주문 — 같은 날 입항하면 합산돼요</li>' +
      '</ul>' +
      '<p class="split__warn">' + shipNote + '</p>' +
      '<p class="split__warn">※ 6병 기준을 피하려고 같은 제품을 반복해서 나눠 들여오면 <b>자가사용이 아니라고 판단</b>될 수 있어요(조세심판원 2025관0099). 한 번의 구매를 나누는 용도로만 쓰세요.</p>';
    el.split.hidden = false;
  }

  function renderDuty(c) {
    if (c.overAmount <= 0) { el.duty.hidden = true; el.duty.innerHTML = ''; return; }
    var d = dutyEstimate(c, state.itemType);

    var lowPct = Math.round(d.lowRate * 100);
    var highPct = Math.round(d.highRate * 100);
    var dutyCell = d.flat
      ? krw(d.low.duty * state.rate) + ' <span style="color:var(--ink-3);font-size:11px">(' + lowPct + '%)</span>'
      : '약 ' + krw(d.low.duty * state.rate) + ' ~ ' + krw(d.high.duty * state.rate) +
        ' <span style="color:var(--ink-3);font-size:11px">(' + lowPct + '~' + highPct + '%)</span>';
    var vatCell = d.flat
      ? krw(d.low.vat * state.rate)
      : '약 ' + krw(d.low.vat * state.rate) + ' ~ ' + krw(d.high.vat * state.rate);
    var totalCell = d.flat
      ? '<span style="color:var(--red)">' + krw(d.low.total * state.rate) + '</span>'
      : '<span style="color:var(--red)">약 ' + krw(Math.round(d.low.total * state.rate / 100) * 100) + ' ~ ' + krw(Math.round(d.high.total * state.rate / 100) * 100) + '</span>';

    el.duty.innerHTML =
      '<div class="duty__head"><span aria-hidden="true">🧾</span><span class="duty__title">예상 관부가세</span></div>' +
      '<table class="duty__table"><tbody>' +
        '<tr><th>과세가격 (물품가격 + 국제운송료)</th><td>' + usd(d.dutiable) + ' · ' + krw(d.dutiable * state.rate) + '</td></tr>' +
        '<tr><th>관세</th><td>' + dutyCell + '</td></tr>' +
        '<tr><th>부가가치세 (10%)</th><td>' + vatCell + '</td></tr>' +
      '</tbody><tfoot><tr><th>합계</th><td>' + totalCell + '</td></tr></tfoot></table>' +
      '<p class="duty__note">' +
        (state.itemType === 'supp'
          ? '건강기능식품 기본관세율 8% 기준이에요. 미국산 원산지 요건을 갖춰 협정세율(0%)이 적용되면 관세는 0원이 되지만, 개인 자가사용 통관에서는 서류 요건이 까다로워 기본세율로 잡는 게 안전합니다.'
          : '관세율은 품목분류(HS)에 따라 8%(전자·기계 등)~13%(의류·신발·가방)로 달라요. 정확한 세율은 관세청 예상세액 조회에서 품목을 골라 확인하세요.') +
        ' 환율은 입력한 ' + krw(state.rate).replace('원', '') + '원/USD로 계산했어요.' +
      '</p>';
    el.duty.hidden = false;
  }

  /* ------------------------------ 입력 동기화 ------------------------------ */
  function readForm() {
    var t = form.querySelector('input[name="itemType"]:checked');
    var o = form.querySelector('input[name="origin"]:checked');
    var cur = form.querySelector('input[name="currency"]:checked');
    state.itemType = t ? t.value : 'supp';
    state.origin = o ? o.value : 'us';
    state.currency = cur ? cur.value : 'USD';
    state.amount = toNum(amountField.value);
    state.localShip = toNum(localShipField.value);
    state.intlShip = toNum(intlShipField.value);
    state.bottles = Math.max(0, Math.min(60, Math.round(toNum(bottleInput.value))));
    var r = toNum(rateInput.value);
    if (r > 0) state.rate = r;
  }

  function updateCurrencySymbols() {
    var sym = state.currency === 'KRW' ? '₩' : '$';
    $('curMain').textContent = sym;
    $('curLocal').textContent = sym;
    $('curIntl').textContent = sym;
  }

  function convertCurrency(from, to) {
    if (from === to) return;
    var rate = state.rate > 0 ? state.rate : DEFAULT_RATE;
    var f = function (n) {
      return to === 'KRW' ? Math.round(n * rate) : round2(n / rate);
    };
    var g = function (n) {
      return to === 'KRW' ? round2(n / rate) : Math.round(n * rate);
    };
    amountField.value = f(toNum(amountField.value));
    localShipField.value = f(toNum(localShipField.value));
    intlShipField.value = f(toNum(intlShipField.value));
  }

  function updateChipStates() {
    var btns = document.querySelectorAll('.chipbtn');
    for (var i = 0; i < btns.length; i++) {
      var v = parseInt(btns[i].getAttribute('data-bottles'), 10);
      btns[i].setAttribute('aria-pressed', String(state.bottles === v));
    }
  }

  function setBottles(n) {
    bottleInput.value = Math.max(0, Math.min(60, n));
    readForm();
    updateChipStates();
    render();
    save();
  }

  /* ------------------------------ 환율 ------------------------------ */
  function setRateStatus(text, kind) {
    rateStatus.textContent = text;
    rateStatus.className = 'rate__status' + (kind ? ' is-' + kind : '');
  }

  function loadRate(fromUser) {
    setRateStatus('실시간 환율을 불러오는 중…', '');
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 6000);

    return fetch(FX_URL, { signal: ctrl ? ctrl.signal : undefined, cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (json) {
        var krwRate = json && json.rates && json.rates.KRW;
        if (!krwRate || !isFinite(krwRate)) throw new Error('no KRW');
        clearTimeout(timer);
        state.rateLive = true;
        state.rate = Math.round(krwRate * 100) / 100;
        rateInput.value = state.rate;
        var when = json.time_last_update_utc ? new Date(json.time_last_update_utc) : new Date();
        var stamp = when.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        setRateStatus('실시간 환율 적용 · ' + stamp + ' 기준 (open.er-api.com)', 'live');
        render();
        save();
      })
      .catch(function () {
        clearTimeout(timer);
        state.rateLive = false;
        if (fromUser) {
          setRateStatus('환율을 불러오지 못했어요. 아래 기본 환율로 계산합니다 — 직접 수정해도 됩니다.', 'fallback');
        } else {
          setRateStatus('실시간 환율 연결 실패 · 기본 환율 ' + DEFAULT_RATE + '원으로 계산 (직접 수정 가능)', 'fallback');
        }
        if (!toNum(rateInput.value)) rateInput.value = DEFAULT_RATE;
        state.rate = toNum(rateInput.value) || DEFAULT_RATE;
        render();
      });
  }

  /* ------------------------------ 저장 ------------------------------ */
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        itemType: state.itemType,
        origin: state.origin,
        currency: state.currency,
        amount: state.amount,
        localShip: state.localShip,
        intlShip: state.intlShip,
        bottles: state.bottles,
        rate: state.rate
      }));
    } catch (e) { /* 저장 실패는 무시 */ }
  }

  function restore() {
    var raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) { return; }
    if (!raw) return;
    var s;
    try { s = JSON.parse(raw); } catch (e) { return; }
    if (!s || typeof s !== 'object') return;

    if (s.itemType === 'gen' || s.itemType === 'supp') state.itemType = s.itemType;
    if (s.origin === 'us' || s.origin === 'other') state.origin = s.origin;
    if (s.currency === 'USD' || s.currency === 'KRW') state.currency = s.currency;
    if (isFinite(s.amount)) state.amount = Math.max(0, s.amount);
    if (isFinite(s.localShip)) state.localShip = Math.max(0, s.localShip);
    if (isFinite(s.intlShip)) state.intlShip = Math.max(0, s.intlShip);
    if (isFinite(s.bottles)) state.bottles = Math.max(0, Math.min(60, Math.round(s.bottles)));
    if (isFinite(s.rate) && s.rate > 0) state.rate = s.rate;

    var t = form.querySelector('input[name="itemType"][value="' + state.itemType + '"]');
    if (t) t.checked = true;
    var o = form.querySelector('input[name="origin"][value="' + state.origin + '"]');
    if (o) o.checked = true;
    var cu = form.querySelector('input[name="currency"][value="' + state.currency + '"]');
    if (cu) cu.checked = true;

    amountField.value = state.amount;
    localShipField.value = state.localShip;
    intlShipField.value = state.intlShip;
    bottleInput.value = state.bottles;
    rateInput.value = state.rate;
  }

  /* ------------------------------ 복사 ------------------------------ */
  function copyResult() {
    var c = compute();
    var lines = [
      '[팩트체크 건강연구소] 해외직구 통관 판정',
      '· 품목: ' + (state.itemType === 'supp' ? '건강기능식품' : '일반 직구') + ' / 발송: ' + (state.origin === 'us' ? '미국' : '그 외 국가'),
      '· 물품가격: ' + usd(c.itemUSD) + ' (' + krw(c.itemUSD * c.rate) + ')' + (state.itemType === 'supp' ? ' · ' + c.bottles + '병' : ''),
      '· 면세 한도: ' + usd(c.limit) + (state.itemType === 'supp' ? ' + 총 6병' : ''),
      '· 판정: ' + (c.bad ? '🔴 한도 초과' : c.tight ? '🟡 아슬아슬' : '🟢 통관 안전')
    ];
    if (c.overAmount > 0) lines.push('· 금액 초과: ' + usd(c.overAmount));
    if (c.overBottles > 0) lines.push('· 병 수 초과: ' + c.overBottles + '병');
    var plan = planSplit(c, state.itemType);
    if (plan) {
      lines.push('· 분할 제안: ' + plan.n + '회 (1회 약 ' + usd(plan.perAmount) +
        (state.itemType === 'supp' ? ' · ' + plan.counts[0] + '병' : '') + ') — 1차 통관 완료 후 2차 주문');
    }
    if (c.overAmount > 0) {
      var d = dutyEstimate(c, state.itemType);
      lines.push('· 예상 관부가세: ' + (d.flat ? krw(d.low.total * c.rate) : krw(d.low.total * c.rate) + ' ~ ' + krw(d.high.total * c.rate)));
    }
    lines.push('· 환율: 1USD = ' + state.rate + '원 (참고용)');
    lines.push('· 계산기: https://hjh7085-bit.github.io/customs-calc/');

    var text = lines.join('\n');
    var done = function () {
      var btn = $('copyBtn');
      var prev = btn.textContent;
      btn.textContent = '복사했어요';
      setTimeout(function () { btn.textContent = prev; }, 1600);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* 무시 */ }
      document.body.removeChild(ta);
    }
  }

  /* ------------------------------ 테마 ------------------------------ */
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('fcTheme'); } catch (e) {}
    var theme = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(theme);
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = $('themeToggle');
    var dark = theme === 'dark';
    btn.setAttribute('aria-pressed', String(dark));
    btn.setAttribute('aria-label', dark ? '라이트 모드로 전환' : '다크 모드로 전환');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#060d18' : '#081426');
    try { localStorage.setItem('fcTheme', theme); } catch (e) {}
  }

  /* ------------------------------ 이벤트 ------------------------------ */
  function bind() {
    form.addEventListener('input', function (e) {
      var t = e.target;
      if (!t) return;
      if (t.name === 'currency') {
        var to = t.value;
        var from = state.currency;
        readForm();
        convertCurrency(from, to);
        state.currency = to;
        readForm();
        updateCurrencySymbols();
        updateChipStates();
        render();
        save();
        return;
      }
      readForm();
      updateCurrencySymbols();
      updateChipStates();
      render();
      save();
    });
    form.addEventListener('change', function (e) {
      if (!e.target) return;
      readForm();
      updateChipStates();
      render();
      save();
    });

    $('bottleMinus').addEventListener('click', function () { setBottles(state.bottles - 1); });
    $('bottlePlus').addEventListener('click', function () { setBottles(state.bottles + 1); });

    var chips = document.querySelectorAll('.chipbtn');
    for (var i = 0; i < chips.length; i++) {
      chips[i].addEventListener('click', function () {
        setBottles(parseInt(this.getAttribute('data-bottles'), 10));
      });
    }

    $('rateRefresh').addEventListener('click', function () { loadRate(true); });

    rateInput.addEventListener('change', function () {
      var r = toNum(rateInput.value);
      if (r > 0) {
        state.rateLive = false;
        setRateStatus('직접 입력한 환율로 계산 중 — 실제 과세는 입항일 고시환율 기준이에요.', 'fallback');
      }
      readForm();
      render();
      save();
    });

    $('copyBtn').addEventListener('click', copyResult);

    $('resetBtn').addEventListener('click', function () {
      setTimeout(function () {
        state.itemType = 'supp';
        state.origin = 'us';
        state.currency = 'USD';
        state.amount = 210;
        state.localShip = 0;
        state.intlShip = 0;
        state.bottles = 8;
        amountField.value = 210;
        localShipField.value = 0;
        intlShipField.value = 0;
        bottleInput.value = 8;
        var t = form.querySelector('input[name="itemType"][value="supp"]');
        if (t) t.checked = true;
        var o = form.querySelector('input[name="origin"][value="us"]');
        if (o) o.checked = true;
        var c = form.querySelector('input[name="currency"][value="USD"]');
        if (c) c.checked = true;
        var fold = form.querySelector('.fold');
        if (fold) fold.open = false;
        updateCurrencySymbols();
        updateChipStates();
        render();
        save();
      }, 0);
    });

    $('themeToggle').addEventListener('click', function () {
      var now = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(now);
    });

    /* 키보드: 병 수 입력에서 ↑↓ */
    bottleInput.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp') { e.preventDefault(); setBottles(state.bottles + 1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setBottles(state.bottles - 1); }
    });
  }

  /* ------------------------------ 시작 ------------------------------ */
  function init() {
    initTheme();
    restore();
    updateCurrencySymbols();
    readForm();
    updateChipStates();
    render();
    bind();
    loadRate(false);
    document.body.setAttribute('data-app-ready', '1');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
