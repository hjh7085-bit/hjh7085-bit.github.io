/* 양도소득세 간이 계산기 (1주택 비과세·장기보유특별공제) — capital-gains-house/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function incomeTax(base) {
    if (base <= 14000000) return base * 0.06;
    if (base <= 50000000) return base * 0.15 - 1260000;
    if (base <= 88000000) return base * 0.24 - 5760000;
    if (base <= 150000000) return base * 0.35 - 15440000;
    if (base <= 300000000) return base * 0.38 - 19940000;
    if (base <= 500000000) return base * 0.40 - 25940000;
    if (base <= 1000000000) return base * 0.42 - 35940000;
    return base * 0.45 - 65940000;
  }

  function calc(sell, buy, cost, hold, live, kind) {
    var gain = sell - buy - cost;
    var taxable = gain;
    var high = 0;
    if (kind === 'one' && sell > 1200000000) {
      high = gain * (sell - 1200000000) / sell;
      taxable = high;
    }
    var deduct = 0;
    if (kind === 'one' && gain > 0) {
      var h = Math.min(Math.max(0, hold), 10) * 0.02;
      var l = Math.min(Math.max(0, live), 10) * 0.04;
      deduct = taxable * Math.min(0.8, h + l);
    }
    var base = Math.max(0, taxable - deduct - 2500000);
    base = Math.floor(base / 1000) * 1000;
    var tax = Math.max(0, incomeTax(base));
    return { gain: gain, high: high, taxable: taxable, deduct: deduct, base: base,
             tax: tax, local: tax * 0.1, total: tax * 1.1 };
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var sell = (get('sell') || 0) * 10000, buy = (get('buy') || 0) * 10000;
    var cost = (isFinite(get('cost')) ? get('cost') : 0) * 10000;
    var hold = isFinite(get('hold')) ? get('hold') : 0;
    var live = isFinite(get('live')) ? get('live') : 0;
    var kind = seg('house');

    var exempt = (kind === 'one' && sell <= 1200000000 && hold >= 2);
    if (kind === 'temp2' && hold >= 2) exempt = sell <= 1200000000;
    var c = calc(sell, buy, cost, hold, live, kind);

    var rows = [
      { k: '양도가액', v: won(sell) },
      { k: '취득가액', v: '-' + won(buy) },
      { k: '필요경비', v: '-' + won(cost) }
    ];
    if (exempt) {
      rows.push({ k: '양도차익', v: won(c.gain) });
      rows.push({ k: '1세대1주택 비과세', v: '전액 면제', note: '12억원 이하 · 2년 이상 보유' });
      rows.push({ k: '납부할 세금', v: '0원', total: true });
    } else {
      if (c.high > 0) rows.push({ k: '고가주택 과세분 (12억 초과 안분)', v: won(c.high), note: '양도차익 × 초과분 비율' });
      if (c.deduct > 0) rows.push({ k: '장기보유특별공제', v: '-' + won(c.deduct), note: '보유 ' + fmt(Math.min(hold, 10)) + '년 · 거주 ' + fmt(Math.min(live, 10)) + '년' });
      rows.push({ k: '기본공제', v: '-2,500,000원' });
      rows.push({ k: '과세표준', v: won(c.base) });
      rows.push({ k: '산출세액', v: won(c.tax) });
      rows.push({ k: '지방소득세 (10%)', v: won(c.local) });
      rows.push({ k: '총 납부세액', v: won(c.total), total: true });
    }

    var table = [];
    [2, 3, 5, 7, 10, 15].forEach(function (h) {
      var l = Math.min(live, h);
      var x = calc(sell, buy, cost, h, l, kind);
      table.push([h + '년', pct(Math.min(0.8, Math.min(h, 10) * 0.02 + Math.min(l, 10) * 0.04) * 100, 0),
                  won(x.deduct), won(x.total)]);
    });

    if (exempt) {
      return {
        verdict: { kicker: '양도소득세', icon: '🎉', title: '0원 (비과세)',
          desc: '1세대1주택 · 양도가 <b>' + won(sell) + '</b>(12억 이하) · 보유 ' + fmt(hold) + '년으로 <b>비과세</b> 요건을 충족합니다. 양도차익 ' + won(c.gain) + '에 세금이 붙지 않습니다. 다만 취득 당시 12억 초과 고가주택이거나 보유 2년 미만이면 과세됩니다.',
          cls: 'verdict--ok' },
        stats: [ { l: '양도차익', v: won(c.gain) }, { l: '납부세액', v: '0원', cls: 'is-good' },
                 { l: '비과세 한도', v: '12억원' }, { l: '보유기간', v: fmt(hold) + '년' } ],
        rows: rows,
        table: { head: ['보유기간', '장특공률', '공제액', '세금(참고)'], rows: table,
                 note: '비과세 대상이므로 표의 세금은 12억을 넘겼을 때를 가정한 참고값입니다.' },
        notes: [{ html: '<b>12억원을 넘기면</b> 초과분만 과세됩니다 — 양도차익 전체가 아니라 12억 초과 비율만큼만 세금이 붙습니다. 위 표에서 보유기간별 부담을 확인하세요.' }]
      };
    }

    return {
      verdict: {
        kicker: '총 납부세액 (지방소득세 포함)', icon: '📊',
        title: won(c.total),
        desc: '양도차익 <b>' + won(c.gain) + '</b>' + (c.high > 0 ? ' 중 12억 초과분 <b>' + won(c.high) + '</b>만 과세' : '') +
              ', 장특공 <b>' + won(c.deduct) + '</b>을 빼고 기본공제 250만원을 적용한 과세표준은 <b>' + won(c.base) + '</b>입니다. ' +
              '보유 ' + fmt(hold) + '년·거주 ' + fmt(live) + '년 기준입니다.',
        cls: 'verdict--warn'
      },
      stats: [
        { l: '양도차익', v: won(c.gain) },
        { l: '장특공', v: won(c.deduct) },
        { l: '총 납부세액', v: won(c.total), cls: 'is-accent' },
        { l: '실효세율', v: pct(c.total / Math.max(1, c.gain) * 100, 1), s: '양도차익 대비' }
      ],
      rows: rows,
      table: { head: ['보유기간', '장특공률', '공제액', '세금'], rows: table,
               note: '거주기간은 보유기간과 같거나 짧게 적용했습니다.' },
      notes: [{ html: '<b>거주가 세금을 줄입니다</b> — 1주택 장특공은 보유 연 2%보다 거주 연 4%가 두 배 큽니다. 10년 보유만 하면 20%지만, 10년 보유+10년 거주면 60%까지 공제됩니다. 실제 거주한 기간의 주민등록·전입세대 열람으로 입증합니다.' }]
    };
  }

  WT.mount({
    fields: ["buy", "sell", "hold", "live", "cost"],
    segs: ["house"],
    checks: [],
    required: ["buy", "sell"],
    presets: {"1주택 6억→15억 · 10년 보유": {"fields": {"buy": 60000, "sell": 150000, "hold": 10, "live": 5, "cost": 1000}, "segs": {"house": "one"}}, "1주택 5억→11억 (비과세)": {"fields": {"buy": 50000, "sell": 110000, "hold": 6, "live": 4, "cost": 800}, "segs": {"house": "one"}}, "다주택 4억→7억 · 3년 보유": {"fields": {"buy": 40000, "sell": 70000, "hold": 3, "live": 1, "cost": 600}, "segs": {"house": "multi"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
