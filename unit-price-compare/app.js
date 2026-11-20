/* 100g·100ml당 가성비 단가 비교기 (3개 제품) — unit-price-compare/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function read(id, get, val) {
    var price = get('price' + id), size = get('size' + id);
    if (!isFinite(price) || !isFinite(size) || price <= 0 || size <= 0) return null;
    var qty = Math.max(1, Math.round(get('qty' + id) || 1));
    var ship = get('ship' + id) || 0;
    var unit = String(val('unit' + id) || 'g').toLowerCase().replace(/[^a-z]/g, '') || 'g';
    var totalSize = size * qty;
    var totalPrice = price + ship;
    return {
      id: id, name: val('name' + id) || ('제품 ' + id),
      price: price, ship: ship, size: size, qty: qty, unit: unit,
      totalSize: totalSize, totalPrice: totalPrice,
      per100: totalPrice / totalSize * 100,
      perUnit: totalPrice / qty
    };
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var list = [read(1, get, val), read(2, get, val), read(3, get, val)].filter(Boolean);
    if (list.length < 2) return null;
    var units = {};
    list.forEach(function (p) { units[p.unit] = (units[p.unit] || 0) + 1; });
    var unit = Object.keys(units).sort(function (a, b) { return units[b] - units[a]; })[0];
    var mixed = Object.keys(units).length > 1;

    list.sort(function (a, b) { return a.per100 - b.per100; });
    var best = list[0], worst = list[list.length - 1];
    var gap = worst.per100 / best.per100;

    var rows = list.map(function (p, i) {
      return {
        k: (i === 0 ? '🥇 ' : '') + p.name,
        v: fmt(Math.round(p.per100)) + '원',
        note: '100' + p.unit + '당 · 총 ' + fmt(p.totalSize) + p.unit + ' / ' + won(p.totalPrice),
        cls: i === 0 ? 'is-good' : ''
      };
    });
    rows.push({ k: '최저가', v: best.name, note: '100' + best.unit + '당 ' + fmt(Math.round(best.per100)) + '원', total: true });

    var monthly = get('monthly');
    var yearly = null, bestYearly = null;
    if (isFinite(monthly) && monthly > 0) {
      yearly = monthly * 12 / best.totalSize * best.totalPrice;
      bestYearly = yearly;
      rows.push({ k: '연간 소비 비용 (최저가 기준)', v: won(yearly), note: '월 ' + fmt(monthly) + best.unit + ' 소비' });
      var worstYearly = monthly * 12 / worst.totalSize * worst.totalPrice;
      rows.push({ k: '최고가 대비 연 절감', v: won(worstYearly - yearly), cls: 'is-good' });
    }

    var table = list.map(function (p) {
      return [p.name, fmt(p.price) + '원' + (p.ship ? ' +배송 ' + fmt(p.ship) : ''), fmt(p.totalSize) + p.unit,
              fmt(Math.round(p.per100)) + '원', fmt(Math.round(p.perUnit)) + '원'];
    });

    return {
      verdict: {
        kicker: '100' + best.unit + '당 최저가', icon: '🏷️',
        title: best.name + ' · ' + fmt(Math.round(best.per100)) + '원',
        desc: '가장 비싼 ' + worst.name + '(' + fmt(Math.round(worst.per100)) + '원)보다 <b>'
              + pct((worst.per100 - best.per100) / worst.per100 * 100, 1) + ' 저렴</b>합니다. '
              + (gap >= 1.5 ? '단가 차이가 ' + fmt(gap, 2) + '배로, 대용량·묶음 구매가 확실히 유리합니다.' : '단가 차이가 ' + fmt(gap, 2) + '배로 크지 않습니다. 보관·유통기한을 함께 고려하세요.')
              + (mixed ? ' 단위가 섞여 있어 100' + best.unit + ' 기준으로 환산했습니다.' : ''),
        cls: 'verdict--ok'
      },
      stats: [
        { l: '최저 단가', v: fmt(Math.round(best.per100)) + '원', s: '100' + best.unit + '당', cls: 'is-accent' },
        { l: '최고 단가', v: fmt(Math.round(worst.per100)) + '원', s: worst.name },
        { l: '단가 차이', v: fmt(gap, 2) + '배' },
        { l: '연 절감액', v: yearly !== null ? wonShort((monthly * 12 / worst.totalSize * worst.totalPrice) - yearly) : '-', s: '최저가 선택 시' }
      ],
      rows: rows,
      bars: list.map(function (p) {
        return { l: p.name + ' (' + fmt(Math.round(p.per100)) + '원/100' + p.unit + ')', v: p.per100, max: worst.per100,
                 text: fmt(Math.round(p.per100)) + '원', color: p === best ? 'bar__fill--green' : 'bar__fill--kcal' };
      }),
      table: { head: ['제품', '가격(배송포함)', '총 용량', '100' + best.unit + '당', '1개당'], rows: table,
               note: '배송비가 있으면 총액에 더해 단가를 계산했습니다.' },
      notes: [
        { html: '<b>대용량이 항상 싼 것은 아닙니다.</b> 1kg 12,900원(100g당 1,290원)과 350g 4,900원(100g당 1,400원)은 8% 차이입니다. 소비 속도가 느리다면 유통기한 안에 다 쓰지 못해 오히려 손해일 수 있습니다.' },
        { html: '<b>배송비를 꼭 넣으세요.</b> 3,000원 배송비가 붙으면 350g 제품 단가가 1,400원→2,257원으로 뛰어 판정이 뒤집힙니다.' }
      ]
    };
  }

  WT.mount({
    fields: ["name1", "price1", "size1", "unit1", "qty1", "ship1", "name2", "price2", "size2", "unit2", "qty2", "ship2", "name3", "price3", "size3", "unit3", "qty3", "ship3", "monthly"],
    segs: [],
    checks: [],
    required: ["price1", "size1", "price2", "size2"],
    presets: {"대용량 vs 낱개 (g)": {"fields": {"name1": "대용량 1kg", "price1": 12900, "size1": 1000, "unit1": "g", "qty1": 1, "ship1": 0, "name2": "낱개 350g", "price2": 4900, "size2": 350, "unit2": "g", "qty2": 1, "ship2": 3000, "name3": "중형 600g", "price3": 8500, "size3": 600, "unit3": "g", "qty3": 1, "ship3": 0, "monthly": 500}}, "커피 500g vs 1kg": {"fields": {"name1": "원두 1kg", "price1": 24900, "size1": 1000, "unit1": "g", "qty1": 1, "ship1": 0, "name2": "원두 500g", "price2": 13900, "size2": 500, "unit2": "g", "qty2": 1, "ship2": 2500, "name3": "원두 200g", "price3": 6900, "size3": 200, "unit3": "g", "qty3": 1, "ship3": 0, "monthly": 300}}, "샴푸 1L vs 500ml×2": {"fields": {"name1": "대용량 1L", "price1": 18900, "size1": 1000, "unit1": "ml", "qty1": 1, "ship1": 0, "name2": "500ml 2개 묶음", "price2": 15000, "size2": 500, "unit2": "ml", "qty2": 2, "ship2": 0, "name3": "200ml", "price3": 4500, "size3": 200, "unit3": "ml", "qty3": 1, "ship3": 3000, "monthly": 400}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
