/* D-Day·날짜 차이·영업일 계산기 (2026 공휴일 반영) — date-calc/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

var HOLIDAYS = {
    '2026-01-01': '신정',
    '2026-02-16': '설날 연휴', '2026-02-17': '설날', '2026-02-18': '설날 연휴',
    '2026-03-02': '삼일절 대체공휴일',
    '2026-05-05': '어린이날',
    '2026-05-25': '부처님오신날 대체공휴일',
    '2026-06-03': '전국동시지방선거',
    '2026-06-06': '현충일',
    '2026-08-17': '광복절 대체공휴일',
    '2026-09-24': '추석 연휴', '2026-09-25': '추석', '2026-09-26': '추석 연휴',
    '2026-10-05': '개천절 대체공휴일',
    '2026-10-09': '한글날',
    '2026-12-25': '성탄절'
  };
  function ymd(d) {
    var y = d.getFullYear(), m = d.getMonth() + 1, dd = d.getDate();
    return y + '-' + (m < 10 ? '0' + m : m) + '-' + (dd < 10 ? '0' + dd : dd);
  }
  function parse(s) {
    if (!s) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (d.getMonth() !== +m[2] - 1) return null;
    return d;
  }
  function isWeekend(d) { var w = d.getDay(); return w === 0 || w === 6; }
  function isHoliday(d) { return !!HOLIDAYS[ymd(d)]; }
  function isBiz(d, useHoliday) { return !isWeekend(d) && !(useHoliday && isHoliday(d)); }
  function dayName(d) { return ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]; }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var start = parse(val('start')) || today;
    var end = parse(val('end'));
    var bizBase = parse(val('bizBase')) || today;
    var n = get('biz');
    var useHol = seg('holiday') !== 'exclude';
    var tx = Math.round((today - start) / 86400000);

    var rows = [], stats = [];
    var mainTitle = '', mainDesc = '', cls = 'verdict--accent';

    if (end) {
      var diff = Math.round((end - start) / 86400000);
      var remain = Math.round((end - today) / 86400000);   // 미래면 +, 과거면 -
      var ddayLabel = remain === 0 ? 'D-Day' : remain > 0 ? 'D-' + remain : 'D+' + (-remain);
      var weeks = Math.floor(Math.abs(diff) / 7), rest = Math.abs(diff) % 7;
      var biz = 0, hol = 0;
      var dir = diff >= 0 ? 1 : -1;
      for (var i = 1; i <= Math.abs(diff); i++) {
        var d = new Date(start.getTime()); d.setDate(d.getDate() + i * dir);
        if (isBiz(d, useHol)) biz++;
        if (isHoliday(d) && !isWeekend(d)) hol++;
      }
      mainTitle = ddayLabel + ' · ' + ymd(end) + ' (' + dayName(end) + ')';
      mainDesc = '두 날짜 차이는 <b>' + Math.abs(diff) + '일</b>(' + weeks + '주 ' + rest + '일): ' + ymd(start) + '(' + dayName(start) + ') → ' + ymd(end) + '(' + dayName(end) + '). '
        + '영업일은 <b>' + biz + '일</b>입니다.';
      cls = remain >= 0 ? 'verdict--ok' : 'verdict--warn';
      rows.push({ k: '두 날짜 차이', v: fmt(diff) + '일', total: true });
      rows.push({ k: '주 단위', v: weeks + '주 ' + rest + '일' });
      rows.push({ k: '대상일까지', v: remain === 0 ? '오늘' : remain > 0 ? remain + '일 남음' : Math.abs(remain) + '일 지남', cls: remain >= 0 ? 'is-good' : 'is-bad' });
      rows.push({ k: '영업일 (주말' + (useHol ? '·공휴일' : '') + ' 제외)', v: fmt(biz) + '일' });
      rows.push({ k: '공휴일 수', v: fmt(hol) + '일' });
      rows.push({ k: '주말 포함 일수', v: fmt(diff - biz) + '일', note: '주말 · 공휴일' });
      stats = [
        { l: '날짜 차이', v: Math.abs(diff) + '일' },
        { l: 'D-Day', v: ddayLabel, cls: remain >= 0 ? 'is-good' : '' },
        { l: '영업일', v: biz + '일', cls: 'is-accent' },
        { l: '총 주', v: weeks + '주', s: rest + '일' }
      ];
    } else {
      mainTitle = '오늘: ' + ymd(today) + ' (' + dayName(today) + ')';
      mainDesc = '기준일에서 <b>' + fmt(tx) + '일</b> 지났습니다. 대상일이나 영업일 수를 넣으면 더 자세히 계산합니다.';
      rows.push({ k: '오늘', v: ymd(today) + ' (' + dayName(today) + ')' });
      stats = [
        { l: '오늘', v: ymd(today).slice(5) },
        { l: '요일', v: dayName(today) + '요일' },
        { l: '올해 몇일째', v: Math.round((today - new Date(today.getFullYear(), 0, 0)) / 86400000) + '일' },
        { l: '남은 날', v: (new Date(today.getFullYear(), 11, 31) - today) / 86400000 + '일' }
      ];
    }

    // N영업일 후·전
    if (isFinite(n) && n > 0) {
      function shift(base, count) {
        var d = new Date(base.getTime()), c = 0, guard = 0;
        while (c < count && guard < 2000) {
          d.setDate(d.getDate() + 1); guard++;
          if (isBiz(d, useHol)) c++;
        }
        return d;
      }
      function shiftBack(base, count) {
        var d = new Date(base.getTime()), c = 0, guard = 0;
        while (c < count && guard < 2000) {
          d.setDate(d.getDate() - 1); guard++;
          if (isBiz(d, useHol)) c++;
        }
        return d;
      }
      var after = shift(bizBase, n), before = shiftBack(bizBase, n);
      rows.push({ k: n + '영업일 후', v: ymd(after) + ' (' + dayName(after) + ')', note: '기준 ' + ymd(bizBase) });
      rows.push({ k: n + '영업일 전', v: ymd(before) + ' (' + dayName(before) + ')', note: '기준 ' + ymd(bizBase) });
      if (!end) {
        mainTitle = ymd(after) + ' (' + dayName(after) + ')';
        mainDesc = ymd(bizBase) + '에서 <b>' + n + '영업일 후</b>입니다. ' + n + '영업일 전은 <b>' + ymd(before) + ' (' + dayName(before) + ')</b>.';
        stats.push({ l: n + '영업일 후', v: ymd(after).slice(5), cls: 'is-accent' });
      }
    }

    var upcoming = [];
    var dd = new Date(today.getTime());
    for (var k = 0; k < 60 && upcoming.length < 6; k++) {
      if (isHoliday(dd)) upcoming.push([ymd(dd), dayName(dd) + '요일', HOLIDAYS[ymd(dd)]]);
      dd.setDate(dd.getDate() + 1);
    }

    return {
      verdict: { kicker: '날짜 계산', icon: '📅', title: mainTitle, desc: mainDesc, cls: cls },
      stats: stats.slice(0, 4),
      rows: rows,
      table: { head: ['날짜', '요일', '공휴일'], rows: upcoming,
               note: '오늘부터 60일 내 공휴일입니다. 2026년 기준.' },
      notes: [
        { html: '<b>영업일 계산</b>은 토·일과 공휴일을 제외합니다. 은행·관공서 마감은 여기에 <b>임시공휴일·근로자의 날(5/1)</b>이 추가될 수 있으니, 중요한 마감은 하루 이틀 여유를 두세요.' },
        { html: '계약일·배송 예정일을 계산할 때는 <b>도착일이 아니라 발송일 기준</b>인지 확인하세요. 택배는 영업일 기준 1~3일이 일반적입니다.' }
      ]
    };
  }

  WT.mount({
    fields: ["start", "end", "biz", "bizBase"],
    segs: ["holiday"],
    checks: [],
    required: [],
    presets: {"오늘부터 연말까지": {"fields": {"start": "", "end": "2026-12-31", "biz": "", "bizBase": ""}, "segs": {"holiday": "include"}}, "D-100 계산": {"fields": {"start": "2026-11-17", "end": "2027-03-01", "biz": "", "bizBase": ""}, "segs": {"holiday": "include"}}, "7영업일 후": {"fields": {"start": "2026-11-17", "end": "", "biz": 7, "bizBase": "2026-11-17"}, "segs": {"holiday": "include"}}},
    validate: function (get, seg, chk, val) {
      if (!val('start') && !val('end') && !val('biz')) return '기준일이나 대상일을 넣어주세요.';
      return null;
    },
    auto: false,
    compute: compute
  });

  (function () {
    var s = document.getElementById('start');
    var b = document.getElementById('bizBase');
    function today() {
      var d = new Date();
      var m = d.getMonth() + 1, dd = d.getDate();
      return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (dd < 10 ? '0' + dd : dd);
    }
    if (s && !s.value) s.value = today();
    if (b && !b.value) b.value = today();
  })();

})();
