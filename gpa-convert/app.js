/* 학점 변환·목표 평점 계산기 (4.5 / 4.3 / 100점) — gpa-convert/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function to43(g) { return g * 4.3 / 4.5; }
  function to100(g) { return g / 4.5 * 100; }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var gpa = get('gpa') || 0;
    var earned = get('earned') || 0;
    var target = isFinite(get('target')) ? get('target') : 0;
    var remain = isFinite(get('remain')) ? get('remain') : 0;

    var need = 0, possible = true, total = earned + remain;
    if (remain > 0 && target > 0) {
      need = (target * total - gpa * earned) / remain;
      possible = need <= 4.5;
    }
    var finalGpa = total > 0 ? (gpa * earned + Math.min(4.5, Math.max(0, need)) * remain) / total : gpa;

    var rows = [
      { k: '현재 평점', v: fmt(gpa, 2) + ' / 4.5' },
      { k: '4.3 만점 환산', v: fmt(to43(gpa), 2) + ' / 4.3' },
      { k: '100점 만점 환산', v: fmt(to100(gpa), 1) + '점' },
      { k: '이수 학점', v: fmt(earned) + '학점' },
      { k: '목표 평점', v: fmt(target, 2) + ' / 4.5' },
      { k: '남은 학점', v: fmt(remain) + '학점' },
      { k: '필요 평점 (남은 학점)', v: remain > 0 && target > 0 ? fmt(need, 2) : '-', total: false },
      { k: '달성 가능 여부', v: remain > 0 && target > 0 ? (possible ? '가능' : '불가능') : '-' },
      { k: '졸업 시 평점 (최선)', v: fmt(finalGpa, 2), total: true }
    ];

    var table = [[4.5, 100], [4.3, 96], [4.0, 89], [3.7, 82], [3.5, 78], [3.3, 73], [3.0, 67], [2.5, 56], [2.0, 44]].map(function (r) {
      return [fmt(r[0], 1), fmt(r[0] * 4.3 / 4.5, 2), fmt(r[0] / 4.5 * 100, 1) + '점'];
    });

    return {
      verdict: {
        kicker: remain > 0 ? '남은 학점에서 필요한 평점' : '평점 환산', icon: '🎓',
        title: remain > 0 && target > 0 ? (possible ? fmt(need, 2) : '불가능') : fmt(to43(gpa), 2),
        desc: remain > 0 && target > 0
          ? '4.5 만점 <b>' + fmt(gpa, 2) + '</b>에서 목표 <b>' + fmt(target, 2) + '</b>를 이루려면 남은 ' + fmt(remain) + '학점에서 평균 <b>' + fmt(need, 2) + '</b>를 받아야 합니다. ' +
            (possible ? '전부 A를 받으면 최대 ' + fmt((gpa * earned + 4.5 * remain) / total, 2) + '까지 오릅니다.' : '4.5 만점으로도 도달할 수 없습니다. 목표를 낮추거나 재수강으로 기존 학점을 올려야 합니다.')
          : '현재 평점 ' + fmt(gpa, 2) + '은 4.3 만점으로 <b>' + fmt(to43(gpa), 2) + '</b>, 백분율로 <b>' + fmt(to100(gpa), 1) + '점</b>입니다.',
        cls: remain > 0 && target > 0 && !possible ? 'verdict--warn' : 'verdict--ok'
      },
      stats: [
        { l: '4.5 만점', v: fmt(gpa, 2), cls: 'is-accent' },
        { l: '4.3 만점', v: fmt(to43(gpa), 2) },
        { l: '100점', v: fmt(to100(gpa), 1) + '점' },
        { l: remain > 0 && target > 0 ? '필요 평점' : '이수 학점', v: remain > 0 && target > 0 ? fmt(need, 2) : fmt(earned) + '학점' }
      ],
      rows: rows,
      bars: remain > 0 && target > 0 ? [
        { l: '필요 평점', v: Math.max(0, Math.min(4.5, need)), max: 4.5, text: fmt(need, 2), color: possible ? 'bar__fill--green' : 'bar__fill--kcal' },
        { l: '현재 평점', v: gpa, max: 4.5, text: fmt(gpa, 2), color: 'bar__fill--accent' },
        { l: '목표 평점', v: target, max: 4.5, text: fmt(target, 2), color: 'bar__fill--prot' }
      ] : [],
      table: { head: ['4.5 만점', '4.3 만점', '100점'], rows: table, note: '선형 환산 기준 표입니다. 기관별 공식 환산표와 차이가 있을 수 있습니다.' },
      notes: [{ html: '<b>남은 학점이 적을수록 평점이 안 움직입니다</b> — 90학점에 3.82인 학생이 30학점을 모두 A+(4.5) 받아도 4.02까지밖에 오르지 않습니다. 반대로 이수 학점이 적을 때는 한 과목이 크게 작용합니다.' }]
    };
  }

  WT.mount({
    fields: ["gpa", "earned", "target", "remain"],
    segs: [],
    checks: [],
    required: ["gpa", "earned"],
    presets: {"3.82 · 90학점 · 목표 4.0": {"fields": {"gpa": 3.82, "earned": 90, "target": 4.0, "remain": 30}}, "3.2 · 60학점 · 목표 3.5": {"fields": {"gpa": 3.2, "earned": 60, "target": 3.5, "remain": 60}}, "4.3 · 120학점 · 목표 4.4": {"fields": {"gpa": 4.3, "earned": 120, "target": 4.4, "remain": 20}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
