/* 환전 우대율·실수령 외화 계산기 (은행·카드 수수료 비교) — fx-exchange/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function calc(krw, rate, prefer, unit, spread, fee) {
    var base = rate * (1 + spread / 100);
    var applied = rate * (1 + spread / 100 * (1 - prefer / 100));
    var usable = Math.max(0, krw - fee);
    var fx = applied > 0 ? usable / applied * unit : 0;
    return { base: base, applied: applied, fx: fx, fee: fee };
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var krw = (get('krw') || 0) * 10000;
    var rate = get('rate') || 0;
    var prefer = isFinite(get('prefer')) ? get('prefer') : 0;
    var unit = isFinite(get('unit')) ? get('unit') : 1;
    var spread = isFinite(get('spread')) ? get('spread') : 1.75;
    var fee = isFinite(get('fee')) ? get('fee') : 0;

    var c = calc(krw, rate, prefer, unit, spread, fee);
    var noPrefer = calc(krw, rate, 0, unit, spread, fee);
    var diff = c.fx - noPrefer.fx;
    var effective = krw > 0 ? krw / (c.fx / unit) : 0;

    var rows = [
      { k: '환전할 원화', v: won(krw) },
      { k: '매매기준율', v: fmt(rate, 2) + '원', note: '1단위 = ' + fmt(unit) },
      { k: '현찰 살 때 환율 (스프레드 ' + fmt(spread, 2) + '%)', v: fmt(rate * (1 + spread / 100), 2) + '원' },
      { k: '우대 적용 환율', v: fmt(c.applied, 2) + '원', note: '우대 ' + fmt(prefer, 0) + '%' },
      { k: '건당 수수료', v: '-' + won(fee) },
      { k: '실수령 외화', v: fmt(c.fx, 2) + ' ' + (unit === 100 ? '(100단위 ' + fmt(c.fx, 2) + '개)' : ''), total: true },
      { k: '우대 0% 대비 차이', v: '+' + fmt(diff, 2) },
      { k: '실효 환율', v: fmt(effective, 2) + '원' }
    ];

    var table = [0, 30, 50, 70, 80, 90, 100].map(function (p) {
      var x = calc(krw, rate, p, unit, spread, fee);
      return [fmt(p) + '%', fmt(x.applied, 2) + '원', fmt(x.fx, 2), '+' + fmt(x.fx - noPrefer.fx, 2)];
    });

    return {
      verdict: {
        kicker: '실수령 외화', icon: '💱',
        title: fmt(c.fx, 2) + (unit === 100 ? ' (100단위)' : ''),
        desc: '원화 <b>' + won(krw) + '</b>으로 우대 <b>' + fmt(prefer, 0) + '%</b>를 받으면 환율 ' + fmt(c.applied, 2) + '원이 적용되어 <b>' +
              fmt(c.fx, 2) + '</b>을 받습니다. 우대를 못 받았을 때보다 <b>' + fmt(diff, 2) + '</b> 더 많고, 실효 환율은 ' + fmt(effective, 2) + '원입니다.',
        cls: 'verdict--ok'
      },
      stats: [
        { l: '적용 환율', v: fmt(c.applied, 2) + '원', cls: 'is-accent' },
        { l: '실수령 외화', v: fmt(c.fx, 2) },
        { l: '우대 혜택', v: '+' + fmt(diff, 2) },
        { l: '실효 환율', v: fmt(effective, 2) + '원' }
      ],
      rows: rows,
      table: { head: ['우대율', '적용 환율', '수령 외화', '차이'], rows: table,
               note: '같은 원화·환율에서 우대율만 바꾼 값입니다.' },
      notes: [{ html: '<b>카드 결제와 비교</b> — 해외 카드 결제는 국제브랜드 수수료 1~1.2% + 국내 발급사 0.2~0.5%가 붙습니다. 환전 우대 80% + 스프레드 1.75%면 실효 비용이 2.1% 정도로 카드보다 약간 불리할 수 있습니다. 소액은 카드, 큰 금액은 우대 환전이 유리한 경우가 많습니다.' }]
    };
  }

  WT.mount({
    fields: ["krw", "rate", "prefer", "unit", "spread", "fee"],
    segs: [],
    checks: [],
    required: ["krw", "rate"],
    presets: {"100만원 · 우대 80%": {"fields": {"krw": 100, "rate": 1350, "prefer": 80, "unit": 1, "spread": 1.75, "fee": 0}}, "100만원 · 우대 0%": {"fields": {"krw": 100, "rate": 1350, "prefer": 0, "unit": 1, "spread": 1.75, "fee": 5000}}, "50만원 · 엔화 우대 90%": {"fields": {"krw": 50, "rate": 900, "prefer": 90, "unit": 100, "spread": 1.75, "fee": 0}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
