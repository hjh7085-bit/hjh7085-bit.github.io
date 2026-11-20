/* 수도·도시가스 요금 계산기 (사용량별 예상 고지서) — water-gas-bill/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function water(kwh, fee, sewer, base) {
    var use = kwh * fee;
    var sew = kwh * sewer;
    return { use: use, sewer: sew, base: base, total: use + sew + base };
  }
  function gas(mj, fee, base) {
    var use = mj * fee;
    return { use: use, base: base, total: use + base };
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var w = get('water') || 0, gf = get('waterFee') || 0, sf = get('sewerFee') || 0, wb = get('waterBase') || 0;
    var g = get('gas') || 0, gfe = get('gasFee') || 0, gb = get('gasBase') || 0;
    var mode = seg('mode');

    var W = water(w, gf, sf, wb);
    var G = gas(g, gfe, gb);
    var total = (mode === 'gas' ? 0 : W.total) + (mode === 'water' ? 0 : G.total);

    var rows = [];
    if (mode !== 'gas') {
      rows.push({ k: '수도 사용량', v: fmt(w, 1) + '㎥' });
      rows.push({ k: '상수도 요금', v: won(W.use), note: fmt(gf) + '원/㎥' });
      rows.push({ k: '하수도 요금', v: won(W.sewer), note: fmt(sf) + '원/㎥' });
      if (wb > 0) rows.push({ k: '수도 기본요금', v: won(wb) });
      rows.push({ k: '수도 합계', v: won(W.total) });
    }
    if (mode !== 'water') {
      rows.push({ k: '가스 사용량', v: fmt(g) + 'MJ', note: '약 ' + fmt(g / 42.1, 1) + '㎥' });
      rows.push({ k: '가스 사용 요금', v: won(G.use), note: fmt(gfe) + '원/MJ' });
      if (gb > 0) rows.push({ k: '가스 기본요금', v: won(gb) });
      rows.push({ k: '가스 합계', v: won(G.total) });
    }
    rows.push({ k: '총 공과금', v: won(total), total: true });
    rows.push({ k: '1인당 (2인 기준)', v: won(total / 2) });

    var table = [[5, 300], [10, 600], [15, 800], [20, 1200], [30, 2000]].map(function (r) {
      var w2 = water(r[0], gf, sf, wb), g2 = gas(r[1], gfe, gb);
      return [r[0] + '㎥ / ' + r[1] + 'MJ', won(w2.total), won(g2.total), won(w2.total + g2.total)];
    });

    return {
      verdict: {
        kicker: '예상 공과금 (월)', icon: '🚰',
        title: won(total),
        desc: (mode !== 'gas' ? '수도 ' + fmt(w, 1) + '㎥(' + won(W.total) + ')' : '') +
              (mode === 'both' ? ' + ' : '') +
              (mode !== 'water' ? '가스 ' + fmt(g) + 'MJ(' + won(G.total) + ')' : '') +
              ' = <b>' + won(total) + '</b>입니다. 가스 사용량은 약 ' + fmt(g / 42.1, 1) + '㎥에 해당합니다.',
        cls: 'verdict--info'
      },
      stats: [
        { l: '수도', v: mode === 'gas' ? '-' : won(W.total) },
        { l: '가스', v: mode === 'water' ? '-' : won(G.total) },
        { l: '총 공과금', v: won(total), cls: 'is-accent' },
        { l: '2인 기준 1인', v: won(total / 2) }
      ],
      rows: rows,
      bars: [
        { l: '상수도', v: W.use, max: Math.max(1, total), text: won(W.use), color: 'bar__fill--green' },
        { l: '하수도', v: W.sewer, max: Math.max(1, total), text: won(W.sewer), color: 'bar__fill--accent' },
        { l: '가스', v: G.use + G.base, max: Math.max(1, total), text: won(G.use + G.base), color: 'bar__fill--kcal' }
      ],
      table: { head: ['사용량', '수도', '가스', '합계'], rows: table, note: '같은 단가에서 사용량만 바꾼 값입니다.' },
      notes: [{ html: '<b>가스 요금 계산</b> — 도시가스는 MJ(메가줄)로 과금합니다. 1㎥ ≈ 42.1MJ이고, 겨울철 난방을 켜면 월 1,000~2,000MJ를 쓰기도 합니다. 서울 기준 MJ당 20원이면 월 2~4만원입니다.' }]
    };
  }

  WT.mount({
    fields: ["water", "waterFee", "sewerFee", "waterBase", "gas", "gasFee", "gasBase"],
    segs: ["mode"],
    checks: [],
    required: ["water", "gas"],
    presets: {"수도 15㎥ + 가스 800MJ": {"fields": {"water": 15, "waterFee": 480, "sewerFee": 400, "waterBase": 1100, "gas": 800, "gasFee": 20, "gasBase": 0}, "segs": {"mode": "both"}}, "수도 25㎥ + 가스 1,500MJ": {"fields": {"water": 25, "waterFee": 480, "sewerFee": 400, "waterBase": 1100, "gas": 1500, "gasFee": 20, "gasBase": 0}, "segs": {"mode": "both"}}, "수도만 8㎥": {"fields": {"water": 8, "waterFee": 480, "sewerFee": 400, "waterBase": 1100, "gas": 0, "gasFee": 20, "gasBase": 0}, "segs": {"mode": "water"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
