/* px ↔ rem ↔ vw 변환기 (반응형 CSS 단위 계산) — css-units/app.js (팩트체크 건강연구소 무료 웹툴) */
(function () {
  'use strict';

function compute(get, seg, chk, val, fmt, won, wonShort, pct) {
    var v = get('px') || 0;
    var from = seg('from');
    var root = isFinite(get('root')) ? get('root') : 16;
    var vw = isFinite(get('vw')) ? get('vw') : 1440;
    var parent = isFinite(get('parent')) ? get('parent') : 16;
    var vh = isFinite(get('vh')) ? get('vh') : 900;

    var px = from === 'rem' ? v * root : v;
    var rem = px / root;
    var em = px / parent;
    var vwp = px / vw * 100;
    var vhp = px / vh * 100;
    var pt = px * 0.75;

    var rows = [
      { k: 'px', v: fmt(px, 2) + 'px' },
      { k: 'rem (루트 ' + fmt(root) + 'px)', v: fmt(rem, 4) + 'rem' },
      { k: 'em (부모 ' + fmt(parent) + 'px)', v: fmt(em, 4) + 'em' },
      { k: 'vw (' + fmt(vw) + 'px 기준)', v: fmt(vwp, 3) + 'vw' },
      { k: 'vh (' + fmt(vh) + 'px 기준)', v: fmt(vhp, 3) + 'vh' },
      { k: 'pt (인쇄)', v: fmt(pt, 2) + 'pt' },
      { k: '% (부모 대비)', v: fmt(px / parent * 100, 2) + '%' }
    ];

    var table = [8, 10, 12, 14, 16, 18, 20, 24, 32, 40, 48, 64].map(function (p) {
      return [p + 'px', fmt(p / root, 3) + 'rem', fmt(p / root * 10, 1) + 'px@62.5%', fmt(p / vw * 100, 3) + 'vw'];
    });

    return {
      verdict: {
        kicker: '변환 결과', icon: '📐',
        title: fmt(rem, 3) + 'rem',
        desc: fmt(px, 2) + 'px은 루트 ' + fmt(root) + 'px 기준으로 <b>' + fmt(rem, 3) + 'rem</b>, 부모 ' + fmt(parent) + 'px 기준 <b>' + fmt(em, 3) +
              'em</b>, 뷰포트 ' + fmt(vw) + 'px 기준 <b>' + fmt(vwp, 2) + 'vw</b>입니다. 인쇄 단위로는 ' + fmt(pt, 1) + 'pt입니다.',
        cls: 'verdict--ok'
      },
      stats: [
        { l: 'px', v: fmt(px, 1) },
        { l: 'rem', v: fmt(rem, 3), cls: 'is-accent' },
        { l: 'vw', v: fmt(vwp, 2) },
        { l: 'pt', v: fmt(pt, 1) }
      ],
      rows: rows,
      table: { head: ['px', 'rem(16)', '62.5% 루트', 'vw'], rows: table,
               note: '루트 16px과 62.5%(10px) 기준의 rem 환산표입니다.' },
      notes: [{ html: '<b>62.5% 트릭</b> — html { font-size: 62.5%; }로 두면 1rem = 10px이 되어 계산이 쉬워집니다. 다만 브라우저 최소 폰트 크기 설정이나 접근성 도구에서 문제가 될 수 있어, 요즘은 16px 루트에 <b>clamp()</b>로 반응형 크기를 주는 방식이 권장됩니다.' }]
    };
  }

  WT.mount({
    fields: ["px", "root", "vw", "parent", "vh"],
    segs: ["from"],
    checks: [],
    required: ["px"],
    presets: {"16px (기본)": {"fields": {"px": 16, "root": 16, "vw": 1440, "parent": 16, "vh": 900}, "segs": {"from": "px"}}, "24px 제목": {"fields": {"px": 24, "root": 16, "vw": 1440, "parent": 16, "vh": 900}, "segs": {"from": "px"}}, "2.5rem → px": {"fields": {"px": 2.5, "root": 16, "vw": 390, "parent": 16, "vh": 844}, "segs": {"from": "rem"}}},
    validate: null,
    auto: false,
    compute: compute
  });

})();
