/* ==========================================================================
   팩트체크 건강연구소 · 치아·잇몸 & 보험 스케일링 주기 체크기
   급여 기준: 만 19세 이상 · 연 1회(1.1~12.31) · 본인부담 30% (국민건강보험공단)
   --------------------------------------------------------------------------
   ⚠️ 급여 여부는 치과에서 공단 전산으로 확인. 이 화면은 참고용입니다.
   ========================================================================== */

(function () {
  "use strict";

  var OPTS = [
    { id: "bleed", emoji: "🩸", name: "칫솔질할 때 피가 난다", sub: "가끔이라도 = 치은염 신호", score: 2 },
    { id: "swell", emoji: "🫧", name: "잇몸이 붓거나 내려앉았다", sub: "치주염 진행 신호", score: 3 },
    { id: "sens", emoji: "🧊", name: "찬 것에 시린 느낌이 있다", sub: "상아질 지각과민·잇몸 퇴축", score: 1 },
    { id: "ortho", emoji: "🦷", name: "교정 중이다 (브라켓·투명교정)", sub: "치태가 끼기 쉬운 구조", score: 1 },
    { id: "implant", emoji: "🔩", name: "임플란트·보철·크라운이 있다", sub: "주위염 관리 필요", score: 1 },
    { id: "smoke", emoji: "🚬", name: "흡연한다", sub: "잇몸 혈류 감소·치주염 위험↑", score: 2 },
    { id: "brux", emoji: "😬", name: "이갈이·이 악물기가 있다", sub: "치아 마모·시린이 악화", score: 1 },
    { id: "preg", emoji: "🤰", name: "임신 중이다", sub: "임신성 치은염 주의", score: 1 }
  ];

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  function fmt(n) { return Math.round(n).toLocaleString("ko-KR"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseYmd(s) {
    if (!s) return null;
    var p = s.split("-");
    if (p.length !== 3) return null;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(d.getTime()) ? null : d;
  }
  function dayDiff(a, b) { return Math.round((b - a) / 86400000); }
  function kdate(d) { return d.getFullYear() + "년 " + (d.getMonth() + 1) + "월 " + d.getDate() + "일"; }

  var state = {
    date: null,        // 마지막 스케일링 날짜(Date) 또는 null
    none: false,       // 올해 받은 적 없음 / 기억 안 남
    age: null,
    opts: {},
    brush: 2,
    floss: 2,
    visit: 1
  };
  var timer = null;
  var last = null;

  function initTheme() {
    var btn = $("#themeToggle");
    var saved = null;
    try { saved = localStorage.getItem("fcl-theme"); } catch (e) {}
    var theme = saved || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    function paint(t) {
      btn.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
      btn.setAttribute("aria-label", t === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환");
    }
    paint(theme);
    btn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      paint(next);
      try { localStorage.setItem("fcl-theme", next); } catch (e) {}
    });
  }

  function optHtml() {
    return OPTS.map(function (o) {
      return '<label class="item">' +
        '<input type="checkbox" data-opt="' + o.id + '" aria-label="' + esc(o.name) + '">' +
        '<span class="item__box" aria-hidden="true"></span>' +
        '<span class="item__text"><span class="item__name">' + o.emoji + " " + esc(o.name) + '</span>' +
        '<span class="item__sub">' + esc(o.sub) + "</span></span></label>";
    }).join("");
  }

  /* ── 잇몸 위험도 ────────────────────────────────────────── */
  function riskScore() {
    var s = 0;
    OPTS.forEach(function (o) { if (state.opts[o.id]) s += o.score; });
    if (state.floss === 0) s += 2; else if (state.floss === 1) s += 1;
    if (state.brush === 1) s += 1;
    if (state.visit === 0) s += 1;
    return s;
  }
  var RISK_MAX = 15;
  function riskBand(s) {
    if (s <= 3) return { cls: "green", label: "낮음", text: "지금 습관이면 유지 쪽이에요" };
    if (s <= 7) return { cls: "amber", label: "보통", text: "한두 가지만 바꾸면 확 줄어듭니다" };
    return { cls: "red", label: "높음", text: "스케일링만으로 부족할 수 있어요" };
  }

  /* ── 급여 타임라인 ──────────────────────────────────────── */
  function schedule() {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var y = today.getFullYear();
    var nextJan1 = new Date(y + 1, 0, 1);
    var thisDec31 = new Date(y, 11, 31);
    var r = {
      today: today,
      status: "now",
      tone: "green",
      badge: "🟢 지금 받을 수 있어요",
      verdict: "지금 예약하면 올해 혜택으로 받습니다",
      desc: "",
      nextDate: null,
      dday: 0,
      used: false,
      lastDate: state.date,
      unknown: false
    };

    if (state.date === null) {
      if (state.none) {
        r.status = "now"; r.tone = "green";
        r.badge = "🟢 올해 혜택 아직 남았어요";
        r.verdict = "올해 안에 받으면 다음 급여는 내년 1월 1일";
        r.desc = "급여 기록을 확인하지 못했다면, The건강보험 앱 → 민원여기요 → 조회 → <b>치석제거 진료정보 조회</b>에서 올해 수령 여부를 30초면 확인할 수 있어요. 이미 받았다면 아래 '이번 연도 수령'으로 바꿔 주세요.";
        r.nextDate = thisDec31;
        r.dday = dayDiff(today, thisDec31);
        r.unknown = true;
      } else {
        r.status = "need"; r.tone = "amber";
        r.badge = "🟡 날짜를 넣어주세요";
        r.verdict = "마지막으로 받은 날을 넣으면 D-day를 계산합니다";
        r.desc = "날짜가 기억나지 않으면 빠른 선택에서 '올해 아직 없음'을 누르거나, The건강보험 앱에서 <b>치석제거 진료정보 조회</b>로 확인해 보세요.";
        r.nextDate = null; r.dday = null;
        return r;
      }
      return r;
    }

    var ly = state.date.getFullYear();
    if (ly === y) {
      r.used = true;
      r.nextDate = nextJan1;
      r.dday = dayDiff(today, nextJan1);
      if (r.dday <= 90) {
        r.status = "soon"; r.tone = "amber";
        r.badge = "🟡 " + r.dday + "일 뒤 다시 열립니다";
        r.verdict = "올해 혜택은 이미 썼고, 내년 1월 1일에 다시 열려요";
        r.desc = kdate(state.date) + "에 받으셨네요. 연도 기준이라 <b>" + (y + 1) + "년 1월 1일</b>부터 다시 급여로 받을 수 있습니다. 남은 기간은 치실·치간칫솔로 관리하고, 1월 초에 예약을 잡아두면 좋아요.";
      } else {
        r.status = "used"; r.tone = "red";
        r.badge = "🔴 올해 급여는 완료";
        r.verdict = "다음 급여일은 " + (y + 1) + "년 1월 1일입니다";
        r.desc = kdate(state.date) + "에 받아 올해 급여(연 1회)를 쓰셨어요. 다음 가능일은 <b>" + (y + 1) + "년 1월 1일</b>(" + r.dday + "일 뒤)입니다. 그 전에 잇몸이 붓거나 피가 나면 급여와 별개로 <b>치주 검사</b>는 지금 받으세요.";
      }
    } else {
      r.status = "now"; r.tone = "green";
      var yearsAgo = y - ly;
      r.badge = "🟢 지금 받을 수 있어요";
      r.verdict = "올해 급여가 그대로 남아 있습니다";
      r.desc = "마지막 스케일링은 <b>" + kdate(state.date) + "</b> — " + (yearsAgo >= 2 ? yearsAgo + "년 전" : "지난해") + "이네요. 지금 받으면 올해 혜택으로 처리되고, 다음 급여는 <b>" + (y + 1) + "년 1월 1일</b>에 열립니다.";
      r.nextDate = thisDec31;
      r.dday = dayDiff(today, thisDec31);
    }
    return r;
  }

  /* ── 결과 렌더 ──────────────────────────────────────────── */
  function analyze(scroll) {
    var r = schedule();
    var score = riskScore();
    var band = riskBand(score);
    var eligible = state.age === null || state.age >= 19;

    if (!eligible) {
      r.tone = "red";
      r.badge = "🔴 만 19세 미만은 급여 대상이 아닙니다";
      r.verdict = "스케일링은 비급여로 받아야 합니다";
      r.desc = "건강보험 치석제거 급여는 <b>만 19세 이상</b>부터 적용됩니다. 성장기에는 치과 검진·불소 도포·실란트가 더 중요해요.";
    }

    $("#resultSub").innerHTML = r.desc;

    $("#verdictBox").innerHTML =
      '<div class="verdict verdict--' + r.tone + '">' +
      '<span class="verdict__badge">' + r.badge + "</span>" +
      '<div class="verdict__title">' + r.verdict + "</div>" +
      '<div class="verdict__desc">잇몸 위험도 <b>' + band.label + "</b> · " + esc(band.text) + ". " +
      (r.nextDate && !r.used ? "올해 남은 기간 <b>" + fmt(r.dday) + "일</b>." : "") + "</div></div>";

    /* 요약 카드 */
    var ddayLabel = r.dday === null ? "—" : (r.used ? "D-" + r.dday : "D-" + r.dday);
    var cards = [
      { label: r.used ? "다음 급여까지" : "올해 남은 기간", num: r.dday === null ? "—" : fmt(r.dday), unit: "일", cls: r.tone === "green" ? "green" : (r.tone === "amber" ? "amber" : "red"), sub: r.used ? (state.date.getFullYear() + 1) + "년 1월 1일" : "12월 31일까지" },
      { label: "본인부담 예상", num: "1.8", unit: "만원", cls: "amber", sub: "2025년 의원급 30% 기준" },
      { label: "권장 다음 방문", num: band.cls === "red" ? "6" : "12", unit: "개월", cls: band.cls === "red" ? "red" : "green", sub: band.cls === "red" ? "치주 검사 먼저" : "연 1회 급여 주기" }
    ];
    $("#summaryBox").innerHTML = cards.map(function (c) {
      return '<div class="summary__card summary__card--' + c.cls + '"><span class="summary__label">' + c.label + "</span>" +
        '<span class="summary__num">' + c.num + "<small>" + c.unit + "</small></span>" +
        '<span class="summary__label" style="font-weight:600">' + c.sub + "</span></div>";
    }).join("");

    /* 타임라인 */
    var lastTxt = state.date ? kdate(state.date) : (state.none ? "올해 수령 기록 없음" : "기록 없음");
    var thisYearTxt = r.used ? "사용 완료" : (state.date ? "미사용" : "확인 필요");
    var nextTxt = r.used ? (state.date.getFullYear() + 1) + "년 1월 1일" : "지금 바로 가능";
    var gapTxt = state.date ? (r.used ? "받은 날부터 " + dayDiff(state.date, new Date()) + "일" : "이미 1년 이상 경과") : "—";

    $("#scheduleMetrics").innerHTML = [
      { l: "마지막 스케일링", v: lastTxt, s: "치과 청구 기록 기준" },
      { l: "올해 급여", v: thisYearTxt, s: "연 1회(1.1~12.31)", accent: !r.used },
      { l: "다음 급여 가능일", v: nextTxt, s: "1월 1일 리셋" },
      { l: "경과", v: gapTxt, s: "권장 주기 6~12개월" }
    ].map(function (m) {
      return '<div class="metric' + (m.accent ? " metric--accent" : "") + '"><span class="metric__label">' + m.l + "</span>" +
        '<div class="metric__value" style="font-size:19px;letter-spacing:-0.03em">' + m.v + "</div>" +
        '<div class="metric__sub">' + m.s + "</div></div>";
    }).join("");

    var tip = "";
    if (r.used) {
      tip = "<p><b>12월에 받으면 1월에 한 번 더</b> — 연도 기준이라, 12월에 받고 다음 해 1월에 또 받으면 1년 안에 두 번 급여 혜택을 받습니다. 반대로 1월에 받으면 다음 급여까지 1년을 기다려야 해요.</p>";
    } else {
      tip = "<p><b>올해 혜택은 12월 31일에 사라집니다</b> — 소급 적용이 안 되니, 연말 예약이 밀리는 12월 중순 전에 잡는 게 안전해요. 받은 뒤에는 다음 해 1월 1일부터 다시 급여가 열립니다.</p>";
    }
    if (band.cls === "red") {
      tip += "<p><b>잇몸 위험도가 높습니다</b> — 급여 스케일링(연 1회)과 별개로, 치주염이 있으면 6개월 간격 스케일링과 치근활택(잇몸 치료)이 필요합니다. 다음 예약 때 '치주낭 측정'을 요청하세요.</p>";
    }
    $("#yearTip").innerHTML = '<div class="card__body">' + tip + "</div>";

    /* 위험도 미터 */
    var pct = Math.min(100, score / RISK_MAX * 100);
    $("#riskMeter").innerHTML =
      '<div class="meter">' +
      '<div class="meter__head"><span class="meter__title">잇몸 위험 점수<small>' + band.label + " · " + score + " / " + RISK_MAX + "점</small></span>" +
      '<span class="meter__value">' + score + "<small>점</small></span></div>" +
      '<div class="meter__track"><div class="meter__fill">' +
      '<span class="meter__seg meter__seg--ok" style="width:27%"></span>' +
      '<span class="meter__seg meter__seg--mid" style="width:26%"></span>' +
      '<span class="meter__seg meter__seg--high" style="width:47%"></span>' +
      "</div>" +
      '<span class="meter__mark" style="left:' + pct.toFixed(1) + '%" data-label="' + band.label + '"></span></div>' +
      '<div class="meter__scale"><span>0 낮음</span><span>4</span><span>8</span><span>15 높음</span></div>' +
      "</div>" +
      '<div class="formula" style="margin-top:18px">점수 = 상태 항목(출혈 2 · 붓기 3 · 시린이 1 · 교정 1 · 보철 1 · 흡연 2 · 이갈이 1 · 임신 1) + 습관(치실 안 함 2 / 가끔 1, 칫솔질 1회 1, 검진 안 감 1)</div>';

    /* 위험 이유 */
    var reasons = [];
    if (state.opts.swell) reasons.push({ lv: "red", t: "잇몸이 붓거나 내려앉음", b: "치은염을 넘어 <b>치주염</b>일 가능성이 있습니다. 스케일링만으로는 잇몸 속 치석(치주낭)이 안 빠져서 치근활택이 필요할 수 있어요." });
    if (state.opts.bleed) reasons.push({ lv: "red", t: "칫솔질 출혈", b: "건강한 잇몸은 칫솔질로 피가 나지 않습니다. 출혈은 <b>치은 염증</b>의 가장 흔한 신호이고, 흡연자는 출혈이 적어 더 늦게 발견됩니다." });
    if (state.opts.smoke) reasons.push({ lv: "amber", t: "흡연", b: "흡연은 잇몸 혈류를 줄여 염증을 숨기고 치주염 위험을 높입니다. 스케일링 후 회복도 느립니다." });
    if (state.opts.sens) reasons.push({ lv: "amber", t: "시린이", b: "잇몸이 내려앉아 치아 뿌리가 드러났을 수 있습니다. 불소·질산칼륨 치약 + 부드러운 칫솔 + 산성 음료 줄이기가 기본이에요." });
    if (state.opts.ortho) reasons.push({ lv: "amber", t: "교정 중", b: "브라켓·와이어 주변은 치태가 끼기 쉬워 <b>치간칫솔·워터픽</b>이 사실상 필수입니다." });
    if (state.opts.implant) reasons.push({ lv: "amber", t: "임플란트·보철", b: "임플란트 주위염은 통증 없이 진행됩니다. 보철 사이는 치간칫솔로 매일 닦아야 해요." });
    if (state.floss === 0) reasons.push({ lv: "amber", t: "치실·치간칫솔 안 함", b: "치아 사이는 칫솔이 닿지 않는 면적이 <b>40%</b>입니다. 여기 치태가 남으면 6개월~1년 만에 치석이 됩니다." });
    if (state.brush === 1) reasons.push({ lv: "amber", t: "하루 1회 칫솔질", b: "특히 <b>자기 전</b> 칫솔질이 중요합니다. 자는 동안 침 분비가 줄어 입안 세균이 가장 활발해요." });
    if (state.visit === 0) reasons.push({ lv: "amber", t: "정기검진 안 감", b: "치주염은 통증이 거의 없이 진행됩니다. 1년에 한 번 검진 + 스케일링이 최소선입니다." });
    if (state.opts.brux) reasons.push({ lv: "amber", t: "이갈이·이 악물기", b: "치아가 마모되면 시린이가 심해집니다. 야간 나이트가드 상담을 받아 보세요." });
    if (state.opts.preg) reasons.push({ lv: "amber", t: "임신 중", b: "호르몬 변화로 잇몸이 붓기 쉽습니다(임신성 치은염). 스케일링은 안전하고 권장됩니다." });
    reasons.push({ lv: "green", t: "지금 잘하고 있는 것", b: (state.floss === 2 ? "매일 치실·치간칫솔 " : "") + (state.brush >= 2 ? "하루 " + state.brush + "회 칫솔질 " : "") + (state.visit >= 1 ? "· 정기검진 " : "") + "— 이 세 가지를 유지하는 게 스케일링보다 중요합니다." });

    var order = { red: 0, amber: 1, green: 2 };
    reasons.sort(function (a, b) { return order[a.lv] - order[b.lv]; });
    $("#riskReasons").innerHTML =
      '<div class="rule-group rule-group--red"><div class="rule-group__head"><span class="rule-group__badge">🔴 먼저 볼 것</span>' +
      '<span class="rule-group__count">' + reasons.filter(function (x) { return x.lv === "red"; }).length + "개</span></div>" +
      '<div class="rule-list">' + reasons.filter(function (x) { return x.lv === "red"; }).map(ruleHtml).join("") + "</div></div>" +
      '<div class="rule-group rule-group--amber" style="margin-top:18px"><div class="rule-group__head"><span class="rule-group__badge">🟡 관리 포인트</span>' +
      '<span class="rule-group__count">' + reasons.filter(function (x) { return x.lv === "amber"; }).length + "개</span></div>" +
      '<div class="rule-list">' + reasons.filter(function (x) { return x.lv === "amber"; }).map(ruleHtml).join("") + "</div></div>" +
      '<div class="rule-group rule-group--green" style="margin-top:18px"><div class="rule-group__head"><span class="rule-group__badge">🟢 유지</span></div>' +
      '<div class="rule-list">' + reasons.filter(function (x) { return x.lv === "green"; }).map(ruleHtml).join("") + "</div></div>";

    /* 관리 도구 */
    var tools = [];
    if (state.opts.swell || state.opts.implant || state.opts.ortho) {
      tools.push({ n: "1", t: "치간칫솔 (0.8~1.2mm부터)", b: "잇몸이 내려앉았거나 보철·교정장치가 있으면 <b>치간칫솔</b>이 치실보다 치태 제거에 유리합니다. 치아 사이에 저항 없이 들어가는 가장 큰 사이즈부터, 하루 1회 자기 전.", now: "오늘부터" });
    }
    if (!tools.length) {
      tools.push({ n: "1", t: "치실 (하루 1회, 자기 전)", b: "치아 사이가 붙어 있으면 치실이 맞습니다. C자로 감싸 잇몸선 아래 1~2mm까지 넣어야 치태가 빠져요. 피가 나도 1주일은 계속하세요 — 그게 염증이 가라앉는 과정입니다.", now: "오늘 밤" });
    }
    if (state.opts.ortho || state.opts.implant) {
      tools.push({ n: "2", t: "구강세정기(워터픽) 보조", b: "치실을 <b>대체하지 못하지만</b>, 교정장치·임플란트 주위·지혜치아 뒤쪽처럼 손이 어려운 곳에 도움이 됩니다. 압력은 가장 낮은 단계부터.", now: "주 3회부터" });
    }
    if (state.opts.sens) {
      tools.push({ n: "3", t: "시린이 치약 (불소 1,450ppm + 질산칼륨)", b: "치약을 바른 뒤 1분간 물로 헹구지 않고 두면 효과가 커집니다. 그래도 2주 이상 시리면 충치·치아 균열 감별이 필요해요.", now: "오늘부터" });
    }
    if (state.opts.bleed && state.brush <= 2) {
      tools.push({ n: "4", t: "칫솔질은 '부드럽게 2분'", b: "세게 문지르면 잇몸이 더 내려앉습니다. 45도로 잇몸 경계에 대고 <b>작게 진동</b>하듯, 치아 3면을 2분간. 전동칫솔은 압력 센서가 있는 모델이 좋아요.", now: "오늘 밤" });
    }
    tools.push({ n: String(tools.length + 1), t: "불소 치약은 1,000ppm 이상", b: "충치 예방에는 <b>불소 1,000~1,500ppm</b> 치약이 유효합니다. 어린이용 저불소 치약은 성인에게 약합니다.", now: "치약 교체 시" });

    $("#toolList").innerHTML = tools.map(function (t) {
      return '<div class="plan__item"><span class="plan__num">' + t.n + "</span><div>" +
        '<div class="plan__title">' + t.t + "</div>" +
        '<div class="plan__body">' + t.b + " " +
        '<span class="plan__now">' + t.now + "</span></div></div></div>";
    }).join("");

    /* 루틴 */
    var night = ["칫솔질 2분 (치아 3면)", "치실 또는 " + (state.opts.swell || state.opts.implant || state.opts.ortho ? "치간칫솔" : "치실") + " 12곳", "혀 닦기 10초"];
    var morning = ["아침 칫솔질 2분", state.opts.sens ? "시린이 치약 (헹구지 않기)" : "불소 치약"];
    var weekly = state.opts.ortho ? ["브라켓 주변 치간칫솔 집중", "워터픽으로 장치 뒤 세정"] : ["치간칫솔·치실 소모 확인", "칫솔모 교체 주기(3개월) 점검"];

    $("#routineSlots").innerHTML = [
      { label: "아침", clock: "기상 후", items: morning },
      { label: "저녁 (핵심)", clock: "자기 전 30분", items: night },
      { label: "주 1회", clock: "주말", items: weekly }
    ].map(function (s) {
      return '<div class="slot"><div class="slot__time"><span class="slot__label">' + s.label + '</span><span class="slot__clock">' + s.clock + "</span></div>" +
        '<div class="slot__items">' + s.items.map(function (i) { return '<span class="pill">' + i + "</span>"; }).join("") + "</div></div>";
    }).join("");

    last = { r: r, score: score, band: band, eligible: eligible };

    if (!$("#result").hidden) return;
    $("#result").hidden = false;
    if (scroll) $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function ruleHtml(x) {
    return '<div class="rule rule--' + x.lv + '"><div class="rule__head"><span class="rule__level">' +
      (x.lv === "red" ? "주의" : x.lv === "amber" ? "관리" : "유지") + '</span><span class="rule__title">' + x.t + "</span></div>" +
      '<div class="rule__body">' + x.b + "</div></div>";
  }

  function updateCount() {
    var filled = (state.date ? 1 : 0) + (state.none ? 1 : 0) + (state.age ? 1 : 0);
    var optN = Object.keys(state.opts).length;
    $("#countText").textContent = (state.date || state.none) ? "계산할 수 있어요" : (filled || optN ? "날짜를 넣으면 D-day 계산" : "날짜나 나이를 넣으면 자동 계산");
    $("#countHint").textContent = optN ? "상태 " + optN + "개 반영" : "상태를 체크하면 루틴이 바뀝니다";
  }

  function schedule_() {
    clearTimeout(timer);
    timer = setTimeout(function () { analyze(false); }, 220);
  }

  function toast(msg) {
    var el = document.createElement("div");
    el.className = "toast"; el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.style.opacity = "1"; el.style.transform = "translate(-50%, 0)"; });
    setTimeout(function () { el.style.opacity = "0"; setTimeout(function () { el.remove(); }, 300); }, 1800);
  }

  function copyResult() {
    if (!last) return;
    var r = last.r, band = last.band;
    var text = "【스케일링 급여 체크】\n" +
      r.badge.replace(/[🟢🟡🔴]\s?/g, "") + "\n" +
      (r.used ? "다음 급여 가능일: " + kdate(r.nextDate) + " (D-" + r.dday + ")" : "올해 남은 기간: " + r.dday + "일 (12/31까지)") + "\n" +
      "잇몸 위험도: " + band.label + " (" + last.score + "점)\n" +
      "본인부담 예상: 약 1.8만원 (2025년 의원급 30% 기준)";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("결과를 복사했어요"); }, function () { toast("복사에 실패했어요"); });
    } else toast("복사가 지원되지 않는 브라우저예요");
  }

  function init() {
    initTheme();
    $("#optList").innerHTML = optHtml();

    $("#lastDate").addEventListener("input", function (e) {
      state.date = parseYmd(e.target.value);
      state.none = !state.date;
      $$(".preset").forEach(function (b) { b.classList.remove("is-active"); });
      updateCount(); schedule_();
    });
    $("#age").addEventListener("input", function (e) {
      state.age = num(e.target.value);
      updateCount(); schedule_();
    });

    $$("#optList input").forEach(function (el) {
      el.addEventListener("change", function () {
        if (el.checked) state.opts[el.dataset.opt] = true; else delete state.opts[el.dataset.opt];
        updateCount(); schedule_();
      });
    });

    [["#brushSeg", "brush"], ["#flossSeg", "floss"], ["#visitSeg", "visit"]].forEach(function (pair) {
      $$(pair[0] + " .seg__btn").forEach(function (b) {
        b.addEventListener("click", function () {
          $$(pair[0] + " .seg__btn").forEach(function (x) { x.classList.remove("is-on"); x.setAttribute("aria-pressed", "false"); });
          b.classList.add("is-on"); b.setAttribute("aria-pressed", "true");
          state[pair[1]] = parseInt(b.dataset.v, 10);
          updateCount(); schedule_();
        });
      });
    });

    $$(".preset").forEach(function (b) {
      b.addEventListener("click", function () {
        var m = parseInt(b.dataset.months, 10);
        var d = new Date();
        if (m === -1) {
          state.date = null; state.none = true;
          $("#lastDate").value = "";
        } else {
          d.setMonth(d.getMonth() - m);
          state.date = d; state.none = false;
          $("#lastDate").value = ymd(d);
        }
        $$(".preset").forEach(function (x) { x.classList.remove("is-active"); });
        b.classList.add("is-active");
        updateCount(); analyze(false);
      });
    });

    $("#analyzeBtn").addEventListener("click", function () { analyze(true); });
    $("#resetBtn").addEventListener("click", function () {
      state = { date: null, none: false, age: null, opts: {}, brush: 2, floss: 2, visit: 1 };
      $("#lastDate").value = ""; $("#age").value = "";
      $$("#optList input").forEach(function (el) { el.checked = false; });
      [["#brushSeg", 1], ["#flossSeg", 2], ["#visitSeg", 1]].forEach(function (p) {
        $$(p[0] + " .seg__btn").forEach(function (x, i) { x.classList.toggle("is-on", i === p[1]); x.setAttribute("aria-pressed", i === p[1] ? "true" : "false"); });
      });
      $$(".preset").forEach(function (x) { x.classList.remove("is-active"); });
      $("#result").hidden = true; last = null;
      updateCount();
      $("#checker").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("#copyBtn").addEventListener("click", copyResult);
    $("#editBtn").addEventListener("click", function () { $("#checker").scrollIntoView({ behavior: "smooth", block: "start" }); });

    var y = $("#year");
    if (y) y.textContent = String(new Date().getFullYear());
    updateCount();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
