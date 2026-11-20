/* 수면 사이클 90분 계산기 (최적 기상·취침 시간) — sleep-cycle-90/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function parseTime(s) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(s).trim());
    if (!m) return null;
    var h = +m[1], mi = +m[2];
    if (h > 23 || mi > 59) return null;
    return h * 60 + mi;
  }
  function fmtTime(min) {
    min = ((min % 1440) + 1440) % 1440;
    var h = Math.floor(min / 60), m = min % 60;
    var ap = h < 12 ? '오전' : '오후';
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    return ap + ' ' + h12 + ':' + (m < 10 ? '0' + m : m);
  }
  function hhmm(min) {
    min = ((min % 1440) + 1440) % 1440;
    var h = Math.floor(min / 60), m = Math.round(min % 60);
    return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
  }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var base = parseTime(val('time'));
    var latency = isFinite(get('latency')) ? get('latency') : 15;
    var cyc = Number(seg('cycleLen')) || 90;
    var mode = seg('mode');
    if (base === null) return null;

    var list = [4, 5, 6].map(function (n) {
      var sleepMin = cyc * n;
      var bed, wake;
      if (mode === 'wake') { wake = base; bed = base - sleepMin - latency; }
      else { bed = base; wake = base + sleepMin + latency; }
      return { n: n, sleepMin: sleepMin, bed: bed, wake: wake };
    });

    var best = list.filter(function (x) { return x.n === 5; })[0];
    var rows = list.map(function (x) {
      return {
        k: x.n + '주기 · ' + fmt(x.sleepMin / 60, 1) + '시간',
        v: (mode === 'wake' ? hhmm(x.bed) : hhmm(x.wake)) + (x.n === 5 ? ' ★' : ''),
        note: (mode === 'wake' ? '이 시간에 눕기' : '이 시간에 기상') + ' · 실제 수면 ' + fmt(x.sleepMin / 60, 1) + 'h',
        total: x.n === 5,
        cls: x.n === 5 ? 'is-good' : ''
      };
    });

    var bedtime = best.bed, waketime = best.wake;
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var until = mode === 'wake' ? (bedtime - nowMin + 1440) % 1440 : (waketime - nowMin + 1440) % 1440;

    return {
      verdict: {
        kicker: mode === 'wake' ? '추천 취침 시간 (5주기)' : '추천 기상 시간 (5주기)',
        icon: '🌙',
        title: mode === 'wake' ? hhmm(bedtime) : hhmm(waketime),
        desc: '5주기(7.5시간) + 입면 ' + fmt(latency) + '분 기준입니다. '
              + (mode === 'wake'
                  ? '이 시간에 누우면 <b>' + hhmm(waketime) + '</b>에 90분 주기 끝에서 깨어납니다.'
                  : '이 시간에 자면 <b>' + hhmm(waketime) + '</b>에 일어나게 됩니다.')
              + ' 4주기(' + hhmm(best.bed - cyc) + ')와 6주기(' + hhmm(best.bed + cyc) + ')도 아래에 있습니다.',
        cls: 'verdict--ok'
      },
      stats: [
        { l: '5주기 취침', v: hhmm(bedtime) },
        { l: '5주기 기상', v: hhmm(waketime) },
        { l: '실제 수면', v: fmt(7.5, 1) + '시간', s: '5주기 · ' + cyc + '분' },
        { l: '남은 시간', v: Math.floor(until / 60) + '시간 ' + (until % 60) + '분', s: mode === 'wake' ? '취침까지' : '기상까지' }
      ],
      rows: rows,
      table: { head: ['주기', '수면시간', '취침', '기상', '비고'], rows: list.map(function (x) {
          return [x.n + '주기', fmt(x.sleepMin / 60, 1) + '시간', hhmm(x.bed), hhmm(x.wake), x.n === 5 ? '추천' : x.n === 4 ? '최소한' : '여유 있을 때'];
        }), note: '입면 소요 ' + fmt(latency) + '분을 취침 시간에 미리 포함했습니다.' },
      notes: [
        { html: '<b>주기 끝에서 깨는 것이 핵심</b>입니다. 깊은 잠(서파수면) 중에 깨면 8시간을 자도 멍합니다. 알람은 90분 배수에 맞추세요.' },
        { html: '취침 시간은 매일 <b>±30분 이내</b>로 유지하는 것이 수면의 질에 가장 중요합니다. 주말 몰아자기는 생체리듬을 흐트립니다.' }
      ]
    };
  }

  WT.mount({
    fields: ["time", "latency"],
    segs: ["mode", "cycleLen"],
    checks: [],
    required: ["time"],
    presets: {"7시 기상": {"fields": {"time": "07:00", "latency": 15}, "segs": {"mode": "wake", "cycleLen": "90"}}, "6시 30분 기상": {"fields": {"time": "06:30", "latency": 10}, "segs": {"mode": "wake", "cycleLen": "90"}}, "23시 30분 취침": {"fields": {"time": "23:30", "latency": 15}, "segs": {"mode": "bed", "cycleLen": "90"}}},
    validate: function (get, seg, chk, val) {
      var s = val('time');
      if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(s)) return '시간을 07:00 형식으로 넣어주세요.';
      return null;
    },
    auto: false,
    compute: compute
  });

})();
