/* 전월세 전환율 계산기 (보증금↔월세 · 법정 상한 비교) — jeonse-convert/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var jeonse = (get('jeonse') || 0) * 10000;
    var deposit = (get('deposit') || 0) * 10000;
    var monthly = (isFinite(get('monthly')) ? get('monthly') : 0) * 10000;
    var baseRate = isFinite(get('base')) ? get('base') : 2.5;
    var diff = jeonse - deposit;
    var rate = diff > 0 ? (monthly * 12) / diff * 100 : 0;
    var capRate = Math.min(baseRate + 2, 10);
    var capMonthly = diff * (capRate / 100) / 12;
    var over = monthly - capMonthly;
    var worth = rate > 0 ? diff / (rate / 100) : 0;

    var rows = [
      { k: '전세 보증금', v: won(jeonse) },
      { k: '월세 보증금', v: won(deposit) },
      { k: '보증금 차액', v: won(diff), note: '월세로 전환된 금액' },
      { k: '연 월세 환산', v: won(monthly * 12) },
      { k: '전환율', v: pct(rate, 2), total: true },
      { k: '법정 상한 (기준금리 ' + fmt(baseRate, 2) + '% + 2%p)', v: pct(capRate, 2) },
      { k: '상한 기준 월세', v: won(capMonthly) },
      { k: over > 0 ? '초과분 (월)' : '여유분 (월)', v: (over > 0 ? '+' : '') + won(Math.abs(over)) }
    ];

    var table = [];
    [2, 2.5, 3, 3.5, 4].forEach(function (r) {
      var cap = Math.min(r + 2, 10);
      table.push([fmt(r, 2) + '%', pct(cap, 1), won(diff * (cap / 100) / 12), won(diff * (cap / 100))]);
    });

    var bad = rate > capRate + 0.001;
    return {
      verdict: {
        kicker: '전환율', icon: bad ? '⚠️' : '🔁',
        title: pct(rate, 2),
        desc: '보증금 차액 <b>' + won(diff) + '</b>을 월세 <b>' + won(monthly) + '</b>로 전환한 비율입니다. 법정 상한은 <b>' + pct(capRate, 2) +
              '</b>(기준금리 ' + fmt(baseRate, 2) + '%+2%p)이고 상한 기준 월세는 <b>' + won(capMonthly) + '</b>입니다. ' +
              (bad ? '현재 월세가 상한을 <b>' + won(over) + '</b> 넘습니다.' : '상한 이내입니다.'),
        cls: bad ? 'verdict--warn' : 'verdict--ok'
      },
      stats: [
        { l: '전환율', v: pct(rate, 2), cls: 'is-accent' },
        { l: '법정 상한', v: pct(capRate, 2) },
        { l: '상한 기준 월세', v: won(capMonthly) },
        { l: bad ? '초과분 (월)' : '월세 여유', v: won(Math.abs(over)), cls: bad ? 'is-bad' : 'is-good' }
      ],
      rows: rows,
      bars: [
        { l: '현재 전환율', v: rate, max: Math.max(rate, capRate) * 1.2, text: pct(rate, 2), color: bad ? 'bar__fill--kcal' : 'bar__fill--green' },
        { l: '법정 상한', v: capRate, max: Math.max(rate, capRate) * 1.2, text: pct(capRate, 2), color: 'bar__fill--accent' }
      ],
      table: { head: ['기준금리', '상한 전환율', '상한 월세', '연 환산'], rows: table,
               note: '같은 보증금 차액에서 기준금리별 상한 월세입니다. 상한은 최대 10%입니다.' },
      notes: [{ html: '<b>계산 방향을 뒤집으면</b> — 법정 상한으로 월세를 받으면 ' + won(capMonthly) + ', 시중 전환율(연 5~6%)을 적용하면 ' + won(diff * 0.055 / 12) + ' 정도입니다. 전환율이 낮을수록 세입자에게 유리합니다.' }]
    };
  }

  WT.mount({
    fields: ["jeonse", "deposit", "monthly", "base"],
    segs: [],
    checks: [],
    required: ["jeonse", "deposit"],
    presets: {"3억 전세 → 1억+월세 60만": {"fields": {"jeonse": 30000, "deposit": 10000, "monthly": 60, "base": 2.5}}, "5억 전세 → 2억+월세 80만": {"fields": {"jeonse": 50000, "deposit": 20000, "monthly": 80, "base": 2.5}}, "3억 전세 → 2억+월세 30만": {"fields": {"jeonse": 30000, "deposit": 20000, "monthly": 30, "base": 2.5}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
