/* 연말정산 신용카드·체크카드 공제 계산기 (2026) — year-end-card/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var RATE = { credit: 0.15, check: 0.30, market: 0.40, transit: 0.40, culture: 0.30, etc: 0.15 };
  function limitOf(gross) {
    if (gross <= 70000000) return 3000000;
    if (gross <= 120000000) return 2500000;
    return 2000000;
  }
  function marginal(gross) {
    if (gross <= 14000000) return 0.06;
    if (gross <= 50000000) return 0.15;
    if (gross <= 88000000) return 0.24;
    if (gross <= 150000000) return 0.35;
    return 0.38;
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var gross = get('gross') * 10000;
    var use = {
      credit: (get('credit') || 0) * 10000, check: (get('check') || 0) * 10000,
      market: (get('market') || 0) * 10000, transit: (get('transit') || 0) * 10000,
      culture: (get('culture') || 0) * 10000, etc: (get('etc') || 0) * 10000
    };
    var total = 0; for (var k in use) total += use[k];
    var threshold = gross * 0.25;
    var excess = Math.max(0, total - threshold);

    // 공제율 높은 순서로 배분
    var queue = ['market', 'transit', 'culture', 'check', 'credit', 'etc'];
    var alloc = {}, remain = excess;
    queue.forEach(function (key) {
      var amt = Math.min(use[key], remain);
      alloc[key] = amt; remain -= amt;
    });
    var baseDeduct = 0, extraMarket = alloc.market * RATE.market, extraTransit = alloc.transit * RATE.transit;
    queue.forEach(function (key) {
      if (key === 'market' || key === 'transit') return;
      baseDeduct += alloc[key] * RATE[key];
    });
    var baseLimit = limitOf(gross);
    var baseUsed = Math.min(baseDeduct, baseLimit);
    var marketUsed = Math.min(extraMarket, 3000000);
    var transitUsed = Math.min(extraTransit, 3000000);
    var deduction = baseUsed + marketUsed + transitUsed;

    var rate = marginal(gross) * 1.1;     // 지방소득세 포함
    var saving = deduction * rate;
    var maxDeduct = baseLimit + 6000000;
    var remainLimit = Math.max(0, maxDeduct - deduction);

    var rows = [
      { k: '총 사용액', v: won(total), note: '신용+체크+전통시장+대중교통+도서' },
      { k: '공제 기준선 (총급여 25%)', v: won(threshold) },
      { k: '기준 초과 사용액', v: won(excess), note: excess > 0 ? '이 금액만 공제 대상' : '기준을 넘지 못해 공제 0원' },
      { k: '기본 공제 (신용15·체크30·도서30)', v: won(baseUsed), note: '한도 ' + won(baseLimit) + ' 중 사용' },
      { k: '전통시장 추가 공제', v: won(marketUsed), note: '별도 한도 300만원' },
      { k: '대중교통 추가 공제', v: won(transitUsed), note: '별도 한도 300만원' },
      { k: '예상 카드 공제액', v: won(deduction), total: true }
    ];

    var bars = [
      { l: '신용카드', v: use.credit, max: Math.max(total, 1), text: wonShort(use.credit) + ' · 15%', color: 'bar__fill--kcal' },
      { l: '체크·현금', v: use.check, max: Math.max(total, 1), text: wonShort(use.check) + ' · 30%', color: 'bar__fill--prot' },
      { l: '전통시장', v: use.market, max: Math.max(total, 1), text: wonShort(use.market) + ' · 40%', color: 'bar__fill--accent' },
      { l: '대중교통', v: use.transit, max: Math.max(total, 1), text: wonShort(use.transit) + ' · 40%', color: 'bar__fill--green' },
      { l: '도서·공연', v: use.culture, max: Math.max(total, 1), text: wonShort(use.culture) + ' · 30%', color: 'bar__fill--carb' }
    ];

    // 체크카드로 옮겼을 때 효과
    var shift = Math.min(use.credit * 0.3, Math.max(0, baseLimit - baseUsed + 3000000));
    var shiftDeduct = shift * (RATE.check - RATE.credit);

    return {
      verdict: {
        kicker: '예상 카드 공제액', icon: deduction > 0 ? '💳' : '😐',
        title: won(deduction),
        desc: deduction > 0
          ? '절감되는 세액은 <b>' + won(saving) + '</b>입니다(한계세율 ' + pct(rate * 100, 1) + ' 적용). 남은 공제 한도는 <b>' + won(remainLimit) + '</b>입니다.'
          : '총 사용액이 총급여 25%(' + won(threshold) + ')를 넘지 않아 공제가 0원입니다. 기준선을 ' + won(threshold - total) + ' 더 넘겨야 공제가 시작됩니다.',
        cls: deduction > 0 ? 'verdict--ok' : 'verdict--warn'
      },
      stats: [
        { l: '공제액', v: won(deduction), cls: 'is-accent' },
        { l: '절감 세액', v: won(saving), cls: 'is-good' },
        { l: '공제율 평균', v: total > 0 ? pct(deduction / total * 100, 1) : '0%' },
        { l: '남은 한도', v: won(remainLimit) }
      ],
      rows: rows,
      bars: bars,
      table: { head: ['항목', '사용액', '공제율', '공제 반영액'], rows: queue.map(function (key) {
          var nm = { market: '전통시장', transit: '대중교통', culture: '도서·공연', check: '체크·현금', credit: '신용카드', etc: '기타' }[key];
          var used = key === 'market' ? marketUsed : key === 'transit' ? transitUsed : alloc[key] * RATE[key];
          return [nm, wonShort(use[key]), pct(RATE[key] * 100, 0), won(used)];
        }), note: '공제율이 높은 항목부터 기준 초과액을 배분했습니다.' },
      notes: [
        { html: '<b>체크카드로 옮기면?</b> 신용카드 사용액 일부를 체크카드로 바꾸면 공제율이 15%→30%로 두 배가 됩니다. 다만 총 사용액이 그대로라면 기준선(총급여 25%)을 넘는 금액이 줄어 오히려 손해일 수 있으니, <b>기준선을 이미 넘긴 상태</b>에서만 유리합니다.' },
        { html: '전통시장·대중교통은 기본 한도와 별도로 각 300만원까지 공제됩니다. 연말에 남은 한도가 있다면 이 항목의 사용액을 늘리는 것이 가장 효율적입니다.' }
      ]
    };
  }

  WT.mount({
    fields: ["gross", "credit", "check", "market", "transit", "culture", "etc"],
    segs: [],
    checks: [],
    required: ["gross"],
    presets: {"연봉 4,000만 · 카드 2,500만": {"fields": {"gross": 4000, "credit": 1500, "check": 800, "market": 100, "transit": 80, "culture": 30, "etc": 0}}, "연봉 6,000만 · 카드 4,000만": {"fields": {"gross": 6000, "credit": 2500, "check": 1000, "market": 200, "transit": 120, "culture": 50, "etc": 0}}, "연봉 3,000만 · 카드 1,500만": {"fields": {"gross": 3000, "credit": 900, "check": 400, "market": 60, "transit": 40, "culture": 0, "etc": 0}}},
    validate: null,
    compute: compute
  });
})();
