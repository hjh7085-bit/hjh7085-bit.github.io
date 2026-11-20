/* 로또·연금복권 세후 실수령액 계산기 — lotto-tax/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function taxOf(amount) {
    if (amount <= 2000000) return 0;
    if (amount <= 300000000) return amount * 0.22;
    return 300000000 * 0.22 + (amount - 300000000) * 0.33;
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var kind = seg('kind');
    var amount = (get('amount') || 0) * 10000;
    var years = isFinite(get('years')) ? get('years') : 20;
    var donate = (isFinite(get('donate')) ? get('donate') : 0) * 10000;

    var net = Math.max(0, amount - donate);
    var isPension = kind === 'pension';

    if (isPension) {
      var monthNet = net * 0.78;
      var monthTax = net * 0.22;
      var totalGross = amount * 12 * years;
      var totalNet = monthNet * 12 * years;
      var rows = [
        { k: '월 지급액 (세전)', v: won(amount) },
        { k: '월 원천징수 (22%)', v: '-' + won(monthTax) },
        { k: '월 실수령액', v: won(monthNet), total: true },
        { k: '연 실수령액', v: won(monthNet * 12) },
        { k: '총 수령액 (' + fmt(years) + '년)', v: won(totalNet), note: '세전 ' + won(totalGross) },
        { k: '총 세금', v: won(totalGross - totalNet) }
      ];
      return {
        verdict: {
          kicker: '월 실수령액', icon: '🎰',
          title: won(monthNet) + ' / 월',
          desc: '월 <b>' + won(amount) + '</b>을 ' + fmt(years) + '년간 받으면 세금 22%를 뗀 <b>' + won(monthNet) + '</b>이 매달 들어옵니다. ' +
                '총 수령액은 <b>' + won(totalNet) + '</b>이고, 세금은 ' + won(totalGross - totalNet) + '입니다.',
          cls: 'verdict--ok'
        },
        stats: [
          { l: '월 실수령', v: won(monthNet), cls: 'is-accent' },
          { l: '연 실수령', v: won(monthNet * 12) },
          { l: '총 수령', v: wonShort(totalNet) },
          { l: '총 세금', v: wonShort(totalGross - totalNet) }
        ],
        rows: rows,
        table: { head: ['기간', '세전 누적', '세후 누적'], rows: [1, 5, 10, 20].filter(function (y) { return y <= years; }).map(function (y) {
          return [y + '년', won(amount * 12 * y), won(monthNet * 12 * y)];
        }), note: '연금복권은 20년간 매월 지급됩니다.' },
        notes: [{ html: '<b>연금복권의 장점</b> — 매월 일정 금액이 들어와 소득처럼 쓸 수 있고, 분리과세라 다른 소득과 합산되지 않습니다. 다만 물가상승률이 반영되지 않아 20년 뒤 실질 가치는 절반 이하가 될 수 있습니다.' }]
      };
    }

    var tax = taxOf(net);
    var got = net - tax;
    var rows2 = [
      { k: '당첨금', v: won(amount) }
    ];
    if (donate > 0) rows2.push({ k: '기부금', v: '-' + won(donate) });
    rows2.push({ k: '과세 대상 금액', v: won(net) });
    rows2.push({ k: '세율', v: net > 300000000 ? '22% + 초과분 33%' : net > 2000000 ? '22%' : '비과세', note: '소득세+지방소득세' });
    rows2.push({ k: '원천징수 세금', v: '-' + won(tax) });
    rows2.push({ k: '실수령액', v: won(got), total: true });
    rows2.push({ k: '실수령률', v: pct(net > 0 ? got / net * 100 : 0, 1) });

    var table = [1000, 3000, 10000, 30000, 100000, 200000].map(function (a) {
      var g = a * 10000, t = taxOf(g);
      return [fmt(a) + '만', won(t), won(g - t)];
    });

    return {
      verdict: {
        kicker: '실수령액', icon: '💰',
        title: won(got),
        desc: '당첨금 <b>' + won(amount) + '</b>에서 세금 <b>' + won(tax) + '</b>을 떼고 <b>' + won(got) + '</b>을 받습니다. ' +
              (net > 300000000 ? '3억원까지는 22%, 초과분은 33%가 적용됩니다.' : '3억원 이하 구간이라 22%가 적용됩니다.') +
              ' 실수령률은 ' + pct(net > 0 ? got / net * 100 : 0, 1) + '입니다.',
        cls: 'verdict--ok'
      },
      stats: [
        { l: '실수령액', v: won(got), cls: 'is-accent' },
        { l: '세금', v: won(tax) },
        { l: '실수령률', v: pct(net > 0 ? got / net * 100 : 0, 1) },
        { l: '당첨금', v: wonShort(amount) }
      ],
      rows: rows2,
      bars: [
        { l: '실수령', v: got, max: net, text: won(got), color: 'bar__fill--green' },
        { l: '세금', v: tax, max: net, text: won(tax), color: 'bar__fill--kcal' }
      ],
      table: { head: ['당첨금', '세금', '실수령'], rows: table, note: '당첨금 규모별 세금과 실수령액입니다.' },
      notes: [{ html: '<b>가족에게 나누면 증여세</b> — 당첨금을 배우자·자녀에게 이체하면 증여로 보아 증여세가 붙을 수 있습니다. 5,000만원(성인 자녀) 공제를 넘으면 신고 대상입니다. 공동구매는 지분을 계약서로 남기는 것이 안전합니다.' }]
    };
  }

  WT.mount({
    fields: ["amount", "years", "donate"],
    segs: ["kind"],
    checks: [],
    required: ["amount"],
    presets: {"로또 1등 20억": {"fields": {"amount": 200000, "years": 20, "donate": 0}, "segs": {"kind": "lotto"}}, "로또 2등 5천만": {"fields": {"amount": 5000, "years": 20, "donate": 0}, "segs": {"kind": "lotto"}}, "연금복권 월 700만": {"fields": {"amount": 700, "years": 20, "donate": 0}, "segs": {"kind": "pension"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
