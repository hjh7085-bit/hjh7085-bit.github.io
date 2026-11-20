/* 대출 월 상환액 계산기 (원리금균등·원금균등·만기일시) — loan-payment/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function monthlyEven(P, i, n) {
    if (i === 0) return P / n;
    return P * i / (1 - Math.pow(1 + i, -n));
  }
  function simulate(P, i, n, graceMonths, method) {
    var rows = [], bal = P, cumInt = 0, totalInt = 0, first = 0, last = 0, sum = 0;
    var per = P / n;
    var pay = method === 'even' ? monthlyEven(P, i, n) : 0;
    for (var m = 1; m <= n; m++) {
      var interest = bal * i;
      var principalPart = 0, payment = 0;
      if (method === 'even') {
        payment = pay; principalPart = payment - interest;
      } else if (method === 'principal') {
        principalPart = per; payment = per + interest;
      } else {
        principalPart = m === n ? bal : 0; payment = interest + principalPart;
      }
      if (m === 1) first = payment;
      last = payment;
      bal = Math.max(0, bal - principalPart);
      cumInt += interest; totalInt += interest; sum += payment;
      if (m % 12 === 0) rows.push([Math.floor(m / 12) + '년차', payment, cumInt, bal]);
    }
    return { first: first, last: last, totalInt: totalInt, total: P + totalInt, rows: rows, monthly: sum / n };
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var P = get('amount') * 10000;
    var r = get('rate') / 100, i = r / 12;
    var years = Math.round(get('years'));
    var grace = Math.min(Math.round(get('grace') || 0), Math.max(0, years - 1));
    var n = years * 12;
    var method = seg('method');

    var gMonths = grace * 12;
    var res = simulate(P, i, n, gMonths, method);
    var even = simulate(P, i, n, gMonths, 'even');
    var prin = simulate(P, i, n, gMonths, 'principal');
    var bullet = simulate(P, i, n, gMonths, 'bullet');
    var graceInt = gMonths > 0 ? P * i * gMonths : 0;

    var rows = [
      { k: '매달 상환액 (첫 달)', v: won(res.first + (gMonths ? 0 : 0)), note: gMonths ? '거치 ' + gMonths + '개월은 이자만' : '' },
      { k: '매달 상환액 (마지막 달)', v: won(res.last) },
      { k: '월 평균 상환액', v: won(res.monthly) },
      { k: '거치기간 이자', v: won(graceInt), note: '원금 상환 없는 기간' },
      { k: '총 이자', v: won(res.totalInt), cls: 'is-bad' },
      { k: '총 상환액', v: won(res.total), total: true }
    ];

    var cmp = [
      ['원리금균등', won(even.monthly), won(even.first), won(even.totalInt)],
      ['원금균등', won(prin.first) + ' → ' + won(prin.last), won(prin.first), won(prin.totalInt)],
      ['만기일시', won(bullet.first), won(bullet.first), won(bullet.totalInt)]
    ];

    var yearRows = res.rows.filter(function (x, k) { return k % Math.max(1, Math.round(res.rows.length / 8)) === 0 || k === res.rows.length - 1; })
      .map(function (x) { return [x[0], won(x[1]), won(x[2]), wonShort(x[3])]; });

    return {
      verdict: {
        kicker: (method === 'even' ? '원리금균등' : method === 'principal' ? '원금균등' : '만기일시') + ' 월 상환액',
        icon: '🏠',
        title: won(res.first),
        desc: '총 이자 <b>' + won(res.totalInt) + '</b>, 총 상환액 <b>' + won(res.total) + '</b>. '
              + '같은 조건에서 원금균등으로 갚으면 총이자가 <b>' + won(even.totalInt - prin.totalInt) + '</b> '
              + (even.totalInt > prin.totalInt ? '적고' : '많고') + ', 대신 첫 달 부담이 ' + won(prin.first - even.first) + ' 더 큽니다.',
        cls: 'verdict--accent'
      },
      stats: [
        { l: '첫 달 상환액', v: won(res.first) },
        { l: '총 이자', v: won(res.totalInt), cls: 'is-bad' },
        { l: '총 상환액', v: won(res.total) },
        { l: '이자 비중', v: pct(res.totalInt / res.total * 100), s: '총 상환액 중' }
      ],
      rows: rows,
      table: { head: ['방식', '월 상환액', '첫 달', '총 이자'], rows: cmp,
               note: '원금균등은 매달 원금이 일정해 상환액이 줄어듭니다. 만기일시는 이자만 내다가 만기에 원금을 한꺼번에 갚습니다.' },
      notes: [
        { html: '<b>총 이자만 보면 원금균등이 유리</b>하지만, 첫 달 상환 부담이 커서 자금 계획이 빡빡해질 수 있습니다. 여유가 있다면 원리금균등으로 시작해 <b>중도상환</b>하는 편이 현실적입니다. 중도상환수수료는 보통 3년 내 상환액의 0.7~1.2%입니다.' },
        { html: '기간을 30년에서 40년으로 늘리면 월 상환액은 줄지만 총이자는 크게 늘어납니다. 위 표의 총 이자를 기간별로 비교해 보세요.' }
      ]
    };
  }

  WT.mount({
    fields: ["amount", "rate", "years", "grace"],
    segs: ["method"],
    checks: [],
    required: ["amount", "rate", "years"],
    presets: {"3억 · 4.5% · 30년": {"fields": {"amount": 30000, "rate": 4.5, "years": 30, "grace": 0}, "segs": {"method": "even"}}, "5억 · 4.0% · 40년": {"fields": {"amount": 50000, "rate": 4.0, "years": 40, "grace": 0}, "segs": {"method": "even"}}, "1억 · 5.5% · 5년": {"fields": {"amount": 10000, "rate": 5.5, "years": 5, "grace": 0}, "segs": {"method": "principal"}}},
    validate: null,
    compute: compute
  });
})();
