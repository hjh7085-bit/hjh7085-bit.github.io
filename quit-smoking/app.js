/* 금연 저축액·건강 회복 타임라인 계산기 — quit-smoking/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var STEP = [
    [0.014, '20분 후', '혈압과 심박수가 정상으로 돌아오기 시작합니다.'],
    [0.5, '12시간 후', '혈중 일산화탄소가 정상 수준으로 떨어집니다.'],
    [1, '1일 후', '심장마비 위험이 감소하기 시작합니다.'],
    [2, '2일 후', '후각과 미각이 좋아집니다. 니코틴이 몸에서 빠져나갑니다.'],
    [3, '3일 후', '기관지가 이완되고 폐 기능이 향상됩니다.'],
    [14, '2주 후', '혈액순환과 폐 기능이 개선됩니다.'],
    [90, '3개월 후', '기침·가래가 줄고 폐 섬모가 회복됩니다.'],
    [365, '1년 후', '관상동맥질환 위험이 흡연자의 절반으로 줄어듭니다.'],
    [1825, '5년 후', '뇌졸중 위험이 비흡연자 수준에 가까워집니다.'],
    [3650, '10년 후', '폐암 사망 위험이 흡연자의 절반으로 감소합니다.'],
    [5475, '15년 후', '심장병 위험이 비흡연자와 같아집니다.']
  ];

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var perDay = get('perDay') || 0;
    var price = get('price') || 0;
    var years = get('years') || 0;
    var quitDays = isFinite(get('quitDays')) ? get('quitDays') : 0;

    var daily = perDay / 20 * price;
    var monthly = daily * 30;
    var yearly = daily * 365;
    var spent = yearly * years;
    var saved = daily * quitDays;
    var sticks = Math.round(perDay * 365 * years);
    var sticksAfter = Math.round(perDay * quitDays);

    var rows = [
      { k: '하루 담배값', v: won(daily), note: fmt(perDay) + '개비 = ' + fmt(perDay / 20, 2) + '갑' },
      { k: '월 담배값', v: won(monthly) },
      { k: '연 담배값', v: won(yearly) },
      { k: '지금까지 쓴 돈 (' + fmt(years) + '년)', v: won(spent), total: false },
      { k: '피운 담배 개비', v: fmt(sticks) + '개비', note: '약 ' + fmt(sticks * 0.00001, 1) + '톤 아님 · 개수 기준' },
      { k: '금연 경과', v: fmt(quitDays) + '일' },
      { k: '금연으로 아낀 돈', v: won(saved) },
      { k: '앞으로 1년 절약', v: won(yearly), total: true }
    ];

    var table = STEP.map(function (s) {
      var reached = quitDays >= s[0];
      return [s[1], s[2], reached ? '완료' : '예정'];
    });

    var next = null;
    for (var i = 0; i < STEP.length; i++) if (quitDays < STEP[i][0]) { next = STEP[i]; break; }
    var nextTxt = next ? next[1] + '에 ' + next[2].replace(/\.$/, '') + ' 단계가 옵니다.' : '모든 회복 단계를 통과했습니다.';

    return {
      verdict: {
        kicker: '금연으로 아끼는 돈 (1년)', icon: '🚭',
        title: won(yearly),
        desc: '하루 ' + fmt(perDay) + '개비면 담배값은 하루 <b>' + won(daily) + '</b>, 1년에 <b>' + won(yearly) + '</b>입니다. ' +
              fmt(years) + '년 동안 이미 <b>' + won(spent) + '</b>을 태웠고, 지금 끊으면 이후 10년간 <b>' + won(yearly * 10) + '</b>이 남습니다. ' +
              (quitDays > 0 ? '금연 ' + fmt(quitDays) + '일째로 <b>' + won(saved) + '</b>을 아꼈습니다. ' : '') + nextTxt,
        cls: 'verdict--ok'
      },
      stats: [
        { l: '연 절약', v: won(yearly), cls: 'is-accent' },
        { l: '월 절약', v: won(monthly) },
        { l: '지금까지', v: wonShort(spent) },
        { l: '금연 경과', v: fmt(quitDays) + '일' }
      ],
      rows: rows,
      bars: [
        { l: '하루', v: daily, max: yearly, text: won(daily), color: 'bar__fill--prot' },
        { l: '1개월', v: monthly, max: yearly, text: won(monthly), color: 'bar__fill--accent' },
        { l: '1년', v: yearly, max: yearly, text: won(yearly), color: 'bar__fill--green' }
      ],
      table: { head: ['시점', '몸의 변화', '진행'], rows: table,
               note: '금연 후 회복 타임라인입니다. 개인차가 있습니다.' },
      notes: [{ html: '<b>10년이면 1,600만원</b> — 하루 한 갑(4,500원) 기준 10년 담배값은 1,642만원입니다. 이 돈을 연 4%로 적립하면 20년 뒤 3,000만원이 넘습니다. 금연은 건강과 돈을 동시에 지키는 가장 확실한 방법입니다.' }]
    };
  }

  WT.mount({
    fields: ["perDay", "price", "years", "quitDays"],
    segs: [],
    checks: [],
    required: ["perDay", "price", "years"],
    presets: {"하루 15개비 · 10년": {"fields": {"perDay": 15, "price": 4500, "years": 10, "quitDays": 0}}, "하루 20개비 · 20년": {"fields": {"perDay": 20, "price": 4500, "years": 20, "quitDays": 0}}, "하루 10개비 · 5년 · 금연 30일": {"fields": {"perDay": 10, "price": 4500, "years": 5, "quitDays": 30}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
