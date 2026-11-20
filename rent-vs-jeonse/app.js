/* 월세 vs 전세 비교 계산기 (대출이자·기회비용) — rent-vs-jeonse/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var deposit = (get('deposit') || 0) * 10000;
    var rent = (get('rent') || 0) * 10000;
    var jeonse = (get('jeonse') || 0) * 10000;
    var loanRate = (get('loanRate') || 0) / 100;
    var cash = Math.min((get('cash') || 0) * 10000, jeonse);
    var depRate = (get('depRate') || 0) / 100;
    var years = Math.max(1, Math.round(get('years') || 2));

    var loan = Math.max(0, jeonse - cash);
    var loanInt = loan * loanRate;                 // 연 이자
    var cashCost = cash * depRate;                 // 자기자본 기회비용
    var depositCost = deposit * depRate;           // 월세 보증금 기회비용
    var monthYear = rent * 12;
    var monthlyTotal = monthYear + depositCost;
    var jeonseTotal = loanInt + cashCost;

    var diff = monthlyTotal - jeonseTotal;          // 양수면 전세 유리
    var totalDiff = diff * years;
    var breakEvenRent = (jeonseTotal - depositCost) / 12;
    var breakEvenJeonse = ((monthYear + depositCost) - cash * depRate) / Math.max(0.0001, loanRate) + cash;

    var rows = [
      { k: '월세 연간 지출', v: won(monthYear), note: '월 ' + won(rent) + ' × 12' },
      { k: '보증금 기회비용 (연)', v: won(depositCost), note: '예금 ' + fmt(depRate * 100, 1) + '% 기준' },
      { k: '월세 총비용 (연)', v: won(monthlyTotal), total: true },
      { k: '전세대출 금액', v: won(loan), note: '전세금 − 보유 현금' },
      { k: '전세대출 이자 (연)', v: won(loanInt), note: '금리 ' + fmt(loanRate * 100, 2) + '%' },
      { k: '자기자본 기회비용 (연)', v: won(cashCost) },
      { k: '전세 총비용 (연)', v: won(jeonseTotal), total: true },
      { k: years + '년 총 차액', v: won(Math.abs(totalDiff)), note: diff > 0 ? '전세가 유리' : '월세가 유리' }
    ];

    return {
      verdict: {
        kicker: years + '년 기준 유리한 쪽', icon: diff > 0 ? '🔑' : '🏠',
        title: diff > 0 ? '전세가 유리' : diff === 0 ? '거의 같음' : '월세가 유리',
        desc: (diff > 0
                ? '전세가 연 <b>' + won(diff) + '</b>, ' + years + '년이면 <b>' + won(totalDiff) + '</b> 덜 나갑니다.'
                : diff < 0
                  ? '월세가 연 <b>' + won(-diff) + '</b>, ' + years + '년이면 <b>' + won(-totalDiff) + '</b> 덜 나갑니다.'
                  : '두 방식의 연간 비용이 같습니다.')
             + ' 월세로 같은 비용이 되는 손익분기 월세는 <b>' + won(breakEvenRent) + '</b>입니다.',
        cls: 'verdict--ok'
      },
      stats: [
        { l: '월세 연 비용', v: wonShort(monthlyTotal), cls: diff < 0 ? 'is-good' : '' },
        { l: '전세 연 비용', v: wonShort(jeonseTotal), cls: diff > 0 ? 'is-good' : '' },
        { l: '연 차액', v: wonShort(Math.abs(diff)) },
        { l: '손익분기 월세', v: won(breakEvenRent), s: '이보다 싸면 월세 유리' }
      ],
      rows: rows,
      bars: [
        { l: '월세 — 월세 지출', v: monthYear, max: Math.max(monthlyTotal, jeonseTotal), text: wonShort(monthYear), color: 'bar__fill--kcal' },
        { l: '월세 — 보증금 기회비용', v: depositCost, max: Math.max(monthlyTotal, jeonseTotal), text: wonShort(depositCost), color: 'bar__fill--carb' },
        { l: '전세 — 대출이자', v: loanInt, max: Math.max(monthlyTotal, jeonseTotal), text: wonShort(loanInt), color: 'bar__fill--accent' },
        { l: '전세 — 자기자본 기회비용', v: cashCost, max: Math.max(monthlyTotal, jeonseTotal), text: wonShort(cashCost), color: 'bar__fill--prot' }
      ],
      table: { head: ['거주 기간', '월세 누적', '전세 누적', '차액'], rows: [1, 2, 3, 5, 10].map(function (y) {
          return [y + '년', wonShort(monthlyTotal * y), wonShort(jeonseTotal * y), wonShort(Math.abs(diff) * y)];
        }), note: '전세대출 금리와 예금 금리가 그대로 유지된다고 가정한 단순 누적입니다.' },
      notes: [
        { html: '<b>' + won(breakEvenJeonse) + '</b>까지 전세보증금을 낮추면(또는 보유 현금을 늘리면) 두 방식의 비용이 같아집니다. 반대로 전세금이 이보다 높으면 대출이자가 커져 월세가 유리해집니다.' },
        { html: '전세는 <b>보증금을 돌려받는 조건</b>이 가장 중요합니다. 집주인의 반환 능력(보증보험 가입·등기부 확인)을 반드시 확인하세요. 비용이 조금 더 들더라도 안전한 쪽을 고르는 것이 원칙입니다.' }
      ]
    };
  }

  WT.mount({
    fields: ["deposit", "rent", "jeonse", "loanRate", "cash", "depRate", "years"],
    segs: [],
    checks: [],
    required: ["rent", "jeonse", "years"],
    presets: {"월세 80만 vs 전세 3억": {"fields": {"deposit": 1000, "rent": 80, "jeonse": 30000, "loanRate": 4.0, "cash": 10000, "depRate": 3.0, "years": 2}}, "월세 50만 vs 전세 2억": {"fields": {"deposit": 500, "rent": 50, "jeonse": 20000, "loanRate": 4.0, "cash": 20000, "depRate": 3.0, "years": 2}}, "월세 120만 vs 전세 5억": {"fields": {"deposit": 2000, "rent": 120, "jeonse": 50000, "loanRate": 3.8, "cash": 20000, "depRate": 3.0, "years": 3}}},
    validate: null,
    compute: compute
  });
})();
