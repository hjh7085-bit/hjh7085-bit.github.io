/* 주식 수수료·거래세·실현손익 계산기 — stock-fees/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var mk = seg('market');
    var isUS = mk === 'us';
    var fx = isUS ? (get('fx') || 1350) : 1;
    var bp = get('buyPrice') * fx, sp = get('sellPrice') * fx;
    var bq = get('buyQty'), sq = get('sellQty');
    var fee = (get('feeRate') || 0) / 100;
    var taxRate = isUS ? 0 : 0.0015;

    var buyAmt = bp * bq, sellAmt = sp * sq;
    var buyFee = buyAmt * fee, sellFee = sellAmt * fee;
    var tax = sellAmt * taxRate;
    var cost = buyAmt + buyFee;
    var net = sellAmt - sellFee - tax;
    var pl = net - cost * (sq / bq);
    var plRate = (cost * (sq / bq)) > 0 ? pl / (cost * (sq / bq)) * 100 : 0;
    var gross = (sp - bp) * sq;
    var totalFee = buyFee * (sq / bq) + sellFee + tax;
    var bePrice = (bp * (1 + fee) / (1 - fee - taxRate));

    var rows = [
      { k: '매수 금액', v: won(buyAmt), note: fmt(bq) + '주 × ' + won(bp) },
      { k: '매수 수수료', v: won(buyFee * (sq / bq)), note: pct(fee * 100, 3) },
      { k: '매도 금액', v: won(sellAmt), note: fmt(sq) + '주 × ' + won(sp) },
      { k: '매도 수수료', v: won(sellFee), note: pct(fee * 100, 3) },
      { k: '거래세', v: won(tax), note: isUS ? '미국은 거래세 없음' : (mk === 'kospi' ? '코스피 0.15%' : '코스닥 0.15%') },
      { k: '비용 합계', v: won(totalFee), cls: 'is-bad' },
      { k: '세전 차익', v: (gross >= 0 ? '+' : '') + won(gross) },
      { k: '세후 실현손익', v: (pl >= 0 ? '+' : '') + won(pl), total: true, cls: pl >= 0 ? 'is-good' : 'is-bad' }
    ];

    return {
      verdict: {
        kicker: '세후 실현손익', icon: pl >= 0 ? '🟢' : '🔴',
        title: (pl >= 0 ? '+' : '') + won(pl),
        desc: '수익률 <b>' + (plRate >= 0 ? '+' : '') + pct(plRate, 2) + '</b>. 수수료·거래세로 <b>' + won(totalFee) + '</b>이 빠졌습니다. '
              + '본전이 되는 매도가는 <b>' + won(bePrice) + '</b>입니다' + (isUS ? '(환율 변동 제외).' : '.'),
        cls: pl >= 0 ? 'verdict--ok' : 'verdict--bad'
      },
      stats: [
        { l: '세후 손익', v: (pl >= 0 ? '+' : '') + wonShort(pl), cls: pl >= 0 ? 'is-good' : 'is-bad' },
        { l: '수익률', v: (plRate >= 0 ? '+' : '') + pct(plRate, 2) },
        { l: '비용 합계', v: won(totalFee), s: pct(totalFee / Math.max(1, sellAmt) * 100, 2) },
        { l: '손익분기 매도가', v: won(bePrice), s: '이 가격에 팔면 본전' }
      ],
      rows: rows,
      bars: [
        { l: '매도 금액', v: sellAmt, max: sellAmt, text: wonShort(sellAmt), color: 'bar__fill--accent' },
        { l: '수수료+거래세', v: totalFee, max: sellAmt, text: wonShort(totalFee), color: 'bar__fill--kcal' },
        { l: '세후 수령액', v: net, max: sellAmt, text: wonShort(net), color: 'bar__fill--green' }
      ],
      notes: [
        { html: '<b>거래비용은 수익률을 갉아먹습니다.</b> 왕복 0.2%면 50번 매매에 10%가 사라집니다. 단타에서 수수료·세금을 무시하면 기대값이 크게 달라집니다.' },
        { html: isUS ? '<b>미국 주식</b>은 거래세가 없지만, 연간 양도차익 250만원을 넘으면 22%(지방세 포함)로 과세됩니다. 이 계산기의 손익은 양도소득세 전 금액입니다.' : '<b>국내 주식</b>은 매도할 때만 거래세가 붙습니다. 코스피의 0.15%에는 농어촌특별세가 포함되어 있습니다.' }
      ]
    };
  }

  WT.mount({
    fields: ["buyPrice", "buyQty", "sellPrice", "sellQty", "feeRate", "fx"],
    segs: ["market"],
    checks: [],
    required: ["buyPrice", "buyQty", "sellPrice", "sellQty"],
    presets: {"1만 → 1.1만 · 100주": {"fields": {"buyPrice": 10000, "buyQty": 100, "sellPrice": 11000, "sellQty": 100, "feeRate": 0.015, "fx": 1350}, "segs": {"market": "kospi"}}, "5만 → 4.8만 · 200주 (손실)": {"fields": {"buyPrice": 50000, "buyQty": 200, "sellPrice": 48000, "sellQty": 200, "feeRate": 0.015, "fx": 1350}, "segs": {"market": "kospi"}}, "미국 150달러 → 165달러": {"fields": {"buyPrice": 150, "buyQty": 50, "sellPrice": 165, "sellQty": 50, "feeRate": 0.015, "fx": 1350}, "segs": {"market": "us"}}},
    validate: null,
    compute: compute
  });
})();
