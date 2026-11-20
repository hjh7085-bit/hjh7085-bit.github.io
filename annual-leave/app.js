/* 연차 일수·미사용 연차수당 계산기 (근로기준법 기준) — annual-leave/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function leaveDays(years, months) {
    if (years < 1) return Math.min(11, Math.max(0, Math.floor(months)));
    var extra = Math.floor((years - 1) / 2);
    return Math.min(25, 15 + extra);
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var years = get('years') || 0;
    var months = isFinite(get('months')) ? get('months') : 0;
    var used = get('used') || 0;
    var dayWage = isFinite(get('dayWage')) ? get('dayWage') : 0;

    var total = leaveDays(years, months);
    var remain = Math.max(0, total - used);
    var pay = remain * dayWage;

    var rows = [
      { k: '근속기간', v: years >= 1 ? fmt(years) + '년' : fmt(months) + '개월' },
      { k: '법정 연차', v: total + '일', note: years < 1 ? '월 1일 · 최대 11일' : '15일 + 2년마다 1일' },
      { k: '사용 연차', v: fmt(used) + '일' },
      { k: '남은 연차', v: remain + '일', total: false },
      { k: '1일 통상임금', v: won(dayWage) },
      { k: '미사용 연차수당', v: won(pay), total: true }
    ];

    var table = [1, 3, 5, 7, 10, 15, 20].map(function (y) {
      var d = leaveDays(y, 0);
      return [y + '년', d + '일', won((d - used > 0 ? d - used : 0) * dayWage), won(d * dayWage)];
    });

    return {
      verdict: {
        kicker: '미사용 연차수당', icon: '🌴',
        title: won(pay),
        desc: '근속 ' + (years >= 1 ? fmt(years) + '년' : fmt(months) + '개월') + ' 기준 법정 연차는 <b>' + total + '일</b>, 사용 ' + fmt(used) +
              '일을 빼면 <b>' + remain + '일</b>이 남습니다. 1일 통상임금 ' + won(dayWage) + '으로 환산하면 <b>' + won(pay) + '</b>입니다. ' +
              (remain === 0 ? '연차를 모두 사용했습니다.' : '연차를 다 쓰면 같은 금액을 쉬는 날로 받을 수 있습니다.'),
        cls: pay > 0 ? 'verdict--ok' : 'verdict--info'
      },
      stats: [
        { l: '법정 연차', v: total + '일', cls: 'is-accent' },
        { l: '남은 연차', v: remain + '일' },
        { l: '연차수당', v: won(pay) },
        { l: '1일 임금', v: won(dayWage) }
      ],
      rows: rows,
      bars: [
        { l: '사용', v: Math.min(used, total), max: total, text: fmt(used) + '일', color: 'bar__fill--green' },
        { l: '미사용', v: remain, max: total, text: remain + '일', color: 'bar__fill--kcal' }
      ],
      table: { head: ['근속', '법정 연차', '남은 연차 수당', '전체 연차 환산'], rows: table,
               note: '같은 사용일수에서 근속만 바꾼 값입니다. 3년, 5년, 7년마다 하루씩 늘어납니다.' },
      notes: [{ html: '<b>연차 계산의 함정</b> — 1년 미만 근속자는 1개월 개근 시 1일씩 최대 11일이고, 1년이 되는 순간 15일이 새로 발생합니다. 그래서 입사 1년차에 11일 + 15일 = 최대 26일을 쓸 수 있는 해가 생깁니다.' }]
    };
  }

  WT.mount({
    fields: ["years", "months", "used", "dayWage"],
    segs: [],
    checks: [],
    required: ["years", "used"],
    presets: {"1년 미만 (6개월)": {"fields": {"years": 0, "months": 6, "used": 3, "dayWage": 100000}}, "근속 5년": {"fields": {"years": 5, "months": 0, "used": 8, "dayWage": 120000}}, "근속 12년": {"fields": {"years": 12, "months": 0, "used": 10, "dayWage": 160000}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
