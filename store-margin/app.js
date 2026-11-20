/* 스마트스토어·쿠팡 마진율·손익분기점 계산기 — store-margin/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function unit(price, cost, fee, ship, ad, ret) {
    var feeAmt = price * (fee / 100);
    var retCost = (ship * 2 + cost * 0.1) * (ret / 100);
    var profit = price - cost - feeAmt - ship - ad - retCost;
    return { feeAmt: feeAmt, retCost: retCost, profit: profit, margin: price > 0 ? profit / price * 100 : 0 };
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var price = get('price') || 0, cost = get('cost') || 0;
    var fee = isFinite(get('fee')) ? get('fee') : 0;
    var ship = isFinite(get('ship')) ? get('ship') : 0;
    var ad = isFinite(get('ad')) ? get('ad') : 0;
    var ret = isFinite(get('returnRate')) ? get('returnRate') : 0;
    var fixed = isFinite(get('fixed')) ? get('fixed') : 0;
    var target = isFinite(get('target')) ? get('target') : 0;

    var u = unit(price, cost, fee, ship, ad, ret);
    var bep = u.profit > 0 ? Math.ceil(fixed / u.profit) : 0;
    var goal = u.profit > 0 ? Math.ceil((fixed + target) / u.profit) : 0;

    var rows = [
      { k: '판매가', v: won(price) },
      { k: '상품 원가', v: '-' + won(cost) },
      { k: '플랫폼 수수료 (' + fmt(fee, 1) + '%)', v: '-' + won(u.feeAmt) },
      { k: '배송비 부담', v: '-' + won(ship) },
      { k: '건당 광고비', v: '-' + won(ad) },
      { k: '반품 손실 (' + fmt(ret, 1) + '%)', v: '-' + won(u.retCost), note: '왕복 배송비 + 원가 10% 가정' },
      { k: '건당 순이익', v: won(u.profit), total: true }
    ];
    if (fixed > 0) {
      rows.push({ k: '월 고정비', v: won(fixed) });
      rows.push({ k: '손익분기 수량', v: u.profit > 0 ? fmt(bep) + '개' : '달성 불가', note: u.profit > 0 ? '고정비 ÷ 건당이익' : '건당 이익이 0 이하' });
    }
    if (target > 0 && u.profit > 0) rows.push({ k: '목표 이익 달성 수량', v: fmt(goal) + '개', note: '(고정비+목표) ÷ 건당이익' });

    var table = [price * 0.8, price, price * 1.2, price * 1.5].map(function (p) {
      var x = unit(p, cost, fee, ship, ad, ret);
      return [won(p), won(x.feeAmt), won(x.profit), pct(x.margin, 1), x.profit > 0 && fixed > 0 ? fmt(Math.ceil(fixed / x.profit)) + '개' : '-'];
    });

    return {
      verdict: {
        kicker: '건당 순이익 · 마진율 ' + pct(u.margin, 1), icon: '🛍️',
        title: won(u.profit),
        desc: '판매가 <b>' + won(price) + '</b>에서 원가·수수료·배송·광고·반품 손실을 모두 빼면 <b>' + won(u.profit) + '</b>이 남습니다(마진율 ' + pct(u.margin, 1) + '). ' +
              (u.profit > 0 ? (fixed > 0 ? '월 고정비 ' + won(fixed) + '을 회수하려면 <b>' + fmt(bep) + '개</b>를 팔아야 하고, 목표 이익 ' + won(target) + '까지는 <b>' + fmt(goal) + '개</b>입니다.' : '고정비를 넣으면 본전 수량이 나옵니다.') : '건당 이익이 마이너스입니다. 판매가를 올리거나 원가·광고비를 줄여야 합니다.'),
        cls: u.profit > 0 ? 'verdict--ok' : 'verdict--bad'
      },
      stats: [
        { l: '건당 순이익', v: won(u.profit), cls: u.profit > 0 ? 'is-good' : 'is-bad' },
        { l: '마진율', v: pct(u.margin, 1), cls: 'is-accent' },
        { l: '손익분기 수량', v: u.profit > 0 && fixed > 0 ? fmt(bep) + '개' : '-' },
        { l: '목표 달성 수량', v: u.profit > 0 && target > 0 ? fmt(goal) + '개' : '-' }
      ],
      rows: rows,
      bars: [
        { l: '원가', v: cost, max: price, text: won(cost), color: 'bar__fill--prot' },
        { l: '수수료', v: u.feeAmt, max: price, text: won(u.feeAmt), color: 'bar__fill--accent' },
        { l: '배송·광고·반품', v: ship + ad + u.retCost, max: price, text: won(ship + ad + u.retCost), color: 'bar__fill--kcal' },
        { l: '순이익', v: Math.max(0, u.profit), max: price, text: won(u.profit), color: 'bar__fill--green' }
      ],
      table: { head: ['판매가', '수수료', '순이익', '마진율', 'BEP'], rows: table,
               note: '같은 원가·비용에서 판매가만 바꾼 값입니다. 가격 인상이 마진에 얼마나 큰 영향을 주는지 보세요.' },
      notes: [{ html: '<b>마진율 10%의 함정</b> — 마진율이 10%면 매출이 10배여야 이익이 1배가 됩니다. 반품률 5%와 광고비가 붙으면 실제로는 마이너스가 되기 쉽습니다. 목표 마진율을 20~30%로 잡고, 그에 맞는 판매가를 역산하는 편이 안전합니다.' }]
    };
  }

  WT.mount({
    fields: ["price", "cost", "fee", "ship", "ad", "returnRate", "fixed", "target"],
    segs: [],
    checks: [],
    required: ["price", "cost"],
    presets: {"2만원 상품 (수수료 5.6%)": {"fields": {"price": 20000, "cost": 8000, "fee": 5.6, "ship": 2500, "ad": 1500, "returnRate": 5, "fixed": 1000000, "target": 2000000}}, "3만 9천 상품 (쿠팡 10%)": {"fields": {"price": 39000, "cost": 15000, "fee": 10, "ship": 3000, "ad": 3000, "returnRate": 8, "fixed": 2000000, "target": 3000000}}, "9,900원 저가 상품": {"fields": {"price": 9900, "cost": 3500, "fee": 5.6, "ship": 2200, "ad": 800, "returnRate": 3, "fixed": 500000, "target": 1000000}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
