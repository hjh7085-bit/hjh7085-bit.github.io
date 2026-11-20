/* ==========================================================================
   팩트체크 건강연구소 · 오메가3 순수 함량 & rTG 판독기
   캡슐 총중량 대비 EPA+DHA 비율과 목표량·비용을 계산합니다.
   --------------------------------------------------------------------------
   ⚠️ 라벨 함량과 공개 기준에 따른 '참고용' 계산입니다. 고용량 복용은
   복용 중인 약(항응고제 등)에 따라 위험이 달라지므로 의사와 상의해야 합니다.
   ========================================================================== */

(function () {
  "use strict";

  var BLOG = "https://blog.naver.com/hjh7085/";

  var COLUMNS = [
    { url: BLOG + "224474981968", tag: "성분 해부", title: "8만 원 노르딕 vs 3만 원 CGN 오메가3 — rTG 성분표 솔직 해부" },
    { url: BLOG + "224474970152", tag: "성분 해부", title: "아연만 고용량 먹으면 빈혈 온다? 아연과 구리 15:1 황금비율 팩트" },
    { url: BLOG + "224477169582", tag: "1분 논문 팩트", title: "눈 밑 떨림, 마그네슘 먹어도 안 멈추는 이유 — 산화 vs 글리시네이트" },
    { url: BLOG + "224476159368", tag: "성분 해부", title: "만성 피로·간 수치 잡는 밀크씨슬: 쏜 S.A.T. vs 나우푸드 흡수율 해부" },
    { url: BLOG + "224474930562", tag: "성분 해부", title: "마운자로 속쓰림·명치 막힘 뚫는 법: 소화효소 2종 솔직 비교" },
    { url: BLOG + "224477176691", tag: "성분 해부", title: "아침 공복 속쓰림에 양배추즙 vs 매스틱검 vs 카베진 성분 해부" }
  ];

  var FORMS = {
    rtg: {
      label: "rTG (재에스테르화 트리글리세리드)",
      tone: "green",
      desc: "농축한 뒤 다시 TG 구조로 되돌린 형태입니다. 순도 60~85%를 내면서 흡수도 좋아 고순도 제품에 많이 쓰입니다.",
      detail: "단회 흡수 연구에서 TG·rTG가 EE보다 높게 나오는 경우가 많습니다. 공정이 한 단계 더 들어 가격이 높은 편이니, 1,000mg당 비용으로 EE와 비교해 보세요.",
      badge: "흡수 좋음 · 가격 높음"
    },
    tg: {
      label: "TG (천연 트리글리세리드)",
      tone: "green",
      desc: "정제한 자연 형태로 몸이 익숙한 구조입니다. 다만 농축하지 않으면 순도가 18~30%로 낮아 캡슐 수가 많이 필요합니다.",
      detail: "흡수는 좋지만 함량이 낮아 하루 1,000mg을 채우려면 캡슐이 3~5정 필요할 수 있습니다. 위 계산의 '필요 캡슐'을 확인하세요.",
      badge: "흡수 좋음 · 순도 낮음"
    },
    ee: {
      label: "EE (에틸에스터)",
      tone: "amber",
      desc: "가장 흔하고 저렴한 농축 형태입니다. 순도 50~70%가 일반적이며, 단회 연구에서는 TG 대비 흡수가 40~48% 수준으로 보고된 사례도 있습니다.",
      detail: "다만 장기 복용 연구에서는 제형 간 차이가 일관되지 않았습니다. 지방이 든 식사와 함께 먹으면 흡수가 개선되니, 공복 복용은 피하세요.",
      badge: "가격 낮음 · 흡수 변수"
    },
    unknown: {
      label: "제형 미표기",
      tone: "amber",
      desc: "라벨에 rTG·TG·EE 표기가 없습니다. 제형을 밝히지 않는 것은 투명성이 낮다는 신호입니다.",
      detail: "같은 순도라면 제형을 명시하고 산가·과산화물가 등 산패 지표를 공개한 제품을 고르는 편이 안전합니다.",
      badge: "표기 없음 · 확인 필요"
    }
  };

  var state = { form: "unknown", target: 1000 };
  var lastResult = null;

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function num(v) { var n = parseFloat(v); return isFinite(n) && n > 0 ? n : null; }
  function fmt(n) { return Math.round(n).toLocaleString("ko-KR"); }
  function fmt1(n) { return (Math.round(n * 10) / 10).toLocaleString("ko-KR"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function tierOf(p) {
    if (p >= 80) return { key: "ultra", label: "초고순도", tone: "green", text: "농축 기술이 들어간 80% 이상 구간입니다. 같은 캡슐 수로 목표량을 채우기 가장 쉽습니다." };
    if (p >= 60) return { key: "high", label: "고순도", tone: "green", text: "60% 이상이면 고순도로 봅니다. 하루 1,000mg을 2정 안쪽으로 채울 수 있는 구간입니다." };
    if (p >= 30) return { key: "mid", label: "보통", tone: "amber", text: "흔한 농축 어유 수준입니다. 목표량에 따라 캡슐 수가 늘어납니다." };
    return { key: "low", label: "저순도", tone: "red", text: "기름 대부분이 EPA·DHA가 아닙니다. 목표량을 채우려면 캡슐을 여러 정 먹어야 하고, 그만큼 다른 지방산도 함께 들어옵니다." };
  }

  function collect() {
    return {
      contentMg: num($("#contentMg").value),
      epaDha: num($("#epaDha").value),
      epa: num($("#epa").value),
      dha: num($("#dha").value),
      perDay: num($("#perDay").value) || 1,
      price: num($("#price").value),
      capsTotal: num($("#capsTotal").value),
      form: state.form,
      target: state.target
    };
  }

  function analyze(scroll) {
    var s = collect();
    if (!s.contentMg || !s.epaDha) {
      $("#result").hidden = true;
      lastResult = null;
      $("#countText").textContent = "숫자를 넣으면 자동 계산";
      $("#countHint").textContent = "캡슐 중량과 EPA+DHA만 있어도 됩니다";
      return;
    }

    var purity = (s.epaDha / s.contentMg) * 100;
    if (purity > 105) {
      $("#countHint").textContent = "EPA+DHA가 총중량보다 큽니다 — 라벨을 확인해 주세요";
      $("#result").hidden = true;
      return;
    }

    var daily = s.epaDha * s.perDay;
    var need = Math.ceil(s.target / s.epaDha);
    var tier = tierOf(purity);
    var reach = (daily / s.target) * 100;

    var cost = null;
    if (s.price && s.capsTotal) {
      var perCap = s.price / s.capsTotal;
      cost = {
        perCap: perCap,
        per1000: (perCap / s.epaDha) * 1000,
        dailyCost: perCap * s.perDay,
        monthCost: perCap * s.perDay * 30,
        capCost: s.price / s.capsTotal
      };
    }

    lastResult = { s: s, purity: purity, daily: daily, need: need, tier: tier, reach: reach, cost: cost };

    $("#resultSub").textContent = "캡슐 " + fmt(s.contentMg) + "mg 중 EPA+DHA " + fmt(s.epaDha) + "mg · 하루 " + s.perDay + "캡슐 기준";

    /* 판정 */
    var ok = daily >= s.target;
    var toneMark = tier.tone === "green" ? "🟢" : tier.tone === "amber" ? "🟡" : "🔴";
    $("#verdictBox").innerHTML =
      '<div class="verdict verdict--' + tier.tone + '">' +
      '<span class="verdict__badge">' + toneMark + " " + tier.label + " " + fmt1(purity) + "%</span>" +
      '<p class="verdict__title">' + (ok
        ? "하루 " + fmt(daily) + "mg — " + tier.label + " 제품입니다"
        : "하루 " + fmt(daily) + "mg — 목표까지 " + fmt(s.target - daily) + "mg 부족") + "</p>" +
      '<p class="verdict__desc">' + tier.text + " " +
      (ok
        ? "현재 섭취량은 <b>" + fmt(s.target) + "mg 목표의 " + fmt(reach) + "%</b>입니다."
        : "<b>" + fmt(s.target) + "mg</b>을 채우려면 하루 <b>" + need + "캡슐</b>이 필요합니다(현재 " + s.perDay + "캡슐).") +
      "</p></div>";

    /* 지표 */
    $("#metricRow").innerHTML =
      metric("순수 함량 비율", fmt1(purity) + "%", tier.label, tier.tone) +
      metric("1일 EPA+DHA", fmt(daily) + "mg", s.perDay + "캡슐 기준", ok ? "green" : "amber") +
      metric("목표 달성", fmt(reach) + "%", fmt(s.target) + "mg 목표", ok ? "green" : "amber") +
      metric("필요 캡슐", need + "정", fmt(s.epaDha) + "mg/캡슐", need <= s.perDay ? "green" : "amber");

    /* 순도 막대 */
    $("#purityBase").textContent = fmt(s.contentMg) + "mg";
    $("#purityPart").textContent = fmt(s.epaDha) + "mg";
    var fill = $("#purityFill");
    fill.style.width = Math.min(100, purity) + "%";
    fill.className = "purity__fill is-" + tier.tone;
    var notes = [];
    if (purity < 60) notes.push("기름의 " + fmt1(100 - purity) + "%가 EPA·DHA가 아닌 다른 지방산입니다.");
    if (s.epa && s.dha) {
      var sum = s.epa + s.dha;
      notes.push("EPA " + fmt(s.epa) + "mg · DHA " + fmt(s.dha) + "mg (합 " + fmt(sum) + "mg — 라벨 합계 " + fmt(s.epaDha) + "mg)");
      if (Math.abs(sum - s.epaDha) / s.epaDha > 0.1) notes.push("⚠️ EPA·DHA 합과 합계 표기가 10% 이상 차이납니다. 라벨을 다시 확인하세요.");
    }
    $("#purityNote").innerHTML = notes.join("<br>");

    /* 목표별 */
    var targets = [500, 1000, 2000];
    $("#targetRows").innerHTML = targets.map(function (t) {
      var n = Math.ceil(t / s.epaDha);
      var isCur = t === s.target;
      return '<div class="rx__row"' + (isCur ? ' style="background:var(--mint-soft);border-radius:9px;padding-left:10px;padding-right:10px"' : "") + '>' +
        '<span class="rx__name">EPA+DHA ' + fmt(t) + "mg" + (isCur ? " <span style='color:var(--mint-strong);font-weight:800'>선택한 목표</span>" : "") +
        "<span>캡슐 " + fmt(s.epaDha) + "mg 기준</span></span>" +
        '<span class="rx__val">' + n + "정<small>1일</small></span></div>";
    }).join("");

    $("#dailyNote").innerHTML = "현재 <b>하루 " + s.perDay + "캡슐 = EPA+DHA " + fmt(daily) + "mg</b>입니다. " +
      (ok
        ? "목표 " + fmt(s.target) + "mg을 채우고 " + fmt(daily - s.target) + "mg 여유가 있습니다."
        : "<b>" + need + "캡슐</b>로 늘리면 목표를 채웁니다. 캡슐을 늘리기 싫다면 순도가 더 높은 제품이 답입니다.");

    /* 비용 */
    if (cost) {
      $("#costBlock").hidden = false;
      $("#costRows").innerHTML =
        '<div class="rx__row"><span class="rx__name">캡슐 1정 가격<span>1병 ' + fmt(s.price) + "원 ÷ " + fmt(s.capsTotal) + "정</span></span>" +
        '<span class="rx__val">' + fmt(cost.perCap) + "원</span></div>" +
        '<div class="rx__row"><span class="rx__name">EPA+DHA 1,000mg당<span>제품 간 비교 기준</span></span>' +
        '<span class="rx__val">' + fmt(cost.per1000) + "원</span></div>" +
        '<div class="rx__row"><span class="rx__name">하루 비용<span>' + s.perDay + "캡슐 기준</span></span>" +
        '<span class="rx__val">' + fmt(cost.dailyCost) + "원</span></div>" +
        '<div class="rx__row"><span class="rx__name">한 달(30일) 비용<span>같은 섭취량 유지 시</span></span>' +
        '<span class="rx__val">' + fmt(cost.monthCost) + "원</span></div>";
    } else {
      $("#costBlock").hidden = true;
    }

    /* 제형 */
    var f = FORMS[s.form] || FORMS.unknown;
    $("#formArea").innerHTML = '<div class="card"><div class="card__title">' + esc(f.label) + " · " + esc(f.badge) + "</div>" +
      '<div class="card__body"><p>' + esc(f.desc) + "</p><p>" + esc(f.detail) + "</p></div></div>";

    $("#result").hidden = false;
    $("#countText").textContent = "판독 완료";
    $("#countHint").textContent = "값을 바꾸면 바로 다시 계산합니다";

    if (scroll) {
      setTimeout(function () { $("#result").scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
    }
  }

  function metric(label, value, sub, tone) {
    var color = tone === "red" ? "var(--red)" : tone === "amber" ? "var(--amber)" : "var(--green)";
    return '<div class="metric"><p class="metric__label">' + label + '</p>' +
      '<p class="metric__value" style="color:' + color + '">' + value + "</p>" +
      '<p class="metric__sub">' + sub + "</p></div>";
  }

  /* ---------------------------------------------------------------- 복사 */
  function copyResult() {
    if (!lastResult) return;
    var r = lastResult;
    var lines = ["[팩트체크 건강연구소] 오메가3 판독"];
    lines.push("캡슐 " + fmt(r.s.contentMg) + "mg / EPA+DHA " + fmt(r.s.epaDha) + "mg → 순수 함량 " + fmt1(r.purity) + "% (" + r.tier.label + ")");
    lines.push("하루 " + r.s.perDay + "캡슐 = EPA+DHA " + fmt(r.daily) + "mg (목표 " + fmt(r.s.target) + "mg의 " + fmt(r.reach) + "%)");
    lines.push("목표 달성 필요 캡슐: " + r.need + "정");
    if (r.cost) lines.push("EPA+DHA 1,000mg당 " + fmt(r.cost.per1000) + "원 · 한 달 약 " + fmt(r.cost.monthCost) + "원");
    lines.push("제형: " + (FORMS[r.s.form] || FORMS.unknown).label);
    lines.push("");
    lines.push("https://hjh7085-bit.github.io/omega-check/");
    lines.push("※ 참고용이며 진단이 아닙니다. 고용량은 의사와 상의하세요.");
    var text = lines.join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("결과를 복사했어요"); }, function () { toast("복사가 막혀 있어요"); });
    } else {
      toast("복사가 지원되지 않는 브라우저예요");
    }
  }

  var toastTimer = null;
  function toast(msg) {
    var el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-on"); }, 2200);
  }

  /* ---------------------------------------------------------------- 프리셋 */
  var PRESETS = {
    cheap: { contentMg: 1000, epaDha: 300, epa: 180, dha: 120, perDay: 1, price: 12900, capsTotal: 100, form: "ee", target: 1000 },
    rtg: { contentMg: 1000, epaDha: 800, epa: 500, dha: 300, perDay: 1, price: 45000, capsTotal: 60, form: "rtg", target: 1000 },
    label: { contentMg: 1050, epaDha: 315, epa: 190, dha: 125, perDay: 2, price: 19900, capsTotal: 120, form: "unknown", target: 1000 }
  };

  function applyPreset(key) {
    var p = PRESETS[key];
    if (!p) return;
    ["contentMg", "epaDha", "epa", "dha", "perDay", "price", "capsTotal"].forEach(function (id) {
      $("#" + id).value = p[id] != null ? p[id] : "";
    });
    state.form = p.form;
    state.target = p.target;
    paintSegs();
    $$(".preset").forEach(function (b) { b.classList.toggle("is-active", b.dataset.preset === key); });
    analyze(true);
  }

  function paintSegs() {
    $$("[data-form]").forEach(function (b) { b.classList.toggle("is-on", b.dataset.form === state.form); });
    $$("[data-target]").forEach(function (b) { b.classList.toggle("is-on", Number(b.dataset.target) === state.target); });
  }

  /* ---------------------------------------------------------------- 공통 */
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem("fcl-theme"); } catch (e) {}
    var theme = saved || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    var btn = $("#themeToggle");
    if (!btn) return;
    btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    btn.setAttribute("aria-label", theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환");
    btn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      btn.setAttribute("aria-pressed", next === "dark" ? "true" : "false");
      btn.setAttribute("aria-label", next === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환");
      try { localStorage.setItem("fcl-theme", next); } catch (e) {}
    });
  }

  function renderColumns() {
    var grid = $("#columnGrid");
    if (!grid) return;
    grid.innerHTML = COLUMNS.map(function (c) {
      return '<a class="column-card" href="' + c.url + '" target="_blank" rel="noopener">' +
        '<span class="column-card__tag">' + c.tag + "</span>" +
        '<span class="column-card__title">' + esc(c.title) + "</span>" +
        '<span class="column-card__meta">칼럼 읽기 <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span>' +
        "</a>";
    }).join("");
  }

  function init() {
    initTheme();
    renderColumns();
    paintSegs();

    ["contentMg", "epaDha", "epa", "dha", "perDay", "price", "capsTotal"].forEach(function (id) {
      var el = $("#" + id);
      if (!el) return;
      el.addEventListener("input", function () {
        $$(".preset").forEach(function (b) { b.classList.remove("is-active"); });
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () { analyze(false); }, 260);
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); analyze(true); }
      });
    });

    $$("[data-form]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.form = b.dataset.form;
        paintSegs();
        if (!$("#result").hidden) analyze(false);
      });
    });
    $$("[data-target]").forEach(function (b) {
      b.addEventListener("click", function () {
        state.target = Number(b.dataset.target);
        paintSegs();
        if (!$("#result").hidden) analyze(false);
      });
    });

    $("#analyzeBtn").addEventListener("click", function () { analyze(true); });
    $("#resetBtn").addEventListener("click", function () {
      ["contentMg", "epaDha", "epa", "dha", "perDay", "price", "capsTotal"].forEach(function (id) { $("#" + id).value = ""; });
      state.form = "unknown";
      state.target = 1000;
      paintSegs();
      $$(".preset").forEach(function (b) { b.classList.remove("is-active"); });
      $("#result").hidden = true;
      lastResult = null;
      $("#countText").textContent = "숫자를 넣으면 자동 계산";
      $("#countHint").textContent = "캡슐 중량과 EPA+DHA만 있어도 됩니다";
      $("#checker").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $$(".preset").forEach(function (b) {
      b.addEventListener("click", function () { applyPreset(b.dataset.preset); });
    });
    $("#copyBtn").addEventListener("click", copyResult);
    $("#editBtn").addEventListener("click", function () {
      $("#checker").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    var yearEl = $("#year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  }

  var debounceTimer = null;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
