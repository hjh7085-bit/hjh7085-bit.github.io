/* 해외직구 관세·부가세 계산기 ($150 / 미국 $200) — customs-duty-150/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var price = get('price'), ship = get('ship') || 0, fx = get('fx');
    var qty = Math.max(1, Math.round(get('qty') || 1));
    var origin = seg('origin');
    var rateSel = seg('rate');
    var rate = rateSel === 'custom' ? (get('customRate') || 0) / 100 : Number(rateSel);
    var limit = origin === 'us' ? 200 : 150;

    var goodsUsd = price * qty;
    var goodsKrw = goodsUsd * fx;
    var shipKrw = ship * fx;
    var dutiable = goodsKrw + shipKrw;
    var free = goodsUsd <= limit;
    var duty = free ? 0 : dutiable * rate;
    var vat = free ? 0 : (dutiable + duty) * 0.1;
    var total = duty + vat;
    var finalKrw = goodsKrw + shipKrw + total;
    var finalUsd = finalKrw / fx;

    var rows = [
      { k: '상품 가격', v: fmt(goodsUsd, 2) + ' $', note: won(goodsKrw) },
      { k: '배송비', v: fmt(ship, 2) + ' $', note: won(shipKrw) },
      { k: '면세 한도', v: '$' + limit, note: origin === 'us' ? '미국 발송' : '미국 외 국가' },
      { k: '판정', v: free ? '면세 (목록통관)' : '과세 (일반통관)', cls: free ? 'is-good' : 'is-bad' },
      { k: '과세가격', v: won(dutiable), note: '상품가 + 배송비' },
      { k: '관세 (' + fmt(rate * 100, 1) + '%)', v: won(duty) },
      { k: '부가세 (10%)', v: won(vat), note: '(과세가격 + 관세) × 10%' },
      { k: '세금 합계', v: won(total), total: true, cls: total > 0 ? 'is-bad' : 'is-good' },
      { k: '최종 구매가', v: won(finalKrw), note: '약 ' + fmt(finalUsd, 2) + ' $' }
    ];

    var over = goodsUsd - limit;
    var advice = free
      ? '한도까지 $' + fmt(limit - goodsUsd, 2) + ' 여유가 있습니다. 이 안에서는 세금이 없습니다.'
      : '한도를 $' + fmt(over, 2) + ' 초과했습니다. 세금이 상품가의 ' + pct(total / (goodsKrw + shipKrw) * 100, 1) + '입니다.';

    var table = [
      ['$100', won(100 * fx), '면세', '—'],
      ['$150', won(150 * fx), origin === 'us' ? '면세' : '한도', '—'],
      ['$200', won(200 * fx), '면세', '—'],
      ['$250', won(250 * fx), won((250 * fx) * rate), won((250 * fx * (1 + rate)) * 0.1)],
      ['$300', won(300 * fx), won((300 * fx) * rate), won((300 * fx * (1 + rate)) * 0.1)]
    ];

    return {
      verdict: {
        kicker: free ? '면세 대상' : '과세 대상',
        icon: free ? '🟢' : '💸',
        title: free ? '세금 0원' : won(total),
        desc: (free
                ? '상품가 $' + fmt(goodsUsd, 2) + '는 ' + (origin === 'us' ? '미국' : '미국 외') + ' 한도 $' + limit + ' 이내라 <b>관세·부가세가 없습니다</b>. 최종 결제액은 배송비 포함 <b>' + won(finalKrw) + '</b>입니다.'
                : '관세 <b>' + won(duty) + '</b> + 부가세 <b>' + won(vat) + '</b> = <b>' + won(total) + '</b>을 냅니다. 최종 구매가는 <b>' + won(finalKrw) + '</b>입니다.')
              + ' ' + advice,
        cls: free ? 'verdict--ok' : 'verdict--warn'
      },
      stats: [
        { l: '판정', v: free ? '면세' : '과세', cls: free ? 'is-good' : 'is-bad' },
        { l: '관세', v: free ? '0원' : wonShort(duty) },
        { l: '부가세', v: free ? '0원' : wonShort(vat) },
        { l: '최종 구매가', v: wonShort(finalKrw), cls: 'is-accent', s: '배송비 포함' }
      ],
      rows: rows,
      bars: [
        { l: '상품가', v: goodsKrw, max: finalKrw, text: wonShort(goodsKrw), color: 'bar__fill--accent' },
        { l: '배송비', v: shipKrw, max: finalKrw, text: wonShort(shipKrw), color: 'bar__fill--carb' },
        { l: '세금', v: total, max: finalKrw, text: wonShort(total), color: 'bar__fill--kcal' }
      ],
      table: { head: ['상품가', '원화 환산', '관세', '부가세(예상)'], rows: table,
               note: '미국 발송 · 관세율 ' + fmt(rate * 100, 1) + '% 기준입니다. 배송비는 제외했습니다.' },
      notes: [
        { html: '<b>나눠 사도 합산될 수 있습니다</b> — 같은 날, 같은 발송인, 같은 수취인에게 온 물품은 건별로 보지 않고 합산해 과세합니다. 한도 회피를 위한 분할은 세관이 판단해 <b>추징</b>할 수 있습니다.' },
        { html: '<b>목록통관 배제 품목</b>은 금액과 무관하게 일반통관입니다. 건강기능식품·의약품·식품·일부 화장품·전자담배 등이 해당되며, 이 경우 관세사 수수료(2만~5만원)도 붙습니다.' }
      ]
    };
  }

  WT.mount({
    fields: ["price", "ship", "fx", "qty", "customRate"],
    segs: ["origin", "rate"],
    checks: [],
    required: ["price", "fx"],
    presets: {"미국 $180 (면세)": {"fields": {"price": 180, "ship": 20, "fx": 1380, "qty": 1, "customRate": 8}, "segs": {"origin": "us", "rate": "0.08"}}, "미국 $250 (과세)": {"fields": {"price": 250, "ship": 30, "fx": 1380, "qty": 1, "customRate": 8}, "segs": {"origin": "us", "rate": "0.08"}}, "일본 $160 의류": {"fields": {"price": 160, "ship": 15, "fx": 920, "qty": 2, "customRate": 13}, "segs": {"origin": "etc", "rate": "0.13"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
