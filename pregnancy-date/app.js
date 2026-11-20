/* 임신 주수·출산 예정일 계산기 (280일 · 삼분기) — pregnancy-date/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function parseD(s) {
    var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var lmp = parseD(val('lmp'));
    if (!lmp) {
      return { verdict: { kicker: '날짜 확인', icon: '⚠️', title: '마지막 생리 시작일을 넣어 주세요', desc: '연도-월-일 형식(예: 2026-03-01)으로 입력합니다.', cls: 'verdict--warn' }, stats: [] };
    }
    var today = new Date();
    var baseD = parseD(val('base')) || Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    var cycle = isFinite(get('cycle')) ? get('cycle') : 28;
    var term = isFinite(get('term')) ? get('term') : 280;
    var adj = term + (cycle - 28);
    var edd = lmp + adj * 86400000;
    var days = Math.round((baseD - lmp) / 86400000);
    var weeks = Math.floor(days / 7), dd = days % 7;
    if (days < 0) days = 0;
    var left = Math.round((edd - baseD) / 86400000);
    var trimester = days < 0 ? '-' : days < 91 ? '1삼분기 (0~13주)' : days < 196 ? '2삼분기 (14~27주)' : '3삼분기 (28주~)';
    var eddD = new Date(edd);
    var eddStr = eddD.getUTCFullYear() + '-' + pad(eddD.getUTCMonth() + 1) + '-' + pad(eddD.getUTCDate());
    var weekDays = ['일', '월', '화', '수', '목', '금', '토'];

    var rows = [
      { k: '마지막 생리 시작일', v: new Date(lmp).toISOString().slice(0, 10) },
      { k: '오늘 임신 주수', v: weeks + '주 ' + dd + '일', note: '출산까지 ' + Math.max(0, left) + '일' },
      { k: '삼분기', v: trimester },
      { k: '출산 예정일', v: eddStr + ' (' + weekDays[eddD.getUTCDay()] + '요일)', total: true },
      { k: '임신 일수', v: days + '일 / ' + adj + '일', note: '진행률 ' + fmt(Math.min(100, Math.max(0, days / adj * 100)), 1) + '%' },
      { k: '주기 보정', v: (cycle - 28 >= 0 ? '+' : '') + (cycle - 28) + '일', note: '주기가 길면 예정일이 늦어짐' },
      { k: '분만 가능 기간', v: '38~42주', note: '예정일 ±2주' }
    ];

    var table = [
      ['6~8주', '첫 초음파 · 심장박동 확인'],
      ['11~13주', '1차 기형아 검사 (목덜미 투명대)'],
      ['15~20주', '2차 기형아 검사 (쿼드·NIPT)'],
      ['20~24주', '정밀 초음파 · 성별 확인'],
      ['24~28주', '임신성 당뇨 검사'],
      ['28~36주', '2주마다 정기검진'],
      ['36주~', '1주마다 검진 · 분만 준비']
    ];

    return {
      verdict: {
        kicker: '오늘 임신 주수', icon: '🤰',
        title: weeks + '주 ' + dd + '일',
        desc: '출산 예정일은 <b>' + eddStr + '</b>입니다. 오늘 기준 ' + (left >= 0 ? '<b>' + left + '일</b> 남았고, ' : '이미 예정일이 <b>' + (-left) + '일</b> 지났고, ') +
              '임신 ' + fmt(Math.min(100, Math.max(0, days / adj * 100)), 1) + '% 진행되었습니다. ' + trimester + '입니다.',
        cls: 'verdict--ok'
      },
      stats: [
        { l: '임신 주수', v: weeks + '주 ' + dd + '일', cls: 'is-accent' },
        { l: '출산 예정일', v: eddStr },
        { l: '남은 날', v: Math.max(0, left) + '일' },
        { l: '삼분기', v: days < 91 ? '1삼분기' : days < 196 ? '2삼분기' : '3삼분기' }
      ],
      rows: rows,
      bars: [
        { l: '임신 진행률', v: Math.min(100, Math.max(0, days / adj * 100)), max: 100, text: fmt(Math.min(100, Math.max(0, days / adj * 100)), 1) + '%', color: 'bar__fill--green' }
      ],
      table: { head: ['임신 주수', '주요 검사 · 일정'], rows: table, note: '일반적인 산전 관리 일정입니다. 병원·개인 상황에 따라 달라집니다.' },
      notes: [{ html: '<b>네겔레 법칙</b> — 마지막 생리 시작일에서 3개월을 빼고 7일을 더하면 예정일이 나옵니다(280일). 생리 주기가 28일이 아니면 주기 차이만큼 보정하며, 초음파로 최종 확정합니다.' }]
    };
  }

  WT.mount({
    fields: ["lmp", "cycle", "term", "base"],
    segs: [],
    checks: [],
    required: ["lmp"],
    presets: {"생리일 2026-03-01": {"fields": {"lmp": "2026-03-01", "base": "", "cycle": 28, "term": 280}}, "생리일 2026-06-15": {"fields": {"lmp": "2026-06-15", "base": "", "cycle": 28, "term": 280}}, "생리일 2026-08-01 · 32일 주기": {"fields": {"lmp": "2026-08-01", "base": "", "cycle": 32, "term": 280}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
