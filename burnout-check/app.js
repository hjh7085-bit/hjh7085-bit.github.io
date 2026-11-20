/* 스트레스·번아웃 1분 자가체크 (8문항) — burnout-check/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var ITEMS = 8;
  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var picked = chk('sym').length;
    var sleep = isFinite(get('sleep')) ? get('sleep') : 7;
    var work = isFinite(get('work')) ? get('work') : 8;

    var score = picked / ITEMS * 100;
    var extra = 0;
    if (sleep < 6) extra += 10;
    if (work >= 10) extra += 8;
    if (work >= 12) extra += 7;
    var total = Math.min(100, Math.round(score * 0.8 + extra));

    var level = picked >= 6 || total >= 70 ? '높음' : picked >= 4 || total >= 45 ? '주의' : '낮음';
    var cls = level === '높음' ? 'verdict--bad' : level === '주의' ? 'verdict--warn' : 'verdict--ok';

    var actions = {
      '낮음': ['지금 리듬이 비교적 안정적입니다. 주 3회 30분 걷기와 7시간 수면을 유지하세요.',
               '주 1회는 완전히 비우는 시간을 만드세요. 일·공부와 무관한 활동이 회복에 도움이 됩니다.',
               '3개월마다 이 체크로 변화를 기록하면 초기 신호를 잡을 수 있습니다.'],
      '주의': ['이번 주 안에 하루를 완전히 쉬는 날로 정하세요. 일정을 비우는 것도 계획입니다.',
               '수면을 7시간 이상으로 올리고, 자기 전 1시간은 화면을 끄세요.',
               '해야 할 일을 3개로 줄여 보세요. 우선순위를 정하면 부담이 절반으로 줄어듭니다.',
               '가까운 사람에게 지금 상태를 말해 보세요. 혼자 견디지 않는 것이 핵심입니다.'],
      '높음': ['2주 안에 정신건강의학과 또는 상담센터 진료를 받아 보세요. 번아웃은 치료가 필요한 상태입니다.',
               '업무·학업 부담을 조정하세요. 휴가·병가를 쓰는 것이 약이 아니라 치료의 일부입니다.',
               '수면을 최우선으로 확보하세요. 5시간 미만이 지속되면 회복이 거의 불가능합니다.',
               '자살 생각이 든다면 즉시 109(자살예방상담) 또는 119에 연락하세요. 혼자 있지 마세요.']
    };

    var rows = [
      { k: '해당 항목', v: picked + ' / 8개', note: fmt(picked) + '개 항목에 해당' },
      { k: '수면', v: fmt(sleep, 1) + '시간', note: sleep < 6 ? '부족 · 7시간 이상 권장' : '양호' },
      { k: '근무·공부', v: fmt(work, 1) + '시간', note: work >= 10 ? '과부하 · 주 52시간 기준 초과 위험' : '적정' },
      { k: '위험도 점수', v: total + ' / 100', total: true },
      { k: '판정', v: level }
    ];

    var table = actions[level].map(function (a, i) { return ['STEP ' + (i + 1), a]; });

    return {
      verdict: {
        kicker: '번아웃 위험도 · ' + level, icon: level === '높음' ? '🚨' : level === '주의' ? '🟡' : '🟢',
        title: total + '점 (' + level + ')',
        desc: '8개 항목 중 <b>' + picked + '개</b>에 해당하고 수면 ' + fmt(sleep, 1) + '시간·근무 ' + fmt(work, 1) + '시간을 반영해 <b>' + total +
              '점</b>으로 계산되었습니다. ' + (level === '높음' ? '지금은 회복이 최우선입니다. 전문가 상담을 미루지 마세요.' : level === '주의' ? '신호가 보입니다. 일정을 조정하고 수면을 회복하세요.' : '비교적 안정적입니다. 지금의 리듬을 유지하세요.'),
        cls: cls
      },
      stats: [
        { l: '위험도', v: total + '점', cls: 'is-accent' },
        { l: '해당 항목', v: picked + '/8' },
        { l: '수면', v: fmt(sleep, 1) + '시간' },
        { l: '판정', v: level }
      ],
      rows: rows,
      bars: [
        { l: '항목 점수', v: picked / ITEMS * 100, max: 100, text: fmt(picked / ITEMS * 100, 0) + '점', color: cls === 'verdict--ok' ? 'bar__fill--green' : cls === 'verdict--warn' ? 'bar__fill--amber' : 'bar__fill--kcal' },
        { l: '종합 점수', v: total, max: 100, text: total + '점', color: 'bar__fill--accent' }
      ],
      table: { head: ['단계', '지금 필요한 행동'], rows: table, note: level + ' 단계 권장 행동입니다.' },
      notes: [{ html: '<b>도움받을 곳</b> — 정신건강 상담전화 1577-0199(24시간), 자살예방 상담 109(24시간), 보건복지부 위기 상담 129. 직장인이라면 근로자지원프로그램(EAP)을, 학생이라면 학교 상담센터를 이용할 수 있습니다.' }]
    };
  }

  WT.mount({
    fields: ["sleep", "work"],
    segs: [],
    checks: ["sym"],
    required: [],
    presets: {"2개 해당 (양호)": {"fields": {"sleep": 7.5, "work": 8}, "checks": {"sym": ["a", "c"]}}, "4개 해당 (주의)": {"fields": {"sleep": 6, "work": 10}, "checks": {"sym": ["a", "b", "c", "g"]}}, "7개 해당 (위험)": {"fields": {"sleep": 5, "work": 12}, "checks": {"sym": ["a", "b", "c", "d", "e", "f", "h"]}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
