/* ==========================================================================
   팩트체크 건강연구소 · 알약 쪼개기/가루 금지 제형 판별기
   판정 기준: 제형(서방·장용·연질캡슐·설하정·ODT·경질캡슐·세포독성) + 분할선
   --------------------------------------------------------------------------
   ⚠️ 제품별 예외가 있으므로 최종 확인은 포장 설명서·약사.
   ========================================================================== */

(function () {
  "use strict";

  /* 제형 정의: split = 쪼개기 판정, open = 가루·캡슐 열기 판정 */
  var FORMS = {
    sr: {
      short: "서방형", label: "서방정 · 서방캡슐 (SR·XR·ER·CR·LA·MR)", emoji: "⏳",
      split: "red", open: "red",
      why: "12~24시간에 걸쳐 약을 조금씩 내보내도록 코팅·매트릭스로 만든 제형입니다. 자르면 그 구조가 깨져 <b>하루치가 한꺼번에 흡수</b>됩니다(dose dumping).",
      sub: "지속정·서방형·서방정 표기"
    },
    ec: {
      short: "장용형", label: "장용정 · 장용캡슐 (EC)", emoji: "🛡️",
      split: "red", open: "red",
      why: "위산에서 약을 보호하려고 <b>위에서는 녹지 않는 코팅</b>을 입힌 제형입니다. 부수면 위에서 코팅이 깨져 약물이 파괴되거나 위벽을 자극합니다.",
      sub: "장용정·장용캡슐·EC 표기"
    },
    soft: {
      short: "연질캡슐", label: "연질캡슐 (오메가3·비타민D·리퀴겔)", emoji: "🫧",
      split: "red", open: "red",
      why: "액상 내용물을 얇은 젤라틴 막에 담은 제형입니다. 잘라 짜면 내용물이 <b>위 점막에 직접 닿아</b> 속쓰림·구역·비린 맛이 생기고, 산화되기 쉽습니다.",
      sub: "젤라틴 캡슐·연질캡슐"
    },
    sl: {
      short: "설하정", label: "설하정 (혀 밑에서 녹는 정)", emoji: "👅",
      split: "red", open: "red",
      why: "혀 밑 점막으로 <b>빠르게 흡수</b>시키려고 만든 제형입니다. 쪼개면 용량이 불균일하고, 삼키면 간에서 대사되어 효과가 크게 떨어집니다.",
      sub: "설하정·설하錠"
    },
    odt: {
      short: "구강붕해정", label: "구강붕해정 (ODT · 입에서 녹는 정)", emoji: "💧",
      split: "amber", open: "amber",
      why: "침으로 녹여 먹도록 만든 부스러지기 쉬운 정입니다. 쪼개면 <b>조각 크기가 들쭉날쭉</b>해지고 습기를 먹어 용량이 부정확해집니다. 물 없이 그대로 녹여 드세요.",
      sub: "ODT·구강붕해정·잽"
    },
    cap: {
      short: "경질캡슐", label: "경질캡슐 (가루·펠렛이 든 캡슐)", emoji: "💊",
      split: "red", open: "amber",
      why: "캡슐 자체는 나눌 수 없습니다. 열어서 먹는 건 <b>내용물이 단순 가루일 때만</b> 가능하고, 펠렛(작은 알갱이)이면 장용 코팅이 깨져 위험합니다.",
      sub: "캡슐제·경질캡슐"
    },
    tabScore: {
      short: "분할선 있는 정", label: "일반 나정 · 분할선(홈) 있음", emoji: "✂️",
      split: "green", open: "amber",
      why: "제조사가 <b>나눠 먹도록 허가한</b> 제형입니다. 분할기를 쓰면 가능하지만, 손으로 반 자르면 조각 간 함량 차이가 커집니다.",
      sub: "가운데 홈이 있는 정"
    },
    tabNoScore: {
      short: "분할선 없는 정", label: "일반 나정 · 분할선 없음", emoji: "⚪",
      split: "amber", open: "amber",
      why: "쪼갤 수는 있지만 <b>균등하게 나뉘지 않습니다</b>. 특히 용량이 적은 약(갑상선약·혈압약)은 조각 차이가 효과에 영향을 줄 수 있어 지시가 있을 때만.",
      sub: "홈이 없는 일반정"
    },
    chemo: {
      short: "세포독성", label: "항암제 · 세포독성 약", emoji: "☣️",
      split: "red", open: "red",
      why: "가루·부스러기가 <b>피부·호흡기로 흡입되면 위험</b>하고, 코팅이 파괴되면 흡수가 달라집니다. 절대 집에서 나누지 말고 조제실에서 처리해야 합니다.",
      sub: "항암제·면역억제제 계열"
    },
    hr: {
      short: "좁은 치료역", label: "호르몬 · 좁은 치료역 약", emoji: "⚖️",
      split: "amber", open: "amber",
      why: "효과와 부작용 사이 폭이 좁아 <b>조금만 용량이 달라도</b> 결과가 달라집니다. 분할은 처방의 지시가 있을 때만, 분할기로.",
      sub: "갑상선호르몬·항응고제·피임약 등"
    }
  };

  var DRUGS = [
    { n: "다이아벡스XR", a: ["다이아벡스", "메트포르민서방", "metformin xr"], f: "sr", note: "메트포르민 서방정 — 24시간 방출" },
    { n: "글루코파지XR", a: ["글루코파지", "메트포르민"], f: "sr", note: "메트포르민 서방정" },
    { n: "아달라트오로스", a: ["아달라트", "니페디핀서방"], f: "sr", note: "니페디핀 서방정 — 혈압" },
    { n: "스프렌딜", a: ["펠로디핀", "스프렌딜정"], f: "sr", note: "펠로디핀 서방정 — 혈압" },
    { n: "디아미크론MR", a: ["디아미크론", "글리클라지드"], f: "sr", note: "글리클라지드 서방정 — 혈당" },
    { n: "볼타렌SR", a: ["볼타렌", "디클로페낙서방"], f: "sr", note: "디클로페낙 서방정 — 진통" },
    { n: "웰부트린XL", a: ["웰부트린", "부프로피온"], f: "sr", note: "부프로피온 서방정 — 금연·우울" },
    { n: "리리카CR", a: ["리리카 cr", "프레가발린서방"], f: "sr", note: "프레가발린 서방정" },
    { n: "트리돌서방정", a: ["트리돌", "트라마돌서방"], f: "sr", note: "트라마돌 서방정 — 진통" },
    { n: "테오필린서방정", a: ["테오필린", "테오날"], f: "sr", note: "천식 — 농도 급상승 시 위험" },
    { n: "디트루스톨", a: ["톨터로딘", "디트루스톨"], f: "sr", note: "톨터로딘 서방캡슐 — 방광" },
    { n: "디트로판XL", a: ["옥시부티닌", "디트로판"], f: "sr", note: "옥시부티닌 서방정" },
    { n: "가바펜틴서방정", a: ["가바펜틴"], f: "sr", note: "신경병증 통증 — 서방형" },
    { n: "아스피린프로텍트", a: ["아스피린프로텍트", "아스피린장용"], f: "ec", note: "아스피린 장용정 — 위 보호 코팅" },
    { n: "로섹캡슐", a: ["로섹", "오메프라졸"], f: "ec", note: "오메프라졸 장용캡슐 — 펠렛" },
    { n: "넥시움캡슐", a: ["넥시움", "에소메프라졸"], f: "ec", note: "에소메프라졸 장용캡슐" },
    { n: "판토록정", a: ["판토록", "판토프라졸"], f: "ec", note: "판토프라졸 장용정" },
    { n: "란스톤캡슐", a: ["란스톤", "란소프라졸"], f: "ec", note: "란소프라졸 장용캡슐" },
    { n: "파리에트정", a: ["파리에트", "라베프라졸"], f: "ec", note: "라베프라졸 장용정" },
    { n: "펜타사정", a: ["펜타사", "메살라진"], f: "ec", note: "메살라진 장용정 — 장까지 가야 함" },
    { n: "크레온캡슐", a: ["크레온", "판크레아틴", "소화효소"], f: "ec", note: "췌장효소 — 부수면 입 안 점막 자극" },
    { n: "심발타캡슐", a: ["심발타", "둘록세틴"], f: "cap", note: "펠렛 캡슐 — 열면 코팅 손상", open: "red" },
    { n: "리리카캡슐", a: ["리리카캡슐", "프레가발린캡슐"], f: "cap", note: "가루 캡슐 — 약사 지시 없이 열지 말 것" },
    { n: "오메가3연질캡슐", a: ["오메가3", "피쉬오일", "rTG"], f: "soft", note: "짜서 먹으면 위 자극·산화" },
    { n: "비타민D연질캡슐", a: ["비타민d", "비타민디", "콜레칼시페롤"], f: "soft", note: "고함량 연질캡슐" },
    { n: "이부프로펜리퀴겔", a: ["이부프로펜리퀴겔", "리퀴겔", "부루펜리퀴겔"], f: "soft", note: "액상 연질캡슐 — 짜면 위 자극" },
    { n: "프로게스테론연질캡슐", a: ["프로게스테론", "유트로게스탄", "듀파스톤"], f: "soft", note: "호르몬 연질캡슐" },
    { n: "네오랄연질캡슐", a: ["네오랄", "사이클로스포린"], f: "soft", note: "흡수 변동 큼 — 쪼개지 말 것" },
    { n: "니트로린설하정", a: ["니트로린", "니트로글리세린"], f: "sl", note: "협심증 — 혀 밑에서 녹여야 효과" },
    { n: "자이프렉사잽", a: ["자이프렉사", "올란자핀"], f: "odt", note: "구강붕해정 — 물 없이 녹여서" },
    { n: "레메론ODT", a: ["레메론", "미르타자핀"], f: "odt", note: "구강붕해정" },
    { n: "아리셉트ODT", a: ["아리셉트", "도네페질"], f: "odt", note: "구강붕해정 — 치매약" },
    { n: "조프란ODT", a: ["조프란", "온단세트론"], f: "odt", note: "구강붕해정 — 구역" },
    { n: "씬지로이드정", a: ["씬지로이드", "레보티록신", "갑상선"], f: "hr", note: "갑상선호르몬 — 용량 민감", split: "red" },
    { n: "쿠마딘정", a: ["쿠마딘", "와파린"], f: "hr", note: "항응고제 — 분할은 지시 있을 때만" },
    { n: "글리벡정", a: ["글리벡", "이마티닙"], f: "chemo", note: "표적항암제 — 분쇄 금지" },
    { n: "젤로다정", a: ["젤로다", "카페시타빈"], f: "chemo", note: "경구 항암제 — 절대 분할 금지" },
    { n: "아라바정", a: ["아라바", "레플루노마이드"], f: "chemo", note: "면역억제제 — 분쇄 시 흡입 위험" },
    { n: "메토트렉세이트정", a: ["메토트렉세이트", "mtx"], f: "chemo", note: "세포독성 — 가루 금지" },
    { n: "타이레놀정500mg", a: ["타이레놀", "아세트아미노펜"], f: "tabScore", note: "분할선 있는 일반정" },
    { n: "메트포르민정500mg", a: ["메트포르민정", "글루코파지정"], f: "tabScore", note: "일반정 — 서방형과 다름" },
    { n: "리피토정", a: ["리피토", "아토르바스타틴"], f: "tabScore", note: "분할선 있는 일반정" },
    { n: "알레그라정", a: ["알레그라", "펙소페나딘"], f: "tabNoScore", note: "일반정 — 홈 없음" }
  ];

  var ACTIONS = {
    split: { label: "반으로 쪼개기", short: "쪼개기", verb: "쪼개면" },
    quarter: { label: "1/4로 쪼개기", short: "1/4 분할", verb: "1/4로 쪼개면" },
    powder: { label: "가루내기", short: "가루", verb: "가루내면" },
    open: { label: "캡슐 열기", short: "캡슐 개봉", verb: "캡슐을 열면" }
  };

  var TONE = {
    red: { badge: "🔴 절대 금지", cls: "red" },
    amber: { badge: "🟡 조건부 가능", cls: "amber" },
    green: { badge: "🟢 분할 가능", cls: "green" }
  };
  var RANK = { red: 3, amber: 2, green: 1 };

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function norm(s) { return String(s || "").toLowerCase().replace(/\s+/g, ""); }
  function worst(a, b) { return RANK[a] >= RANK[b] ? a : b; }

  var state = { query: "", drug: null, forms: {}, action: "split" };
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

  /* ── 검색 ─────────────────────────────────────────────── */
  function search(q) {
    var nq = norm(q);
    if (nq.length < 2) return [];
    var out = [];
    DRUGS.forEach(function (d) {
      var hay = norm(d.n) + " " + d.a.map(norm).join(" ");
      if (hay.indexOf(nq) >= 0) out.push(d);
    });
    return out.slice(0, 6);
  }

  function drugVerdict(d, action) {
    var f = FORMS[d.f];
    var base = action === "split" || action === "quarter" ? f.split : f.open;
    if (d.split && (action === "split" || action === "quarter")) base = worst(base, d.split);
    if (d.open && (action === "powder" || action === "open")) base = worst(base, d.open);
    if (action === "quarter") {
      // 1/4 분할은 어떤 경우에도 균등 분할이 어렵다
      if (base === "green") base = "amber";
    }
    if (action === "open" && f.split === "red" && d.open === undefined) base = worst(base, f.open);
    return base;
  }

  /* ── 결과 계산 ────────────────────────────────────────── */
  function compute() {
    var chosen = [];
    if (state.drug) chosen.push({ form: FORMS[state.drug.f], drug: state.drug });
    Object.keys(state.forms).forEach(function (k) {
      if (state.forms[k]) chosen.push({ form: FORMS[k], drug: null });
    });
    if (!chosen.length) return null;

    var tone = "green";
    chosen.forEach(function (c) {
      var f = c.form;
      var v = (state.action === "split" || state.action === "quarter") ? f.split : f.open;
      if (c.drug) v = drugVerdict(c.drug, state.action);
      tone = worst(tone, v);
    });

    return { chosen: chosen, tone: tone, action: state.action };
  }

  function verdictTitle(tone, action, drug) {
    var v = ACTIONS[action].verb;
    if (tone === "red") {
      return drug ? "이 약은 " + v + " 안 됩니다" : "이 제형은 " + v + " 안 됩니다";
    }
    if (tone === "amber") {
      if (action === "quarter") return "1/4 분할은 정확히 나누기 어렵습니다";
      if (action === "powder") return "가루는 약사 지시가 있을 때만";
      if (action === "open") return "캡슐은 열지 말고 그대로 드세요";
      return "분할선·지시가 있을 때만 나누세요";
    }
    return "분할선이 있으면 나눠 먹을 수 있어요";
  }

  function analyze(scroll) {
    var r = compute();
    if (!r) {
      $("#countText").textContent = "약 이름이나 제형을 넣어주세요";
      if (!$("#result").hidden) { $("#result").hidden = true; last = null; }
      return;
    }
    var t = TONE[r.tone];
    var drug = state.drug;
    var names = r.chosen.map(function (c) { return c.drug ? c.drug.n : c.form.short; }).join(" · ");

    $("#resultSub").innerHTML = (drug ? "<b>" + esc(drug.n) + "</b> — " + esc(drug.note) + ". " : "") +
      "선택한 제형: <b>" + esc(names) + "</b> / 하려는 행동: <b>" + ACTIONS[r.action].label + "</b>";

    $("#verdictBox").innerHTML =
      '<div class="verdict verdict--' + t.cls + '">' +
      '<span class="verdict__badge">' + t.badge + "</span>" +
      '<div class="verdict__title">' + verdictTitle(r.tone, r.action, drug) + "</div>" +
      '<div class="verdict__desc">' + verdictWhy(r) + "</div></div>";

    /* 요약 */
    var splitTone = r.chosen.reduce(function (acc, c) { return worst(acc, c.drug ? drugVerdict(c.drug, "split") : c.form.split); }, "green");
    var powderTone = r.chosen.reduce(function (acc, c) { return worst(acc, c.drug ? drugVerdict(c.drug, "powder") : c.form.open); }, "green");
    $("#summaryBox").innerHTML = [
      { label: "제형", num: r.chosen.length > 1 ? r.chosen.length + "종" : r.chosen[0].form.short, cls: "" },
      { label: "쪼개기", num: splitTone === "red" ? "금지" : splitTone === "amber" ? "조건부" : "가능", cls: splitTone },
      { label: "가루·캡슐 열기", num: powderTone === "red" ? "금지" : powderTone === "amber" ? "조건부" : "가능", cls: powderTone }
    ].map(function (c) {
      return '<div class="summary__card' + (c.cls ? " summary__card--" + c.cls : "") + '">' +
        '<span class="summary__label">' + c.label + "</span>" +
        '<span class="summary__num" style="font-size:22px">' + c.num + "</span></div>";
    }).join("");

    /* 근거 */
    var lvName = { red: "금지", amber: "조건부", green: "가능" };
    $("#reasonList").innerHTML = r.chosen.map(function (c) {
      var f = c.form;
      var v = c.drug ? drugVerdict(c.drug, "split") : f.split;
      var title = c.drug ? c.drug.n + " — " + f.short : f.short;
      var meta = c.drug ? c.drug.note : f.sub;
      return '<div class="rule rule--' + v + '">' +
        '<div class="rule__head"><span class="rule__level">' + lvName[v] + "</span>" +
        '<span class="rule__title">' + (c.drug ? "💊 " : f.emoji + " ") + esc(title) + "</span></div>" +
        '<div class="rule__body" style="font-size:12.8px;color:var(--ink-3)">' + esc(f.label) + " · " + esc(meta) + "</div>" +
        '<div class="rule__body">' + f.why + "</div></div>";
    }).join("");

    /* 제형 표 */
    var order = ["sr", "ec", "soft", "sl", "odt", "cap", "tabScore", "tabNoScore", "chemo", "hr"];
    $("#formBody").innerHTML = order.map(function (k) {
      var f = FORMS[k];
      return "<tr><td>" + f.emoji + " " + esc(f.short) + "</td>" +
        "<td><span class=\"tbadge tbadge--" + f.split + "\">" + (f.split === "red" ? "금지" : f.split === "amber" ? "조건부" : "가능") + "</span></td>" +
        "<td><span class=\"tbadge tbadge--" + f.open + "\">" + (f.open === "red" ? "금지" : f.open === "amber" ? "조건부" : "가능") + "</span></td>" +
        "<td style=\"white-space:normal;text-align:left;min-width:150px;font-size:12px;line-height:1.5\">" + esc(f.sub) + "</td></tr>";
    }).join("");

    /* 대안 */
    var alts = [];
    if (r.tone === "red" || r.tone === "amber") {
      alts.push({ t: "함량이 작은 정으로 처방 변경", b: "예: 10mg을 반으로 나누는 대신 <b>5mg 정</b>으로 처방받기. 가장 확실하고, 보험 적용도 그대로 됩니다.", now: "다음 처방 때" });
      alts.push({ t: "액상·분말 제형으로 바꾸기", b: "현탁액·시럽·산제·구강붕해정 등 <b>삼키기 쉬운 제형</b>이 있는지 약사에게 물어보세요. 같은 성분이라도 제형이 여러 개인 경우가 많습니다.", now: "약국에서" });
      alts.push({ t: "약국 산제 조제 상담", b: "분할이 금지된 약은 <b>조제실에서 정확히 나눠 포장</b>할 수 있는 경우가 있습니다(약 성분에 따라 제한). 처방전을 들고 상담하세요.", now: "약국에서" });
      alts.push({ t: "분할기를 쓰고, 물과 함께 충분히", b: "정말 분할해야 하는 약은 손이 아니라 <b>분할기</b>로. 자른 조각은 그날 바로 먹고 보관하지 마세요(습기·부스러짐).", now: "불가피할 때만" });
    } else {
      alts.push({ t: "분할선을 따라 분할기로", b: "손으로 반 자르면 조각 차이가 커집니다. 분할기를 쓰고, <b>남은 반쪽은 밀봉해 서늘한 곳</b>에 (가능하면 그날 안에).", now: "오늘부터" });
      alts.push({ t: "물 반 컵과 함께", b: "쪼갠 정은 표면이 거칠어 식도에 붙기 쉽습니다. <b>물 200mL</b>와 함께, 서서 삼키세요.", now: "복용 시" });
      alts.push({ t: "그래도 목에 걸리면", b: "함량이 작은 정·액상 제형으로 바꾸는 게 낫습니다. 매일 반 자르는 건 번거롭고 실수도 늘어요.", now: "다음 처방 때" });
    }
    $("#altList").innerHTML = alts.map(function (a, i) {
      return '<div class="plan__item"><span class="plan__num">' + (i + 1) + "</span><div>" +
        '<div class="plan__title">' + a.t + "</div>" +
        '<div class="plan__body">' + a.b + ' <span class="plan__now">' + a.now + "</span></div></div></div>";
    }).join("");

    /* 약사에게 */
    var q = drug ? drug.n : r.chosen[0].form.short + " 제형";
    $("#askBox").innerHTML =
      "<p>“<b>" + esc(q) + "</b>를 반으로 나눠 먹어도 되나요? 포장 설명서에 분할 가능하다고 적혀 있나요?”</p>" +
      "<p>“삼키기가 힘든데, <b>같은 성분의 더 작은 함량이나 액상 제형</b>으로 바꿀 수 있을까요?”</p>" +
      "<p>“이 약이 <b>서방형·장용형</b>인가요? 부수면 안 되는 약인가요?”</p>" +
      "<p style=\"font-size:12.5px;color:var(--ink-3)\">처방전·약 봉투를 그대로 가져가면 30초면 답을 받습니다. 약 이름만 말하는 것보다 <b>제품명 + 제형</b>을 함께 말하는 게 정확해요.</p>";

    last = { r: r, names: names, drug: drug };
    if (!$("#result").hidden) return;
    $("#result").hidden = false;
    if (scroll) $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function verdictWhy(r) {
    var a = ACTIONS[r.action];
    if (r.tone === "red") {
      var f = r.chosen[0].form;
      return (r.action === "powder" && f.split === "green")
        ? "가루내면 <b>쓴맛·위 점막 자극</b>이 커지고, 일부 약은 흡수가 달라집니다. 물에 타 먹어야 한다면 약사에게 조제를 맡기세요."
        : f.why;
    }
    if (r.tone === "amber") {
      if (r.action === "quarter") return "1/4로 나누면 <b>조각마다 함량이 크게 달라집니다</b>. 용량을 정확히 줄여야 하는 약(갑상선·혈압·항응고)이라면 처방 변경이 안전합니다.";
      return "분할선이 있거나 처방의 지시가 있을 때만 나누세요. <b>손으로 자르면 조각 간 함량 차이</b>가 생깁니다.";
    }
    return "분할선(홈)을 따라 <b>분할기로</b> 나누면 됩니다. 자른 조각은 그날 안에 복용하고, 남은 반쪽은 밀봉해 보관하세요.";
  }

  function updateCount() {
    var n = Object.keys(state.forms).length + (state.drug ? 1 : 0);
    $("#countText").textContent = n ? "판정할 수 있어요 (" + n + "개 선택)" : "약 이름이나 제형을 넣어주세요";
    $("#countHint").textContent = state.drug ? state.drug.n + " · " + FORMS[state.drug.f].short : (n ? "행동을 바꾸면 판정도 바뀝니다" : "제형 1개만 체크해도 판정됩니다");
  }

  function renderSuggest() {
    var list = search(state.query);
    if (!state.query || norm(state.query).length < 2) { $("#suggestBox").innerHTML = ""; return; }
    if (!list.length) {
      var tail = norm(state.query).match(/(sr|xr|er|cr|la|mr|ec)$/);
      var hint = tail ? "'" + tail[0].toUpperCase() + "'로 끝나는 약은 <b>" + (tail[0] === "ec" ? "장용형" : "서방형") + "</b>일 가능성이 큽니다. 아래 제형에서 체크해 주세요." : "일치하는 약이 없습니다. 포장의 제형 표기를 아래에서 직접 체크해 주세요.";
      $("#suggestBox").innerHTML = '<div class="hintline" style="margin:0">' + hint + "</div>";
      return;
    }
    $("#suggestBox").innerHTML = '<div class="items" style="margin-top:2px">' + list.map(function (d) {
      var f = FORMS[d.f];
      var v = drugVerdict(d, state.action);
      return '<label class="item" style="cursor:pointer">' +
        '<input type="radio" name="drugPick" data-pick="' + esc(d.n) + '"' + (state.drug && state.drug.n === d.n ? " checked" : "") + ">" +
        '<span class="item__box" aria-hidden="true"></span>' +
        '<span class="item__text"><span class="item__name">' + f.emoji + " " + esc(d.n) + "</span>" +
        '<span class="item__sub">' + esc(f.short) + " · " + esc(d.note) + "</span></span></label>";
    }).join("") + "</div>";
    $$("#suggestBox input").forEach(function (el) {
      el.addEventListener("change", function () {
        state.drug = DRUGS.filter(function (d) { return d.n === el.dataset.pick; })[0] || null;
        updateCount(); analyze(false);
      });
    });
  }

  function schedule_() {
    clearTimeout(timer);
    timer = setTimeout(function () { analyze(false); }, 200);
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
    var r = last.r, t = TONE[r.tone];
    var text = "【알약 분할 판정】\n" + last.names + "\n행동: " + ACTIONS[r.action].label + "\n" +
      t.badge.replace(/[🔴🟡🟢]\s?/g, "") + "\n" + verdictTitle(r.tone, r.action, last.drug);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("결과를 복사했어요"); }, function () { toast("복사에 실패했어요"); });
    } else toast("복사가 지원되지 않는 브라우저예요");
  }

  function init() {
    initTheme();

    /* 제형 체크박스 */
    var order = ["sr", "ec", "soft", "sl", "odt", "cap", "tabScore", "tabNoScore", "chemo", "hr"];
    $("#formList").innerHTML = order.map(function (k) {
      var f = FORMS[k];
      return '<label class="item"><input type="checkbox" data-form="' + k + '" aria-label="' + esc(f.label) + '">' +
        '<span class="item__box" aria-hidden="true"></span>' +
        '<span class="item__text"><span class="item__name">' + f.emoji + " " + esc(f.short) + "</span>" +
        '<span class="item__sub">' + esc(f.sub) + "</span></span></label>";
    }).join("");
    $$("#formList input").forEach(function (el) {
      el.addEventListener("change", function () {
        state.forms[el.dataset.form] = el.checked;
        updateCount(); schedule_();
      });
    });

    $("#drugName").addEventListener("input", function (e) {
      state.query = e.target.value;
      state.drug = null;
      renderSuggest();
      updateCount(); schedule_();
    });

    $$(".preset").forEach(function (b) {
      b.addEventListener("click", function () {
        state.query = b.dataset.drug;
        $("#drugName").value = b.dataset.drug;
        var m = search(b.dataset.drug);
        state.drug = m.length ? m[0] : null;
        $$(".preset").forEach(function (x) { x.classList.remove("is-active"); });
        b.classList.add("is-active");
        renderSuggest();
        updateCount(); analyze(false);
      });
    });

    $$("#actSeg .seg__btn").forEach(function (b) {
      b.addEventListener("click", function () {
        $$("#actSeg .seg__btn").forEach(function (x) { x.classList.remove("is-on"); x.setAttribute("aria-pressed", "false"); });
        b.classList.add("is-on"); b.setAttribute("aria-pressed", "true");
        state.action = b.dataset.act;
        renderSuggest();
        updateCount(); analyze(false);
      });
    });

    $("#analyzeBtn").addEventListener("click", function () { analyze(true); });
    $("#resetBtn").addEventListener("click", function () {
      state = { query: "", drug: null, forms: {}, action: "split" };
      $("#drugName").value = "";
      $("#suggestBox").innerHTML = "";
      $$("#formList input").forEach(function (el) { el.checked = false; });
      $$("#actSeg .seg__btn").forEach(function (x, i) { x.classList.toggle("is-on", i === 0); x.setAttribute("aria-pressed", i === 0 ? "true" : "false"); });
      $$(".preset").forEach(function (x) { x.classList.remove("is-active"); });
      $("#result").hidden = true; last = null;
      updateCount();
      $("#checker").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("#copyBtn").addEventListener("click", copyResult);
    $("#editBtn").addEventListener("click", function () { $("#checker").scrollIntoView({ behavior: "smooth", block: "start" }); });

    var hint = $("#nameHint");
    if (hint) hint.textContent = hint.textContent.replace("37종", DRUGS.length + "종");

    var y = $("#year");
    if (y) y.textContent = String(new Date().getFullYear());
    updateCount();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
