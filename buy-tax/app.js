/* 주택 취득세 계산기 (2026 · 6억·9억 누진·다주택 8%) — buy-tax/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function acqRate(price, own) {
    if (own === '2' || own === 'corp') return 0.08;
    if (price <= 600000000) return 0.01;
    if (price <= 900000000) return (price / 100000000 * 2 / 3 - 3) / 100;
    return 0.03;
  }
  function eduRate(rate) { return rate <= 0.0301 ? rate * 0.1 : 0.004; }

  function calc(price, own, area) {
    var rate = acqRate(price, own);
    var acq = Math.floor(price * rate);
    var edu = Math.floor(price * eduRate(rate));
    var farm = (area > 85 && rate <= 0.0301) ? Math.floor(price * 0.002) : 0;
    var cut = (own === 'first' && price <= 300000000) ? 2000000 : 0;
    var acqNet = Math.max(0, acq - cut);
    return { rate: rate, acq: acq, acqNet: acqNet, edu: edu, farm: farm, cut: cut,
             total: acqNet + edu + farm };
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var price = (get('price') || 0) * 10000;
    var area = isFinite(get('area')) ? get('area') : 0;
    var own = seg('own');
    var c = calc(price, own, area);

    var label = own === '1' ? '1주택' : own === 'first' ? '생애최초' : own === '2' ? '2주택 이상' : '법인';
    var rows = [
      { k: '취득가액', v: won(price) },
      { k: '적용 취득세율', v: pct(c.rate * 100, 3), note: label + ' 기준' },
      { k: '취득세 (본세)', v: won(c.acq) }
    ];
    if (c.cut > 0) rows.push({ k: '생애최초 감면', v: '-' + won(c.cut), note: '3억 이하 · 200만원 한도' });
    rows.push({ k: '지방교육세', v: won(c.edu), note: '취득세율의 10% (8% 구간은 0.4%)' });
    if (c.farm > 0) rows.push({ k: '농어촌특별세', v: won(c.farm), note: '전용 85㎡ 초과 · 0.2%' });
    rows.push({ k: '총 납부액', v: won(c.total), total: true });

    var prices = [20000, 30000, 50000, 60000, 70000, 90000, 120000];
    var table = prices.map(function (p) {
      var x = calc(p * 10000, own, area);
      return [fmt(p) + '만', pct(x.rate * 100, 2), won(x.acq), won(x.total), pct(x.total / (p * 10000) * 100, 2)];
    });

    return {
      verdict: {
        kicker: '총 납부액 (본세+부가세목)', icon: '🏠',
        title: won(c.total),
        desc: label + ' · 취득가 <b>' + won(price) + '</b> 기준입니다. 적용 세율은 <b>' + pct(c.rate * 100, 3) +
              '</b>, 이 중 취득세 본세가 <b>' + won(c.acqNet) + '</b>입니다. 잔금일(또는 등기일)부터 <b>60일 안</b>에 신고·납부해야 합니다.',
        cls: 'verdict--ok'
      },
      stats: [
        { l: '취득세 본세', v: won(c.acqNet) },
        { l: '지방교육세', v: won(c.edu) },
        { l: '총 납부액', v: won(c.total), cls: 'is-accent' },
        { l: '취득가 대비', v: pct(c.total / price * 100, 2) }
      ],
      rows: rows,
      table: { head: ['취득가', '세율', '취득세', '총 납부', '취득가 대비'], rows: table,
               note: '같은 조건(' + label + ', 전용 ' + fmt(area) + '㎡)에서 가격만 바꾼 값입니다.' },
      notes: [{ html: '<b>6억~9억 구간은 누진</b>입니다 — 6억원에서 1%, 9억원에서 3%가 되도록 (취득가액×2/3−3)억 = 세율(%) 공식으로 계산합니다. 7억원이면 약 1.67%입니다.' }]
    };
  }

  WT.mount({
    fields: ["price", "area"],
    segs: ["own"],
    checks: [],
    required: ["price"],
    presets: {"5억 아파트 (1주택)": {"fields": {"price": 50000, "area": 84}, "segs": {"own": "1"}}, "8억 아파트 (1주택)": {"fields": {"price": 80000, "area": 84}, "segs": {"own": "1"}}, "3억 생애최초": {"fields": {"price": 30000, "area": 59}, "segs": {"own": "first"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
