/* 공복혈당 ↔ 당화혈색소(HbA1c) 환산 계산기 — hba1c-fpg/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function rangeFPG(v) {
    if (v < 100) return { t: '정상', c: 'ok' };
    if (v < 126) return { t: '공복혈당장애 (전당뇨)', c: 'warn' };
    return { t: '당뇨병 의심', c: 'bad' };
  }
  function rangeA1c(v) {
    if (v < 5.7) return { t: '정상', c: 'ok' };
    if (v < 6.5) return { t: '당뇨병전단계', c: 'warn' };
    return { t: '당뇨병 의심', c: 'bad' };
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var fpg = get('fpg'), pp2 = get('pp2'), a1c = get('a1c');
    var K = 1.15;   // 공복혈당 → 하루 평균혈당 보정 계수
    var eAG, a1cOut, fpgOut, basis;

    if (isFinite(a1c)) {
      eAG = 28.7 * a1c - 46.7;
      fpgOut = eAG / K;
      a1cOut = a1c;
      basis = 'HbA1c ' + fmt(a1c, 1) + '% 기준';
    } else {
      eAG = fpg * K;
      a1cOut = (eAG + 46.7) / 28.7;
      fpgOut = fpg;
      basis = '공복혈당 ' + fmt(fpg) + ' mg/dL 기준';
    }
    var rF = rangeFPG(fpgOut), rA = rangeA1c(a1cOut);
    var worst = rA.c === 'bad' || rF.c === 'bad' ? 'bad' : (rA.c === 'warn' || rF.c === 'warn') ? 'warn' : 'ok';

    var rows = [
      { k: '공복혈당 (추정)', v: fmt(Math.round(fpgOut)) + ' mg/dL', note: rF.t },
      { k: '당화혈색소 (추정)', v: fmt(a1cOut, 1) + ' %', note: rA.t },
      { k: '3개월 평균혈당 (eAG)', v: fmt(Math.round(eAG)) + ' mg/dL', note: '28.7 × A1c − 46.7' }
    ];
    if (isFinite(pp2)) rows.push({ k: '식후 2시간 혈당', v: fmt(pp2) + ' mg/dL', note: pp2 < 140 ? '정상' : pp2 < 200 ? '내당능장애' : '당뇨 의심' });
    if (isFinite(fpg) && isFinite(a1c)) {
      var diff = a1c - (fpg * K + 46.7) / 28.7;
      rows.push({ k: '두 수치 일치도', v: (Math.abs(diff) < 0.3 ? '일치' : '차이 ' + fmt(Math.abs(diff), 1) + '%p'),
                  note: Math.abs(diff) < 0.3 ? '같은 상태를 가리킵니다' : '빈혈·급격한 혈당 변화·검사 오차 가능' });
    }
    rows.push({ k: '목표(5.7%)까지', v: a1cOut > 5.7 ? '-' + fmt(a1cOut - 5.7, 1) + '%p' : '이미 정상 범위', total: true });

    var gap = a1cOut - 5.7;
    return {
      verdict: {
        kicker: basis + ' 환산',
        icon: worst === 'ok' ? '🟢' : worst === 'warn' ? '🟡' : '🔴',
        title: '공복 ' + fmt(Math.round(fpgOut)) + ' · A1c ' + fmt(a1cOut, 1) + '%',
        desc: '판정: <b>' + (rA.c === 'bad' ? rA.t : rF.c === 'bad' ? rF.t : rA.c === 'warn' ? rA.t : rF.t) + '</b>. '
              + '3개월 평균혈당은 약 <b>' + fmt(Math.round(eAG)) + ' mg/dL</b>입니다. '
              + (gap > 0 ? '정상 상한(5.7%)까지 <b>' + fmt(gap, 1) + '%p</b> 남았습니다.' : '정상 범위에 들어 있습니다.'),
        cls: 'verdict--' + (worst === 'ok' ? 'ok' : worst === 'warn' ? 'warn' : 'bad')
      },
      stats: [
        { l: '공복혈당', v: fmt(Math.round(fpgOut)), s: 'mg/dL' },
        { l: 'HbA1c', v: fmt(a1cOut, 1), s: '%' },
        { l: '평균혈당', v: fmt(Math.round(eAG)), s: 'mg/dL · eAG' },
        { l: '판정', v: worst === 'ok' ? '정상' : worst === 'warn' ? '전당뇨' : '당뇨 의심', cls: worst === 'ok' ? 'is-good' : worst === 'warn' ? '' : 'is-bad' }
      ],
      rows: rows,
      bars: [
        { l: '공복혈당 (' + fmt(Math.round(fpgOut)) + ' / 126)', v: fpgOut, max: 180, text: fmt(Math.round(fpgOut)) + ' mg/dL', color: fpgOut < 100 ? 'bar__fill--green' : fpgOut < 126 ? 'bar__fill--kcal' : 'bar__fill--fat' },
        { l: 'HbA1c (' + fmt(a1cOut, 1) + ' / 6.5)', v: a1cOut, max: 10, text: fmt(a1cOut, 1) + '%', color: a1cOut < 5.7 ? 'bar__fill--green' : a1cOut < 6.5 ? 'bar__fill--kcal' : 'bar__fill--fat' }
      ],
      table: { head: ['구분', '공복혈당', 'HbA1c', '2시간 혈당'], rows: [
          ['정상', '<100', '<5.7%', '<140'],
          ['전당뇨', '100~125', '5.7~6.4%', '140~199'],
          ['당뇨 의심', '≥126', '≥6.5%', '≥200']
        ], note: 'ADA·대한당뇨병학회 기준. 진단은 반복 검사와 의사 판단으로 확진합니다.' },
      notes: [
        { html: '<b>두 수치가 크게 어긋날 때</b> — HbA1c가 실제보다 낮게 나오는 경우: 빈혈, 출혈, 임신, 최근 수혈, 적혈구 수명 단축. 높게 나오는 경우: 철결핍성 빈혈, 신부전, 알코올. 이때는 당화알부민(GA) 검사가 도움이 됩니다.' },
        { html: '전당뇨라도 <b>체중 5~7% 감량 + 주 150분 운동</b>으로 당뇨 발생 위험을 58%까지 낮출 수 있습니다(DPP 연구). 지금이 가장 효과가 큰 시점입니다.' }
      ]
    };
  }

  WT.mount({
    fields: ["fpg", "pp2", "a1c"],
    segs: [],
    checks: [],
    required: [],
    presets: {"공복혈당 102": {"fields": {"fpg": 102, "pp2": "", "a1c": ""}}, "HbA1c 6.2": {"fields": {"fpg": "", "pp2": "", "a1c": 6.2}}, "공복혈당 132": {"fields": {"fpg": 132, "pp2": 180, "a1c": ""}}},
    validate: function (get) {
      var a = get('fpg'), b = get('a1c');
      if (!isFinite(a) && !isFinite(b)) return '공복혈당이나 HbA1c 중 하나는 넣어주세요.';
      return null;
    },
    auto: false,
    compute: compute
  });

})();
