/* 증여세 간이 계산기 (가족 공제 10년 합산·세대생략 할증) — gift-tax/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function bracket(b) {
    if (b <= 100000000) return { r: 0.10, d: 0 };
    if (b <= 500000000) return { r: 0.20, d: 10000000 };
    if (b <= 1000000000) return { r: 0.30, d: 60000000 };
    if (b <= 3000000000) return { r: 0.40, d: 160000000 };
    return { r: 0.50, d: 460000000 };
  }
  function deduction(rel) {
    if (rel === 'spouse') return 600000000;
    if (rel === 'up') return 50000000;
    if (rel === 'down') return 50000000;
    if (rel === 'minor') return 20000000;
    return 10000000;
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var rel = seg('rel');
    var amount = (get('amount') || 0) * 10000;
    var prev = (isFinite(get('prev')) ? get('prev') : 0) * 10000;
    var debt = (isFinite(get('debt')) ? get('debt') : 0) * 10000;
    var skip = chk('skip').indexOf('yes') >= 0;

    var net = Math.max(0, amount - debt);
    var ded = deduction(rel);
    var cum = net + prev;
    var base = Math.max(0, Math.floor((cum - ded) / 1000) * 1000);
    var br = bracket(base);
    var tax = Math.max(0, base * br.r - br.d);
    var surcharge = skip ? tax * 0.3 : 0;
    var total = tax + surcharge;
    var relLabel = { spouse: '배우자', up: '직계존속', down: '직계비속', minor: '미성년 자녀', other: '기타 친족' }[rel];

    var rows = [
      { k: '증여 재산가액', v: won(amount) },
      { k: '채무 인수', v: '-' + won(debt) },
      { k: '과세가액', v: won(net) }
    ];
    if (prev > 0) rows.push({ k: '10년 내 기증여액', v: won(prev) });
    rows.push({ k: '공제 한도 (' + relLabel + ')', v: '-' + won(ded) });
    if (cum > ded) rows.push({ k: '과세표준', v: won(base), note: '10년 합산 기준' });
    rows.push({ k: '산출세액', v: won(tax), note: base > 0 ? pct(br.r * 100, 0) + ' 구간' : '공제 한도 이내' });
    if (surcharge > 0) rows.push({ k: '세대생략 할증 (30%)', v: won(surcharge) });
    rows.push({ k: '총 증여세', v: won(total), total: true });
    if (total > 0) {
      rows.push({ k: '신고기한', v: '증여일부터 3개월', note: '기한 내 신고 시 3% 공제(별도)' });
    }

    var table = [5000, 10000, 20000, 30000, 50000, 100000].map(function (a) {
      var n2 = a * 10000;
      var b2 = Math.max(0, n2 - ded);
      var br2 = bracket(b2);
      var t2 = Math.max(0, b2 * br2.r - br2.d);
      return [fmt(a) + '만', won(Math.max(0, n2 - ded)), won(t2), pct(n2 > 0 ? t2 / n2 * 100 : 0, 1)];
    });

    var remain = Math.max(0, ded - cum);
    return {
      verdict: {
        kicker: '총 증여세', icon: total > 0 ? '🎁' : '🎉',
        title: won(total),
        desc: '과세가액 <b>' + won(net) + '</b>에서 ' + relLabel + ' 공제 <b>' + won(ded) + '</b>을 뺀 과세표준은 <b>' + won(base) + '</b>입니다. ' +
              (remain > 0 ? '공제 한도가 <b>' + won(remain) + '</b> 남아 있어 추가 증여도 세금 없이 가능합니다.' : '공제 한도를 초과했습니다. 10년 뒤에 다시 공제가 회복됩니다.'),
        cls: total > 0 ? 'verdict--warn' : 'verdict--ok'
      },
      stats: [
        { l: '공제 한도', v: won(ded) },
        { l: '과세표준', v: won(base) },
        { l: '총 증여세', v: won(total), cls: 'is-accent' },
        { l: '증여가액 대비', v: pct(amount > 0 ? total / amount * 100 : 0, 2) }
      ],
      rows: rows,
      table: { head: ['증여액', '과세표준', '세금', '비율'], rows: table,
               note: relLabel + ' 기준, 이전 증여 없음·할증 없음으로 계산한 값입니다.' },
      notes: [{ html: '<b>10년이 지나면 공제가 다시 찹니다</b> — 증여세 공제는 10년 단위로 합산하므로, 자녀에게 10년마다 5,000만원씩 주면 세금 없이 1억원을 넘길 수 있습니다. 다만 부동산은 증여 시점 평가액과 취득세(3.5%)가 별도로 붙습니다.' }]
    };
  }

  WT.mount({
    fields: ["amount", "prev", "debt"],
    segs: ["rel"],
    checks: ["skip"],
    required: ["amount"],
    presets: {"성인 자녀 5억": {"fields": {"amount": 50000, "prev": 0, "debt": 0}, "segs": {"rel": "down"}, "checks": {"skip": []}}, "성인 자녀 1억": {"fields": {"amount": 10000, "prev": 0, "debt": 0}, "segs": {"rel": "down"}, "checks": {"skip": []}}, "배우자 10억": {"fields": {"amount": 100000, "prev": 0, "debt": 0}, "segs": {"rel": "spouse"}, "checks": {"skip": []}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
