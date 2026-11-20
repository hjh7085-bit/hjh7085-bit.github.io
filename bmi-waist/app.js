/* BMI·체지방률·허리둘레 대사위험 체크기 — bmi-waist/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function bmiCat(bmi) {
    if (bmi < 18.5) return { label: '저체중', cls: 'verdict--warn', color: 'bar__fill--prot' };
    if (bmi < 23) return { label: '정상', cls: 'verdict--ok', color: 'bar__fill--green' };
    if (bmi < 25) return { label: '과체중', cls: 'verdict--warn', color: 'bar__fill--amber' };
    if (bmi < 30) return { label: '1단계 비만', cls: 'verdict--bad', color: 'bar__fill--kcal' };
    if (bmi < 35) return { label: '2단계 비만', cls: 'verdict--bad', color: 'bar__fill--kcal' };
    return { label: '3단계 비만', cls: 'verdict--bad', color: 'bar__fill--kcal' };
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var h = (get('height') || 0) / 100;
    var w = get('weight') || 0;
    var waist = isFinite(get('waist')) ? get('waist') : 0;
    var age = isFinite(get('age')) ? get('age') : 30;
    var male = seg('sex') === 'm';

    var bmi = h > 0 ? w / (h * h) : 0;
    var cat = bmiCat(bmi);
    var normalLow = 18.5 * h * h, normalHigh = 22.9 * h * h;
    var bf = 1.2 * bmi + 0.23 * age - 10.8 * (male ? 1 : 0) - 5.4;
    var waistLimit = male ? 90 : 85;
    var whtr = waist > 0 && h > 0 ? waist / (h * 100) : 0;
    var waistRisk = waist > 0 ? waist >= waistLimit : false;
    var whtrRisk = whtr >= 0.5;
    var risk = (cat.label === '정상' ? 0 : cat.label === '과체중' ? 1 : 2) + (waistRisk ? 2 : 0) + (whtrRisk ? 1 : 0);

    var rows = [
      { k: 'BMI', v: fmt(bmi, 1), note: '체중 ÷ 키(m)²' },
      { k: '판정 (한국 기준)', v: cat.label },
      { k: '정상 체중 범위', v: fmt(normalLow, 1) + '~' + fmt(normalHigh, 1) + 'kg', note: 'BMI 18.5~22.9' },
      { k: '현재 체중과 차이', v: (w > normalHigh ? '+' : w < normalLow ? '' : '±') + fmt(w - Math.min(Math.max(w, normalLow), normalHigh), 1) + 'kg', note: w > normalHigh ? '감량 필요' : w < normalLow ? '증량 필요' : '정상 범위' },
      { k: '체지방률 추정', v: fmt(bf, 1) + '%', note: 'Deurenberg 공식 · 참고치' }
    ];
    if (waist > 0) {
      rows.push({ k: '허리둘레', v: fmt(waist, 1) + 'cm', note: '기준 ' + fmt(waistLimit) + 'cm (' + (male ? '남' : '여') + ')' });
      rows.push({ k: '복부비만', v: waistRisk ? '해당' : '해당 없음' });
      rows.push({ k: '허리-키 비율', v: fmt(whtr, 3), note: whtrRisk ? '0.5 이상 · 위험' : '0.5 미만 · 정상' });
    }
    rows.push({ k: '대사위험 종합', v: risk >= 3 ? '높음' : risk >= 1 ? '주의' : '낮음', total: true });

    var table = [[18.5, '저체중'], [23, '정상'], [25, '과체중'], [30, '1단계 비만'], [35, '2단계 비만']].map(function (r) {
      var kg = r[0] * h * h;
      return ['BMI ' + r[0], r[1], fmt(kg, 1) + 'kg'];
    });

    return {
      verdict: {
        kicker: 'BMI ' + fmt(bmi, 1) + ' · ' + cat.label, icon: '⚖️',
        title: fmt(bmi, 1) + ' (' + cat.label + ')',
        desc: '키 ' + fmt(h * 100, 1) + 'cm·체중 ' + fmt(w, 1) + 'kg이면 BMI는 <b>' + fmt(bmi, 1) + '</b>로 <b>' + cat.label + '</b>입니다. ' +
              '정상 범위(18.5~22.9)는 ' + fmt(normalLow, 1) + '~' + fmt(normalHigh, 1) + 'kg입니다. ' +
              (waist > 0 ? (waistRisk ? '허리둘레 ' + fmt(waist, 1) + 'cm는 복부비만 기준(' + fmt(waistLimit) + 'cm)을 넘습니다. ' : '허리둘레는 기준 이내입니다. ') : '') +
              '종합 대사위험은 <b>' + (risk >= 3 ? '높음' : risk >= 1 ? '주의' : '낮음') + '</b>입니다.',
        cls: cat.cls
      },
      stats: [
        { l: 'BMI', v: fmt(bmi, 1), cls: 'is-accent' },
        { l: '판정', v: cat.label },
        { l: '체지방률', v: fmt(bf, 1) + '%' },
        { l: waist > 0 ? '허리' : '정상 체중', v: waist > 0 ? fmt(waist, 0) + 'cm' : fmt(normalHigh, 0) + 'kg' }
      ],
      rows: rows,
      bars: [
        { l: 'BMI', v: Math.min(bmi, 40), max: 40, text: fmt(bmi, 1), color: cat.color },
        { l: '허리-키 비율', v: Math.min(whtr * 100, 80), max: 80, text: whtr > 0 ? fmt(whtr, 2) : '-', color: whtrRisk ? 'bar__fill--kcal' : 'bar__fill--green' }
      ],
      table: { head: ['BMI 구간', '판정', '내 키 기준 체중'], rows: table,
               note: '내 키에서 각 BMI 구간에 해당하는 체중입니다.' },
      notes: [{ html: '<b>허리-키 비율 0.5 법칙</b> — 허리둘레가 키의 절반을 넘으면 대사질환 위험이 올라갑니다. 175cm면 87.5cm가 기준선입니다. BMI가 정상이어도 허리가 굵으면 내장지방을 의심해야 합니다.' }]
    };
  }

  WT.mount({
    fields: ["height", "weight", "waist", "age"],
    segs: ["sex"],
    checks: [],
    required: ["height", "weight"],
    presets: {"175cm 78kg 허리 92": {"fields": {"height": 175, "weight": 78, "waist": 92, "age": 33}, "segs": {"sex": "m"}}, "160cm 52kg 허리 68": {"fields": {"height": 160, "weight": 52, "waist": 68, "age": 28}, "segs": {"sex": "f"}}, "170cm 95kg 허리 104": {"fields": {"height": 170, "weight": 95, "waist": 104, "age": 45}, "segs": {"sex": "m"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
