/* 평수 계산기 (㎡↔평 변환·인테리어 자재량) — area-convert/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var PYEONG = 3.305785;

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var unit = seg('unit');
    var raw = get('area');
    var m2 = unit === 'pyeong' ? raw * PYEONG : raw;
    var pyeong = m2 / PYEONG;
    var ratio = get('ratio') || 74;
    var exclusive = m2 * ratio / 100;
    var exclusivePyeong = exclusive / PYEONG;
    var supply = m2;
    var height = get('height') || 2.3;
    var waste = 1 + (get('waste') || 10) / 100;

    // 벽 면적 근사: 바닥면적 × (2 × 층고 / 유효폭 계수) — 실무 경험식 2.6 @2.3m
    var wallFactor = 2.6 * (height / 2.3);
    var wallArea = exclusive * wallFactor * waste;
    var ceiling = exclusive * waste;
    var wallpaperRolls = Math.ceil(wallArea / 16.5);       // 실크벽지 1롤 5평(16.5㎡)
    var floorRolls = Math.ceil(ceiling / 3.3 / 5);           // 장판 1롤 5평
    var floorM2 = ceiling;
    var paintL = (wallArea + ceiling) / 7 * 2;               // 7㎡/L × 2회

    var priceMan = get('price');
    var perPyeongSupply = isFinite(priceMan) && priceMan > 0 ? priceMan / pyeong : null;
    var perPyeongExcl = isFinite(priceMan) && priceMan > 0 ? priceMan / exclusivePyeong : null;

    var rows = [
      { k: '면적 (㎡)', v: fmt(m2, 2) + ' ㎡', total: true },
      { k: '면적 (평)', v: fmt(pyeong, 2) + ' 평' },
      { k: '전용면적 (전용률 ' + fmt(ratio, 0) + '%)', v: fmt(exclusive, 2) + ' ㎡', note: fmt(exclusivePyeong, 2) + '평' },
      { k: '공급면적', v: fmt(supply, 2) + ' ㎡', note: fmt(pyeong, 2) + '평' },
      { k: '벽 면적 (천장 제외)', v: fmt(wallArea, 1) + ' ㎡', note: '층고 ' + fmt(height, 1) + 'm · 여유 ' + fmt((waste - 1) * 100, 0) + '%' },
      { k: '실크벽지 (1롤 5평)', v: fmt(wallpaperRolls) + ' 롤', cls: 'is-accent' },
      { k: '장판 (1롤 5평)', v: fmt(floorRolls) + ' 롤', note: '바닥 ' + fmt(floorM2, 1) + '㎡' },
      { k: '페인트 (2회 도장)', v: fmt(paintL, 1) + ' L', note: '7㎡/L 기준' }
    ];
    if (perPyeongSupply !== null) {
      rows.push({ k: '평당 가격 (공급)', v: won(perPyeongSupply * 10000), note: '매매가 ' + won(priceMan * 10000) });
      rows.push({ k: '평당 가격 (전용)', v: won(perPyeongExcl * 10000), note: '실사용 기준' });
    }

    var table = [
      ['59㎡', fmt(59 / PYEONG, 2) + '평', fmt(59 * 0.74, 1) + '㎡', '20~24평형'],
      ['74㎡', fmt(74 / PYEONG, 2) + '평', fmt(74 * 0.74, 1) + '㎡', '25평형'],
      ['84㎡', fmt(84 / PYEONG, 2) + '평', fmt(84 * 0.74, 1) + '㎡', '32~34평형'],
      ['101㎡', fmt(101 / PYEONG, 2) + '평', fmt(101 * 0.74, 1) + '㎡', '38~40평형'],
      ['1평', '1.00평', '3.31㎡', '3.3058㎡']
    ];

    return {
      verdict: {
        kicker: '면적 환산', icon: '📐',
        title: fmt(m2, 2) + '㎡ = ' + fmt(pyeong, 2) + '평',
        desc: '입력한 ' + fmt(raw, 2) + (unit === 'pyeong' ? '평' : '㎡') + ' 기준입니다. '
              + '전용률 ' + fmt(ratio, 0) + '%를 적용하면 실사용 면적은 <b>' + fmt(exclusive, 2) + '㎡(' + fmt(exclusivePyeong, 2) + '평)</b>입니다. '
              + '벽지 <b>' + wallpaperRolls + '롤</b>, 장판 <b>' + floorRolls + '롤</b>이 필요합니다.',
        cls: 'verdict--accent'
      },
      stats: [
        { l: '㎡', v: fmt(m2, 2), s: '제곱미터' },
        { l: '평', v: fmt(pyeong, 2), cls: 'is-accent', s: '1평=3.3058㎡' },
        { l: '전용면적', v: fmt(exclusive, 1) + '㎡', s: fmt(exclusivePyeong, 1) + '평' },
        { l: '벽지', v: wallpaperRolls + '롤', s: '실크 5평/롤' }
      ],
      rows: rows,
      table: { head: ['면적', '평', '전용(74%)', '흔히 부르는 평형'], rows: table,
               note: '국내 아파트는 공급면적 기준으로 25·34평형으로 부릅니다.' },
      notes: [
        { html: '<b>공급면적과 전용면적</b> — 공급면적은 계단·복도 등 공용면적을 포함하고, 전용면적은 현관문 안쪽 실사용 면적입니다. 84㎡(공급) 아파트의 전용은 59~62㎡(18~19평) 정도입니다.' },
        { html: '벽지 1롤은 보통 <b>5평(16.5㎡)</b>입니다. 실제 도배는 벽 면적의 10% 여유를 두고, 패턴이 큰 벽지는 15~20%를 더 잡습니다.' }
      ]
    };
  }

  WT.mount({
    fields: ["area", "ratio", "price", "height", "waste"],
    segs: ["unit"],
    checks: [],
    required: ["area"],
    presets: {"84㎡ 아파트": {"fields": {"area": 84, "ratio": 74, "price": 85000, "height": 2.3, "waste": 10}, "segs": {"unit": "m2"}}, "25평": {"fields": {"area": 25, "ratio": 74, "price": 60000, "height": 2.3, "waste": 10}, "segs": {"unit": "pyeong"}}, "59㎡ 오피스텔": {"fields": {"area": 59, "ratio": 55, "price": 32000, "height": 2.4, "waste": 10}, "segs": {"unit": "m2"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
