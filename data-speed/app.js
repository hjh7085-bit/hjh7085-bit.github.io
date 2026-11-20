/* 데이터 용량·다운로드 시간 계산기 (Mbps ↔ MB/s) — data-speed/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var size = get('size') || 0;
    var unit = seg('unit');
    var speed = get('speed') || 1;
    var eff = isFinite(get('eff')) ? get('eff') : 85;

    var gb = unit === 'TB' ? size * 1024 : unit === 'MB' ? size / 1024 : size;
    var mb = gb * 1024;
    var bytes = mb * 1024 * 1024;
    var mbps = speed / 8;
    var real = mbps * eff / 100;
    var sec = real > 0 ? mb / real : 0;
    var min = sec / 60;

    function hms(s) {
      if (!isFinite(s) || s <= 0) return '-';
      var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = Math.round(s % 60);
      var out = '';
      if (h > 0) out += h + '시간 ';
      if (h > 0 || m > 0) out += m + '분 ';
      out += ss + '초';
      return out;
    }

    var rows = [
      { k: '파일 크기', v: fmt(gb, 2) + 'GB (' + fmt(mb, 0) + 'MB)' },
      { k: '회선 속도', v: fmt(speed) + 'Mbps' },
      { k: '이론 최대 속도', v: fmt(mbps, 2) + 'MB/s' },
      { k: '실효 속도 (' + fmt(eff) + '%)', v: fmt(real, 2) + 'MB/s' },
      { k: '소요 시간', v: hms(sec), total: true },
      { k: '1분당 전송량', v: fmt(real * 60 / 1024, 2) + 'GB' }
    ];

    var table = [100, 500, 1000, 2500].map(function (sp) {
      var r2 = (sp / 8) * eff / 100;
      var s2 = r2 > 0 ? mb / r2 : 0;
      return [fmt(sp) + 'Mbps', fmt(r2, 1) + 'MB/s', hms(s2)];
    });

    var streams = [['SD (480p)', 1.5], ['HD (1080p)', 5], ['4K (2160p)', 25]];
    var sRows = streams.map(function (s) {
      var gig = s[1] * 3600 / 8 / 1024;
      return [s[0], s[1] + 'Mbps', fmt(gig, 2) + 'GB/시간'];
    });

    return {
      verdict: {
        kicker: '다운로드 소요 시간', icon: '📶',
        title: hms(sec),
        desc: fmt(gb, 2) + 'GB 파일을 <b>' + fmt(speed) + 'Mbps</b>(실효 ' + fmt(real, 2) + 'MB/s)로 받으면 <b>' + hms(sec) + '</b> 걸립니다. ' +
              '통신사 속도를 8로 나눈 ' + fmt(mbps, 2) + 'MB/s가 이론 최대이고, 실제로는 ' + fmt(eff) + '% 수준입니다.',
        cls: 'verdict--ok'
      },
      stats: [
        { l: '실효 속도', v: fmt(real, 2) + 'MB/s', cls: 'is-accent' },
        { l: '소요 시간', v: hms(sec) },
        { l: '이론 최대', v: fmt(mbps, 2) + 'MB/s' },
        { l: '파일 크기', v: fmt(gb, 2) + 'GB' }
      ],
      rows: rows,
      table: { head: ['회선', '실효 속도', '소요 시간'], rows: table,
               note: '같은 파일을 회선 속도별로 받을 때의 시간입니다.' },
      notes: [{ html: '<b>스트리밍 데이터</b> — 4K 영상 1시간은 11GB 안팎을 씁니다. 10GB 파일 다운로드와 비슷한 양입니다. ' + sRows.map(function (r) { return r[0] + ' ' + r[2]; }).join(' · ') }]
    };
  }

  WT.mount({
    fields: ["size", "speed", "eff"],
    segs: ["unit"],
    checks: [],
    required: ["size", "speed"],
    presets: {"10GB · 100Mbps": {"fields": {"size": 10, "speed": 100, "eff": 85}, "segs": {"unit": "GB"}}, "1.5GB · 500Mbps": {"fields": {"size": 1.5, "speed": 500, "eff": 85}, "segs": {"unit": "GB"}}, "500MB · 1Gbps": {"fields": {"size": 500, "speed": 1000, "eff": 85}, "segs": {"unit": "MB"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
