/* 부동산 중개보수(복비) 계산기 (2026 매매·임대 상한요율) — broker-fee/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function rateOf(amount, kind) {
    // amount: 원
    var a = amount / 10000; // 만원
    if (kind === 'sale') {
      if (a < 5000) return { r: 0.006, cap: 250000 };
      if (a < 20000) return { r: 0.005, cap: 800000 };
      if (a < 90000) return { r: 0.004, cap: 0 };
      if (a < 120000) return { r: 0.005, cap: 0 };
      if (a < 150000) return { r: 0.006, cap: 0 };
      return { r: 0.007, cap: 0 };
    }
    if (a < 5000) return { r: 0.005, cap: 200000 };
    if (a < 10000) return { r: 0.004, cap: 300000 };
    if (a < 60000) return { r: 0.003, cap: 0 };
    if (a < 120000) return { r: 0.004, cap: 0 };
    if (a < 150000) return { r: 0.005, cap: 0 };
    return { r: 0.006, cap: 0 };
  }
  function fee(amount, kind, vatIn) {
    var t = rateOf(amount, kind);
    var raw = amount * t.r;
    var base = t.cap > 0 ? Math.min(raw, t.cap) : raw;
    base = Math.floor(base / 1000) * 1000;
    var vat = Math.floor(base * 0.1);
    return { rate: t.r, cap: t.cap, base: base, vat: vat, total: base + vat,
             totalIn: vatIn ? base + vat : base };
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var kind = seg('kind');
    var amount = (get('amount') || 0) * 10000;
    var monthly = (isFinite(get('monthly')) ? get('monthly') : 0) * 10000;
    var conv = kind === 'lease' ? amount + monthly * 100 : amount;
    var label = kind === 'sale' ? '매매' : '임대차';
    var f0 = fee(conv, kind, seg('vat') === 'yes');

    var rows = [
      { k: '거래금액', v: won(amount) }
    ];
    if (monthly > 0) rows.push({ k: '환산보증금', v: won(conv), note: '보증금 + 월세×100' });
    rows.push({ k: '적용 상한요율', v: pct(f0.rate * 100, 2), note: f0.cap > 0 ? '한도 ' + won(f0.cap) : '구간 요율' });
    rows.push({ k: '중개보수 (상한)', v: won(f0.base) });
    rows.push({ k: '부가가치세 (10%)', v: won(f0.vat) });
    rows.push({ k: '총 지급액', v: won(f0.total), total: true });

    var table = [10000, 20000, 30000, 50000, 70000, 90000, 120000].map(function (a) {
      var x = fee(a * 10000, kind, true);
      return [fmt(a) + '만', pct(x.rate * 100, 2), won(x.base), won(x.total)];
    });

    return {
      verdict: {
        kicker: label + ' 중개보수 상한 (VAT 포함)', icon: '🤝',
        title: won(f0.total),
        desc: '거래금액 <b>' + won(conv) + '</b> 기준 상한요율 <b>' + pct(f0.rate * 100, 2) + '</b>입니다. ' +
              '중개보수 <b>' + won(f0.base) + '</b>에 부가세 <b>' + won(f0.vat) + '</b>까지 더한 금액이며, 이보다 낮게 협의할 수 있습니다.',
        cls: 'verdict--ok'
      },
      stats: [
        { l: '상한요율', v: pct(f0.rate * 100, 2) },
        { l: '중개보수', v: won(f0.base) },
        { l: 'VAT 포함', v: won(f0.total), cls: 'is-accent' },
        { l: '거래금액 대비', v: pct(f0.total / conv * 100, 3) }
      ],
      rows: rows,
      table: { head: ['거래금액', '상한요율', '중개보수', 'VAT 포함'], rows: table,
               note: label + ' 기준 상한요율표입니다.' },
      notes: [{ html: '<b>5억원 미만은 한도액</b>이 있습니다 — 매매 5,000만원 미만은 0.6%·최대 25만원, 5,000만~2억원은 0.5%·최대 80만원, 임대차 5,000만원 미만은 0.5%·최대 20만원, 5,000만~1억원은 0.4%·최대 30만원입니다.' }]
    };
  }

  WT.mount({
    fields: ["amount", "monthly"],
    segs: ["kind", "vat"],
    checks: [],
    required: ["amount"],
    presets: {"5억 매매": {"fields": {"amount": 50000, "monthly": 0}, "segs": {"kind": "sale", "vat": "yes"}}, "3억 전세": {"fields": {"amount": 30000, "monthly": 0}, "segs": {"kind": "lease", "vat": "yes"}}, "보증금 1억·월세 60만": {"fields": {"amount": 10000, "monthly": 60}, "segs": {"kind": "lease", "vat": "yes"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
