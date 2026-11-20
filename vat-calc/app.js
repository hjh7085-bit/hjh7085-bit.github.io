/* 부가가치세 계산기 (일반·간이과세 · 부가세 포함/별도) — vat-calc/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var VAT = 0.1;
  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var kind = seg('kind');
    var sales = (get('sales') || 0) * 10000;
    var purchase = (isFinite(get('purchase')) ? get('purchase') : 0) * 10000;
    var rate = (isFinite(get('rate')) ? get('rate') : 15) / 100;

    var outVat = sales * VAT;
    var inVat = purchase * VAT;
    var tax = 0, base = 0, label = '';

    if (kind === 'normal') {
      base = outVat;
      tax = Math.max(0, outVat - inVat);
      label = '매출세액 − 매입세액';
    } else {
      base = sales * rate;
      var credit = purchase * VAT * 0.5;
      tax = Math.max(0, base * VAT - credit);
      label = '과세표준(매출×부가율) × 10% − 매입공제';
    }
    var taxFloor = Math.floor(tax / 10) * 10;
    var salesVat = kind === 'normal' ? outVat : base * VAT;
    var purchaseCredit = kind === 'normal' ? inVat : purchase * VAT * 0.5;

    var rows = [
      { k: '매출 (공급가액)', v: won(sales) },
      { k: '매출세액 (10%)', v: won(outVat) }
    ];
    if (kind === 'normal') {
      rows.push({ k: '매입 (공급가액)', v: won(purchase) });
      rows.push({ k: '매입세액 (10%)', v: '-' + won(inVat) });
      rows.push({ k: '납부세액', v: won(taxFloor), total: true });
    } else {
      rows.push({ k: '부가율', v: pct(rate * 100, 1) });
      rows.push({ k: '과세표준', v: won(base) });
      rows.push({ k: '매출세액', v: won(base * VAT) });
      rows.push({ k: '매입세액 공제 (50%)', v: '-' + won(purchase * VAT * 0.5) });
      rows.push({ k: '납부세액', v: won(taxFloor), total: true });
    }

    var salesIn = sales * 1.1;
    var table = [1000, 3000, 5000, 10000, 20000].map(function (a) {
      var s2 = a * 10000;
      var t2 = kind === 'normal' ? Math.max(0, s2 * 0.1 - inVat) : Math.max(0, s2 * rate * 0.1 - purchase * 0.1 * 0.5);
      return [fmt(a) + '만', won(s2 * 0.1), won(t2), won(t2 / 2)];
    });

    return {
      verdict: {
        kicker: '납부할 부가가치세', icon: '🧮',
        title: won(taxFloor),
        desc: (kind === 'normal' ? '일반과세자' : '간이과세자') + ' 기준으로 <b>' + label + '</b>입니다. ' +
              '매출세액 ' + won(salesVat) + '에서 매입세액 ' + won(purchaseCredit) + '을 뺀 금액이며, ' +
              '부가세 포함 매출액은 <b>' + won(salesIn) + '</b>입니다.',
        cls: taxFloor > 0 ? 'verdict--warn' : 'verdict--ok'
      },
      stats: [
        { l: kind === 'normal' ? '매출세액' : '매출세액(부가율)', v: won(salesVat) },
        { l: '매입세액', v: won(purchaseCredit) },
        { l: '납부세액', v: won(taxFloor), cls: 'is-accent' },
        { l: '실효 부담률', v: pct(sales > 0 ? taxFloor / sales * 100 : 0, 2), s: '매출 대비' }
      ],
      rows: rows,
      table: { head: ['매출', '매출세액', '납부세액', '분납액(절반)'], rows: table,
               note: '같은 매입·부가율 조건에서 매출만 바꾼 값입니다.' },
      notes: [{ html: '<b>매입세액을 못 받는 경우</b> — 세금계산서 없는 현금 매입, 접대비, 비영업용 승용차 관련 비용, 면세사업 관련 매입은 매입세액 공제가 되지 않습니다. 매입 1,500만원 중 절반이 세금계산서가 없다면 납부세액이 75만원 늘어납니다.' }]
    };
  }

  WT.mount({
    fields: ["sales", "purchase", "rate"],
    segs: ["kind"],
    checks: [],
    required: ["sales"],
    presets: {"일반 · 매출 3,000/매입 1,500": {"fields": {"sales": 3000, "purchase": 1500, "rate": 15}, "segs": {"kind": "normal"}}, "일반 · 매출 1억/매입 7,000": {"fields": {"sales": 10000, "purchase": 7000, "rate": 15}, "segs": {"kind": "normal"}}, "간이 · 소매 매출 8,000": {"fields": {"sales": 8000, "purchase": 2000, "rate": 15}, "segs": {"kind": "simple"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
