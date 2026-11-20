/* 위드마크 혈중알코올농도·분해시간 참고 계산기 — bac-time/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var ETH = 0.789;           // 에탄올 밀도 g/ml
  var BETA = 0.015;          // 시간당 분해율 %/h

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var weight = get('weight') || 70;
    var male = seg('sex') === 'm';
    var soju = isFinite(get('soju')) ? get('soju') : 0;
    var beer = isFinite(get('beer')) ? get('beer') : 0;
    var sojuDeg = isFinite(get('sojuDeg')) ? get('sojuDeg') : 16.9;
    var beerDeg = isFinite(get('beerDeg')) ? get('beerDeg') : 4.5;
    var sojuMl = isFinite(get('sojuMl')) ? get('sojuMl') : 50;
    var beerMl = isFinite(get('beerMl')) ? get('beerMl') : 500;
    var hours = isFinite(get('hours')) ? get('hours') : 0;

    var mlAlcohol = soju * sojuMl * sojuDeg / 100 + beer * beerMl * beerDeg / 100;
    var grams = mlAlcohol * ETH;
    var r = male ? 0.68 : 0.55;
    var peak = grams / (weight * r) / 10.55;    // g/kg → g/100mL(%)
    var bac = Math.max(0, peak - BETA * hours);
    var peakHour = grams > 0 ? 0.5 : 0;
    var toZero = peak / BETA;
    var remainH = bac / BETA;
    var legal = bac >= 0.08 ? '면허취소' : bac >= 0.03 ? '면허정지' : bac > 0 ? '기준 이하(단속 대상 아님)' : '알코올 없음';

    var rows = [
      { k: '섭취한 순수 알코올', v: fmt(mlAlcohol, 1) + 'ml (' + fmt(grams, 1) + 'g)', note: '도수 × 용량' },
      { k: '위드마크 계수 (r)', v: fmt(r, 2), note: male ? '남성 0.68' : '여성 0.55' },
      { k: '최고 혈중알코올농도 (추정)', v: fmt(peak, 3) + '%' },
      { k: '경과 ' + fmt(hours, 1) + '시간 후', v: fmt(bac, 3) + '%', total: true },
      { k: '판정 (참고)', v: legal },
      { k: '완전 분해까지', v: fmt(toZero, 1) + '시간', note: '음주 시작 기준' },
      { k: '남은 분해 시간', v: fmt(remainH, 1) + '시간' }
    ];

    var table = [0, 1, 2, 4, 6, 8, 12].map(function (h) {
      var b = Math.max(0, peak - BETA * h);
      return [h + '시간', fmt(b, 3) + '%', b >= 0.08 ? '취소' : b >= 0.03 ? '정지' : b > 0 ? '기준 이하' : '없음'];
    });

    var zeroAt = peak / BETA;
    return {
      verdict: {
        kicker: '추정 혈중알코올농도', icon: '🚨',
        title: fmt(bac, 3) + '%',
        desc: '체중 ' + fmt(weight) + 'kg ' + (male ? '남성' : '여성') + '이 순수 알코올 ' + fmt(grams, 1) + 'g을 섭취하고 ' + fmt(hours, 1) + '시간이 지난 시점의 추정치입니다. ' +
              '최고치는 ' + fmt(peak, 3) + '%이고, 완전히 분해되려면 음주 시작 후 <b>' + fmt(zeroAt, 1) + '시간</b>이 걸립니다. ' +
              '0.03% 이상이면 면허정지, 0.08% 이상이면 면허취소 기준입니다.',
        cls: bac >= 0.03 ? 'verdict--bad' : 'verdict--ok'
      },
      stats: [
        { l: '현재 추정 농도', v: fmt(bac, 3) + '%', cls: bac >= 0.03 ? 'is-bad' : 'is-good' },
        { l: '최고 농도', v: fmt(peak, 3) + '%' },
        { l: '완전 분해', v: fmt(zeroAt, 1) + '시간', s: '음주 시작 기준' },
        { l: '판정', v: legal }
      ],
      rows: rows,
      bars: [
        { l: '현재 농도', v: bac, max: 0.15, text: fmt(bac, 3) + '%', color: bac >= 0.08 ? 'bar__fill--kcal' : bac >= 0.03 ? 'bar__fill--amber' : 'bar__fill--green' },
        { l: '정지 기준 0.03%', v: 0.03, max: 0.15, text: '0.03%', color: 'bar__fill--accent' },
        { l: '취소 기준 0.08%', v: 0.08, max: 0.15, text: '0.08%', color: 'bar__fill--prot' }
      ],
      table: { head: ['경과 시간', '추정 농도', '판정'], rows: table,
               note: '개인차가 크므로 실제 측정과 다를 수 있습니다. 법원은 분해율을 0.008%/h로 낮춰 보수적으로 봅니다.' },
      notes: [{ html: '<b>절대 운전하지 마세요</b> — 이 수치는 참고용 추정입니다. 실제로는 음주 후 8~12시간이 지나도 측정기에 잡히는 경우가 많고, 숙취 상태의 운전도 처벌 대상입니다. 음주 후에는 대리운전·택시·대중교통을 이용하세요.' }]
    };
  }

  WT.mount({
    fields: ["weight", "soju", "beer", "sojuDeg", "beerDeg", "sojuMl", "beerMl", "hours"],
    segs: ["sex"],
    checks: [],
    required: ["weight"],
    presets: {"소주 4잔 (방금)": {"fields": {"weight": 80, "soju": 4, "beer": 0, "sojuDeg": 16.9, "beerDeg": 4.5, "sojuMl": 50, "beerMl": 500, "hours": 0}, "segs": {"sex": "m"}}, "소주 1병 + 맥주 2캔": {"fields": {"weight": 80, "soju": 7, "beer": 2, "sojuDeg": 16.9, "beerDeg": 4.5, "sojuMl": 50, "beerMl": 500, "hours": 0}, "segs": {"sex": "m"}}, "소주 4잔, 4시간 후": {"fields": {"weight": 80, "soju": 4, "beer": 0, "sojuDeg": 16.9, "beerDeg": 4.5, "sojuMl": 50, "beerMl": 500, "hours": 4}, "segs": {"sex": "m"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
