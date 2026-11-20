/* 복리 투자 목표 달성 기간·자산 계산기 — compound-goal/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function fv(initial, m, r, n) {
    var i = r / 12;
    if (n <= 0) return initial;
    if (Math.abs(i) < 1e-9) return initial + m * n;
    return initial * Math.pow(1 + i, n) + m * ((Math.pow(1 + i, n) - 1) / i);
  }
  function monthsTo(initial, m, r, target) {
    var i = r / 12;
    if (i <= 0) return m > 0 ? Math.ceil((target - initial) / m) : Infinity;
    if (initial * Math.pow(1 + i, 1) >= target) return 1;
    var a = initial + m / i, b = target + m / i;
    if (a <= 0 || b / a <= 0) return Infinity;
    return Math.ceil(Math.log(b / a) / Math.log(1 + i));
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var initial = (get('initial') || 0) * 10000;
    var monthly = (get('monthly') || 0) * 10000;
    var r = get('rate') / 100;
    var years = Math.max(1, Math.round(get('years') || 10));
    var infl = (get('inflation') || 0) / 100;
    var goal = get('goal') * 10000;

    var n = years * 12;
    var total = fv(initial, monthly, r, n);
    var principal = initial + monthly * n;
    var profit = total - principal;
    var real = total / Math.pow(1 + infl, years);

    var goalText, months = null;
    if (isFinite(goal) && goal > 0) {
      months = monthsTo(initial, monthly, r, goal);
      if (!isFinite(months)) goalText = '이 조건으로는 목표에 도달하지 못합니다. 월 적립액이나 수익률을 높여야 합니다.';
      else goalText = '목표 ' + wonShort(goal) + '까지 <b>' + Math.floor(months / 12) + '년 ' + (months % 12) + '개월</b>이 걸립니다.';
    }

    // 필요 월 적립액 (기간 내 목표 달성)
    var needMonthly = 0;
    if (isFinite(goal) && goal > 0) {
      var i = r / 12;
      var remain = goal - initial * Math.pow(1 + i, n);
      needMonthly = i > 0 ? remain * i / (Math.pow(1 + i, n) - 1) : remain / n;
      if (needMonthly < 0) needMonthly = 0;
    }

    var rows = [
      { k: '초기 투자금', v: won(initial) },
      { k: '월 적립액', v: won(monthly), note: years + '년간 ' + won(monthly * n) },
      { k: '총 원금', v: won(principal) },
      { k: '평가금액 (' + years + '년 후)', v: won(total), total: true },
      { k: '수익금', v: '+' + won(profit), cls: 'is-good', note: '원금의 ' + pct(principal > 0 ? profit / principal * 100 : 0, 1) },
      { k: '물가 반영 실질가치', v: won(real), note: '연 ' + fmt(infl * 100, 1) + '% 물가상승 가정' },
      { k: '목표 달성 필요 월 적립액', v: won(needMonthly), note: years + '년 내 ' + wonShort(goal) + ' 목표' }
    ];

    var sim = [];
    var step = years <= 10 ? 1 : years <= 20 ? 2 : 5;
    for (var y = step; y <= years; y += step) {
      var v = fv(initial, monthly, r, y * 12);
      sim.push([y + '년', wonShort(v), wonShort(initial + monthly * y * 12), wonShort(v - (initial + monthly * y * 12)), pct((v / Math.pow(1 + infl, y)) / v * 100, 0)]);
    }
    if (sim.length === 0) sim.push([years + '년', wonShort(total), wonShort(principal), wonShort(profit), '—']);

    return {
      verdict: {
        kicker: years + '년 후 예상 자산', icon: '📈',
        title: won(total),
        desc: '원금 <b>' + won(principal) + '</b> + 수익 <b>' + won(profit) + '</b>. 물가상승 ' + fmt(infl * 100, 1) + '%를 반영한 실질가치는 <b>' + won(real) + '</b>입니다. ' + (goalText || ''),
        cls: 'verdict--ok'
      },
      stats: [
        { l: years + '년 후 자산', v: wonShort(total), cls: 'is-accent' },
        { l: '수익금', v: wonShort(profit), cls: 'is-good' },
        { l: '수익 비중', v: pct(total > 0 ? profit / total * 100 : 0), s: '자산 중' },
        { l: '실질가치', v: wonShort(real), s: '물가 반영' }
      ],
      rows: rows,
      bars: [
        { l: '총 원금', v: principal, max: Math.max(total, 1), text: wonShort(principal), color: 'bar__fill--accent' },
        { l: '복리 수익', v: Math.max(0, profit), max: Math.max(total, 1), text: wonShort(profit), color: 'bar__fill--green' }
      ],
      table: { head: ['기간', '평가금액', '원금', '수익', '실질가치 비율'], rows: sim,
               note: '수익률이 매년 동일하다고 가정한 이론값입니다. 실제로는 하락 연도가 섞입니다.' },
      notes: [
        { html: '<b>기간이 수익률보다 중요합니다.</b> 연 7%에서 10년은 원금의 2배, 20년은 3.9배, 30년은 7.6배가 됩니다. 수익률을 1%포인트 올리는 것보다 5년 더 투자하는 것이 더 큰 차이를 만드는 경우가 많습니다.' },
        { html: '목표가 있다면 <b>필요 월 적립액</b>을 확인하세요. 10억을 20년에 만들려면 연 7% 기준 월 190만원 안팎이 필요합니다. 목표와 현실의 간극을 먼저 아는 것이 계획의 시작입니다.' }
      ]
    };
  }

  WT.mount({
    fields: ["initial", "monthly", "rate", "years", "goal", "inflation"],
    segs: [],
    checks: [],
    required: ["rate"],
    presets: {"월 50만 · 연 7% · 10년": {"fields": {"initial": 0, "monthly": 50, "rate": 7, "years": 10, "goal": 10000, "inflation": 2.5}}, "1,000만 + 월 30만 · 20년": {"fields": {"initial": 1000, "monthly": 30, "rate": 7, "years": 20, "goal": 50000, "inflation": 2.5}}, "목표 10억 · 월 100만": {"fields": {"initial": 1000, "monthly": 100, "rate": 7, "years": 20, "goal": 100000, "inflation": 2.5}}},
    validate: null,
    compute: compute
  });
})();
