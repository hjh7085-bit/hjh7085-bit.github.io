/* 청약 가점 계산기 (84점 만점 · 무주택·부양가족·통장기간) — cheongyak-score/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function noHouseScore(y) {
    if (y < 1) return 2;
    var s = 2 + Math.floor(y) * 2;
    return Math.min(32, s);
  }
  function familyScore(n) {
    var t = [5, 10, 15, 20, 25, 30, 35];
    var i = Math.min(6, Math.max(0, Math.floor(n)));
    return t[i];
  }
  function accountScore(y, m) {
    var total = y + (m || 0) / 12;
    if (total < 0.5) return 1;
    if (total < 1) return 2;
    var s = 2 + Math.floor(total);
    return Math.min(17, s);
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var y1 = get('noHouse') || 0, fam = get('family') || 0;
    var y2 = get('account') || 0, mm = isFinite(get('months')) ? get('months') : 0;
    var s1 = noHouseScore(y1), s2 = familyScore(fam), s3 = accountScore(y2, mm);
    var total = s1 + s2 + s3;

    var rows = [
      { k: '무주택기간', v: fmt(y1) + '년 → ' + s1 + '점', note: '만점 32점 · 15년 이상' },
      { k: '부양가족 수', v: fmt(fam) + '명 → ' + s2 + '점', note: '만점 35점 · 6명 이상' },
      { k: '통장 가입기간', v: fmt(y2) + '년 ' + fmt(mm) + '개월 → ' + s3 + '점', note: '만점 17점 · 15년 이상' },
      { k: '총 가점', v: total + '점 / 84점', total: true }
    ];

    var table = [0, 1, 3, 5, 8, 10, 15].map(function (y) {
      return [y + '년', noHouseScore(y) + '점', accountScore(y, 0) + '점', (noHouseScore(y) + accountScore(y, 0)) + '점'];
    });

    var grade = total >= 60 ? '상위권' : total >= 45 ? '중위권' : '하위권';
    var cls = total >= 60 ? 'verdict--ok' : total >= 45 ? 'verdict--info' : 'verdict--warn';

    return {
      verdict: {
        kicker: '청약 가점 (84점 만점)', icon: '🎯',
        title: total + '점',
        desc: '무주택 ' + s1 + '점 + 부양가족 ' + s2 + '점 + 통장 ' + s3 + '점 = <b>' + total + '점</b>입니다. ' +
              '서울 인기 단지 당첨선이 보통 60점 전후이므로 <b>' + grade + '</b>으로 볼 수 있습니다. ' +
              '가장 크게 올릴 수 있는 항목은 ' + (32 - s1 >= 35 - s2 && 32 - s1 >= 17 - s3 ? '무주택기간(최대 +' + (32 - s1) + '점)' : (35 - s2 >= 17 - s3 ? '부양가족(최대 +' + (35 - s2) + '점)' : '통장기간(최대 +' + (17 - s3) + '점)')) + '입니다.',
        cls: cls
      },
      stats: [
        { l: '무주택기간', v: s1 + '점', s: '만점 32' },
        { l: '부양가족', v: s2 + '점', s: '만점 35' },
        { l: '통장기간', v: s3 + '점', s: '만점 17' },
        { l: '총점', v: total + '점', cls: 'is-accent', s: '84점 만점' }
      ],
      rows: rows,
      bars: [
        { l: '무주택기간', v: s1, max: 32, text: s1 + ' / 32', color: 'bar__fill--green' },
        { l: '부양가족', v: s2, max: 35, text: s2 + ' / 35', color: 'bar__fill--accent' },
        { l: '통장기간', v: s3, max: 17, text: s3 + ' / 17', color: 'bar__fill--kcal' }
      ],
      table: { head: ['경과 연수', '무주택 점수', '통장 점수', '합계'], rows: table,
               note: '같은 기간이 무주택기간과 통장기간에 함께 쌓일 때의 점수입니다.' },
      notes: [{ html: '<b>부양가족 3명부터 가점이 붙습니다</b> — 본인을 제외하고 0명 5점, 1명 10점, 2명 15점, 3명 20점으로 5점씩 올라 6명 이상이면 35점 만점입니다. 부모를 모시고 사는 경우(3년 이상 동거)도 부양가족으로 인정될 수 있습니다.' }]
    };
  }

  WT.mount({
    fields: ["noHouse", "family", "account", "months"],
    segs: [],
    checks: [],
    required: ["noHouse", "family", "account"],
    presets: {"사회초년생 (2년·0명·3년)": {"fields": {"noHouse": 2, "family": 0, "account": 3, "months": 0}}, "30대 맞벌이 (5년·2명·8년)": {"fields": {"noHouse": 5, "family": 2, "account": 8, "months": 0}}, "40대 가장 (12년·3명·15년)": {"fields": {"noHouse": 12, "family": 3, "account": 15, "months": 0}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
