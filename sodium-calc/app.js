/* ==========================================================================
   팩트체크 건강연구소 · 나트륨·칼륨 붓기 밸런스 체크기
   입력 수집 + 초과량·칼륨 조합·수분 계산 + 결과 렌더링
   --------------------------------------------------------------------------
   ⚠️ WHO 2,000mg/일, 칼륨 3,510mg/일, 식약처 국민건강영양조사(2023) 값을
   인용한 '참고용' 계산입니다. 신장질환·심부전·고칼륨 위험 약물 복용자는
   이 계산을 적용하면 안 됩니다.
   ========================================================================== */

(function () {
  "use strict";

  var BLOG = "https://blog.naver.com/hjh7085/";

  /* 1인분 기준 대략치 — 제품·조리법에 따라 크게 달라짐 */
  var MENUS = [
    { id: "ramen", emoji: "🍜", name: "라면", sub: "1봉 · 1,790mg", na: 1790 },
    { id: "gukbap", emoji: "🍲", name: "국밥", sub: "1그릇 · 2,300mg", na: 2300 },
    { id: "kimchi-jjigae", emoji: "🥘", name: "김치찌개", sub: "1인분 · 1,500mg", na: 1500 },
    { id: "chicken", emoji: "🍗", name: "치킨", sub: "2조각 · 1,100mg", na: 1100 },
    { id: "malatang", emoji: "🌶️", name: "마라탕", sub: "1인분 · 2,800mg", na: 2800 },
    { id: "jjambbong", emoji: "🍜", name: "짬뽕", sub: "1그릇 · 3,900mg", na: 3900 },
    { id: "tteokbokki", emoji: "🍢", name: "떡볶이", sub: "1인분 · 1,300mg", na: 1300 },
    { id: "kimchi", emoji: "🥬", name: "김치", sub: "100g · 800mg", na: 800 },
    { id: "udon", emoji: "🍲", name: "우동", sub: "1그릇 · 2,500mg", na: 2500 },
    { id: "samgyeopsal", emoji: "🥓", name: "삼겹살", sub: "200g · 500mg", na: 500 },
    { id: "pizza", emoji: "🍕", name: "피자", sub: "2조각 · 1,200mg", na: 1200 },
    { id: "doenjang", emoji: "🍲", name: "된장찌개", sub: "1인분 · 1,200mg", na: 1200 }
  ];

  /* 칼륨 함량(1회 분량 기준, 대략치) */
  var FOODS = [
    { emoji: "🥑", name: "아보카도 1개(200g)", k: 970 },
    { emoji: "🥔", name: "감자 1개(170g)", k: 720 },
    { emoji: "🍅", name: "토마토주스 200mL", k: 500 },
    { emoji: "🍅", name: "토마토 1개", k: 430 },
    { emoji: "🫘", name: "검은콩 30g", k: 420 },
    { emoji: "🥬", name: "시금치나물 70g", k: 400 },
    { emoji: "🍌", name: "바나나 1개", k: 358 },
    { emoji: "🍠", name: "고구마 1개(150g)", k: 340 },
    { emoji: "🥛", name: "우유 200mL", k: 300 },
    { emoji: "🍊", name: "오렌지 1개", k: 240 },
    { emoji: "🥝", name: "키위 1개", k: 215 }
  ];

  var K_TARGET = 3510;
  var NA_SCALE = 5000;

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  function fmt(n) { return Math.round(n).toLocaleString("ko-KR"); }
  function fmt1(n) { return (Math.round(n * 10) / 10).toLocaleString("ko-KR"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var state = { sel: {}, extra: 0, goal: 2000, weight: null, act: 0 };
  var timer = null;
  var last = null;

  /* ------------------------------------------------------------------ theme */
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

  /* ------------------------------------------------------------------ 입력 */
  function renderMenus() {
    $("#menuList").innerHTML = MENUS.map(function (m) {
      return '<label class="item">' +
        '<input type="checkbox" data-menu="' + m.id + '" aria-label="' + esc(m.name) + ' ' + fmt(m.na) + 'mg">' +
        '<span class="item__box" aria-hidden="true"></span>' +
        '<span class="item__text"><span class="item__name">' + m.emoji + " " + esc(m.name) + '</span>' +
        '<span class="item__sub">' + esc(m.sub) + "</span></span></label>";
    }).join("");

    $$("#menuList input").forEach(function (el) {
      el.addEventListener("change", function () {
        state.sel[el.dataset.menu] = el.checked;
        updateCount();
        schedule();
      });
    });
  }

  function total() {
    var t = 0;
    MENUS.forEach(function (m) { if (state.sel[m.id]) t += m.na; });
    return t + (state.extra || 0);
  }

  function updateCount() {
    var list = MENUS.filter(function (m) { return state.sel[m.id]; });
    var t = total();
    if (!list.length && !state.extra) {
      $("#countText").textContent = "메뉴를 고르면 자동 계산";
      $("#countHint").textContent = "체중을 넣으면 물 양까지 계산됩니다";
      return;
    }
    $("#countText").textContent = "선택 " + list.length + "개 · " + fmt(t) + "mg";
    $("#countHint").textContent = t > state.goal
      ? "기준 " + fmt(state.goal) + "mg 대비 " + fmt(t - state.goal) + "mg 초과"
      : "기준까지 " + fmt(state.goal - t) + "mg 여유";
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(function () { analyze(false); }, 220);
  }

  /* ------------------------------------------------------------------ 계산 */
  function compute() {
    var t = total();
    var goal = state.goal;
    var pct = goal > 0 ? t / goal * 100 : 0;
    var excess = Math.max(0, t - goal);
    var tier = t <= goal ? "green" : t <= goal * 1.5 ? "amber" : "red";
    var salt = t * 2.5 / 1000;
    var gain = excess * 0.3 / 1000;

    /* 체중 100kg 이상은 30mL/kg를 그대로 적용하면 과도해 상한을 둔다 */
    var baseWater = state.weight ? Math.min(state.weight * 30, 3000) : 1800;
    var rawWater = baseWater + state.act + excess * 0.4;
    var water = Math.min(Math.round(rawWater / 50) * 50, 3500);

    var ratio = t > 0 ? K_TARGET / t : null;

    /* 칼륨 조합: 함량 큰 것부터, 최대 6가지 */
    var sorted = FOODS.slice().sort(function (a, b) { return b.k - a.k; });
    var combo = [], sumK = 0;
    for (var i = 0; i < sorted.length && combo.length < 6 && sumK < K_TARGET; i++) {
      combo.push(sorted[i]);
      sumK += sorted[i].k;
    }

    return {
      t: t, goal: goal, pct: pct, excess: excess, tier: tier, salt: salt,
      gain: gain, water: water, baseWater: baseWater, rawWater: rawWater, capped: rawWater > 3500, ratio: ratio,
      combo: combo, sumK: sumK, count: MENUS.filter(function (m) { return state.sel[m.id]; }).length
    };
  }

  var TONE = {
    green: { badge: "🟢 권장 이내", cls: "verdict--green", sum: "summary__card--green" },
    amber: { badge: "🟡 주의 구간", cls: "verdict--amber", sum: "summary__card--amber" },
    red: { badge: "🔴 과다", cls: "verdict--red", sum: "summary__card--red" }
  };

  function verdictHtml(r) {
    var tone = TONE[r.tier];
    var title, desc;
    if (r.tier === "green") {
      title = "오늘 " + fmt(r.t) + "mg — 권장 범위 안이에요";
      desc = "하루 기준 " + fmt(r.goal) + "mg을 넘지 않았습니다. 소금으로 <b>" + fmt1(r.salt) + "g</b> 수준. " +
        "다만 한 끼에 몰아 먹었다면 식후 2~3시간 안에 물 200mL를 나눠 마시고 가볍게 걸어 주세요.";
    } else if (r.tier === "amber") {
      title = "권장의 " + fmt1(r.pct / 100) + "배 — 내일 아침 붓기 쉬운 양이에요";
      desc = "기준보다 <b>" + fmt(r.excess) + "mg</b> 초과(소금 " + fmt1(r.excess * 2.5 / 1000) + "g). " +
        "이 정도면 다음 날 얼굴·손가락이 붓고 체중이 <b>" + fmt1(r.gain) + "kg</b> 정도 늘어 보일 수 있어요. " +
        "오늘 남은 끼니는 국물을 남기고, 칼륨 음식과 물로 균형을 맞추세요.";
    } else {
      title = "권장의 " + fmt1(r.pct / 100) + "배 — 하루 만에 체중이 늘 수 있는 양";
      desc = "기준보다 <b>" + fmt(r.excess) + "mg</b> 초과(소금 " + fmt1(r.excess * 2.5 / 1000) + "g). " +
        "수분 저류로 <b>" + fmt1(r.gain) + "kg</b> 정도 일시 증가가 가능한 수준입니다. " +
        "다음 날은 국물·가공식품을 완전히 빼고, 칼륨 음식과 물을 나눠 채우며 30분 이상 걸어 주세요.";
    }
    return '<div class="verdict ' + tone.cls + '">' +
      '<span class="verdict__badge">' + tone.badge + "</span>" +
      '<h3 class="verdict__title">' + title + "</h3>" +
      '<p class="verdict__desc">' + desc + "</p></div>";
  }

  function summaryHtml(r) {
    var tone = TONE[r.tier];
    return '<div class="summary__card ' + tone.sum + '"><span class="summary__num">' + fmt(r.t) + '<span style="font-size:13px">mg</span></span><span class="summary__label">총 나트륨</span></div>' +
      '<div class="summary__card ' + tone.sum + '"><span class="summary__num">' + fmt(r.pct) + '<span style="font-size:13px">%</span></span><span class="summary__label">권장 대비</span></div>' +
      '<div class="summary__card"><span class="summary__num">' + fmt1(r.salt) + '<span style="font-size:13px">g</span></span><span class="summary__label">소금 환산</span></div>';
  }

  function meterHtml(r) {
    var t = Math.min(r.t, NA_SCALE);
    var w1 = Math.min(r.t, r.goal) / NA_SCALE * 100;
    var w2 = r.t > r.goal ? Math.min(r.t - r.goal, 1000) / NA_SCALE * 100 : 0;
    var w3 = r.t > r.goal + 1000 ? Math.min(r.t - r.goal - 1000, NA_SCALE - r.goal - 1000) / NA_SCALE * 100 : 0;
    var pos = t / NA_SCALE * 100;
    var label = r.t > NA_SCALE ? fmt(NA_SCALE) + "mg+" : fmt(r.t) + "mg";
    var mid = Math.round((r.goal + 1000));
    return '<div class="meter">' +
      '<div class="meter__head"><span class="meter__title">하루 나트륨<small>기준 ' + fmt(r.goal) + "mg · WHO 권장 상한</small></span>" +
        '<span class="meter__value">' + fmt(r.t) + "<small>mg</small></span></div>" +
      '<div class="meter__track">' +
        '<div class="meter__fill">' +
          '<span class="meter__seg meter__seg--ok" style="width:' + w1.toFixed(1) + '%"></span>' +
          '<span class="meter__seg meter__seg--mid" style="width:' + w2.toFixed(1) + '%"></span>' +
          '<span class="meter__seg meter__seg--high" style="width:' + w3.toFixed(1) + '%"></span>' +
        "</div>" +
        '<span class="meter__mark" style="left:' + pos.toFixed(1) + '%" data-label="' + label + '"></span>' +
      "</div>" +
      '<div class="meter__scale"><span>0</span><span>' + fmt(r.goal) + "</span><span>" + fmt(mid) + "</span><span>5,000mg</span></div>" +
      "</div>" +
      '<div class="formula" style="margin-top:18px">소금 환산 <code>나트륨 mg × 2.5 ÷ 1,000 = 소금 g</code> · 예상 수분 저류 <code>초과 나트륨 mg × 0.3 ÷ 1,000 = kg</code></div>';
  }

  function kHtml(r) {
    var pct = Math.round(r.sumK / K_TARGET * 100);
    var ratioTxt = r.ratio === null ? "—" : (Math.round(r.ratio * 100) / 100).toFixed(2);
    var ratioTone = r.ratio === null ? "muted" : r.ratio >= 1 ? "" : "var(--amber)";
    var metrics = '<div class="metric"><span class="metric__label">칼륨 목표</span><div class="metric__value">' + fmt(K_TARGET) + "<small>mg</small></div>" +
      '<div class="metric__sub">WHO 성인 권장 · 하루 기준</div></div>' +
      '<div class="metric metric--accent"><span class="metric__label">K/Na 비율</span><div class="metric__value" style="color:' + ratioTone + '">' + ratioTxt + "</div>" +
      '<div class="metric__sub">' + (r.ratio !== null && r.ratio >= 1 ? "1.0 이상 — 균형 방향" : "1.0 미만 — 나트륨을 줄이는 게 먼저") + "</div></div>" +
      '<div class="metric"><span class="metric__label">추천 조합 합계</span><div class="metric__value">' + fmt(r.sumK) + "<small>mg</small></div>" +
      '<div class="metric__sub">' + r.combo.length + "가지 · 목표의 " + pct + "%</div></div>";
    $("#kMetrics").innerHTML = metrics;

    $("#kFoods").innerHTML = FOODS.map(function (f) {
      var picked = r.combo.indexOf(f) >= 0;
      return '<div class="kfood' + (picked ? " is-picked" : "") + '">' +
        '<span class="kfood__emoji" aria-hidden="true">' + f.emoji + "</span>" +
        '<span class="kfood__name">' + esc(f.name) + "</span>" +
        '<span class="kfood__val">' + fmt(f.k) + "mg</span></div>";
    }).join("");

    var note;
    if (r.ratio === null) {
      note = "메뉴를 하나 이상 고르면 K/Na 비율까지 계산합니다.";
    } else if (r.ratio >= 1) {
      note = "나트륨 " + fmt(r.t) + "mg에 칼륨 3,510mg이면 비율 <b>" + ratioTxt + "</b> — 균형 방향입니다. 위 조합 " + r.combo.length + "가지로 " + fmt(r.sumK) + "mg, 남은 " + fmt(Math.max(0, K_TARGET - r.sumK)) + "mg은 다른 끼니 채소·두부로 채우세요.";
    } else {
      note = "나트륨이 " + fmt(r.t) + "mg이라 칼륨을 다 채워도 비율이 <b>" + ratioTxt + "</b>로 1.0 미만입니다. 칼륨을 더 늘리기보다 <b>다음 끼니 국물·가공식품을 줄이는 쪽</b>이 효과적이에요. 조합 " + r.combo.length + "가지 = " + fmt(r.sumK) + "mg.";
    }
    if (r.tier !== "green") note += " <b>신장질환·고칼륨 위험 약 복용 중이면 이 조합을 따라 하지 마세요.</b>";
    $("#kNote").innerHTML = note;
  }

  function waterHtml(r) {
    var cups = Math.round(r.water / 200);
    var extra = Math.round(r.excess * 0.4 / 10) * 10;
    $("#waterMetrics").innerHTML =
      '<div class="metric metric--accent"><span class="metric__label">오늘 마실 물</span><div class="metric__value">' + fmt(r.water) + "<small>mL</small></div>" +
      '<div class="metric__sub">200mL 컵 ' + cups + "잔 · " + (state.weight ? "체중 " + fmt1(state.weight) + "kg 기준" : "체중 미입력 · 1,800mL 기본") + (r.capped ? " · 하루 3,500mL 상한" : "") + "</div></div>" +
      '<div class="metric"><span class="metric__label">나트륨 배출용 추가분</span><div class="metric__value">' + fmt(Math.max(0, extra)) + "<small>mL</small></div>" +
      '<div class="metric__sub">초과 나트륨 ' + fmt(r.excess) + "mg × 0.4mL</div></div>" +
      '<div class="metric"><span class="metric__label">몰아 마시지 않기</span><div class="metric__value">200<small>mL씩</small></div>' +
      '<div class="metric__sub">한 번에 500mL 이상은 붓기·전해질 흔들림</div></div>';

    var parts = [0.32, 0.38, 0.30];
    var labels = ["지금 ~ 오후", "저녁 식사 전까지", "자기 2시간 전까지"];
    var tips = [
      "일어나서·식사 사이에 200mL씩. 커피·차도 수분에 포함되지만 카페인은 과하지 않게.",
      "국물 대신 물. 식사 30분 전 200mL는 과식을 줄이는 데도 도움이 됩니다.",
      "자기 전에는 200mL 이내로. 밤에 몰아 마시면 다음 날 얼굴이 붓습니다."
    ];
    var html = "";
    for (var i = 0; i < 3; i++) {
      var ml = Math.max(100, Math.round(r.water * parts[i] / 50) * 50);
      html += '<div class="slot">' +
        '<div class="slot__time"><span class="slot__label">' + labels[i] + '</span><span class="slot__clock">약 ' + fmt(ml) + "mL</span></div>" +
        '<div class="slot__items"><span class="pill">물 ' + Math.max(1, Math.round(ml / 200)) + '잔 <span class="pill__dose">200mL</span></span>' +
        (i === 1 ? '<span class="pill">국물은 건더기만 <span class="pill__dose">-500mg</span></span>' : "") +
        "</div>" +
        '<div class="slot__tip">' + tips[i] + "</div></div>";
    }
    $("#waterSlots").innerHTML = html;
  }

  function routineHtml(r) {
    var items = [
      { cls: "", num: "1", title: "국물은 건더기만 건져 먹기", body: "국·찌개·라면 국물 한 그릇에 나트륨 <b>500~1,000mg</b>이 들어 있습니다. 국물만 남겨도 초과분의 절반이 줄어요.", now: "오늘 저녁부터" },
      { cls: "", num: "2", title: "양념은 따로, 소스는 찍어서", body: "간장 1큰술(15mL)에 약 <b>900mg</b>, 소금 1작은술(5g)에 약 1,950mg. 쌈장·초장은 반만." , now: "다음 끼니" },
      { cls: "", num: "3", title: "칼륨 음식 먼저 한 접시", body: "위 조합 중 <b>2~3가지</b>만 골라도 1,500mg 이상. 나물·토마토·바나나처럼 껍질째 먹는 게 편합니다.", now: "오늘 안에" },
      { cls: "", num: "4", title: "물은 200mL씩 나눠서", body: "총 " + fmt(r.water) + "mL를 세 번에 나눠 마시기. 한 번에 500mL 이상 몰아 마시면 오히려 붓습니다.", now: "지금부터" },
      { cls: "plan__item--amber", num: "5", title: "식후 20~30분 걷기", body: "가벼운 유산소는 혈류와 소변 배출을 늘려 붓기를 빼는 데 도움이 됩니다. 15분만 해도 충분해요.", now: "저녁 식후" },
      { cls: "plan__item--red", num: "6", title: "사우나·찜질은 짧게, 음주는 피하기", body: "땀을 많이 빼도 수분만 빠지고 나트륨은 남습니다. 술은 다음 날 붓기를 키우는 대표 원인이라 오늘은 쉬어가세요.", now: "오늘 밤" }
    ];
    $("#routineList").innerHTML = items.map(function (it) {
      return '<div class="plan__item ' + it.cls + '">' +
        '<span class="plan__num">' + it.num + "</span>" +
        '<div><div class="plan__title">' + it.title + "</div>" +
        '<div class="plan__body">' + it.body + ' <span class="plan__now">· ' + it.now + "</span></div></div></div>";
    }).join("");
  }

  /* ------------------------------------------------------------------ 렌더 */
  function analyze(scroll) {
    var r = compute();
    if (!r.count && !state.extra) {
      $("#result").hidden = true;
      last = null;
      return;
    }
    last = r;
    $("#result").hidden = false;
    $("#verdictBox").innerHTML = verdictHtml(r);
    $("#summaryBox").innerHTML = summaryHtml(r);
    $("#meterArea").innerHTML = meterHtml(r);
    kHtml(r);
    waterHtml(r);
    routineHtml(r);

    var sub = [];
    MENUS.forEach(function (m) { if (state.sel[m.id]) sub.push(m.name); });
    if (state.extra) sub.push("직접 " + fmt(state.extra) + "mg");
    $("#resultSub").textContent = sub.join(" + ") + " · 총 " + fmt(r.t) + "mg (" + fmt(r.pct) + "%)";

    updateCount();
    if (scroll) $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function copyResult() {
    if (!last) return;
    var r = last;
    var text = "오늘 나트륨 " + fmt(r.t) + "mg (" + fmt(r.pct) + "%) · 소금 " + fmt1(r.salt) + "g\n" +
      "칼륨 목표 3,510mg · K/Na " + (r.ratio === null ? "-" : (Math.round(r.ratio * 100) / 100).toFixed(2)) + "\n" +
      "물 " + fmt(r.water) + "mL (200mL씩 나눠서)\n" +
      "칼륨 조합: " + r.combo.map(function (f) { return f.name; }).join(", ") + " = " + fmt(r.sumK) + "mg";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("결과를 복사했어요"); }, function () { toast("복사에 실패했어요"); });
    } else {
      toast("복사가 지원되지 않는 브라우저예요");
    }
  }

  function toast(msg) {
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.style.opacity = "1"; el.style.transform = "translate(-50%, 0)"; });
    setTimeout(function () { el.style.opacity = "0"; setTimeout(function () { el.remove(); }, 300); }, 1800);
  }

  function init() {
    initTheme();
    renderMenus();

    $$("#goalSeg .seg__btn").forEach(function (b) {
      b.addEventListener("click", function () {
        $$("#goalSeg .seg__btn").forEach(function (x) { x.classList.remove("is-on"); x.setAttribute("aria-pressed", "false"); });
        b.classList.add("is-on");
        b.setAttribute("aria-pressed", "true");
        state.goal = parseInt(b.dataset.goal, 10);
        updateCount();
        schedule();
      });
    });

    $$("#actSeg .seg__btn").forEach(function (b) {
      b.addEventListener("click", function () {
        $$("#actSeg .seg__btn").forEach(function (x) { x.classList.remove("is-on"); x.setAttribute("aria-pressed", "false"); });
        b.classList.add("is-on");
        b.setAttribute("aria-pressed", "true");
        state.act = parseInt(b.dataset.act, 10);
        schedule();
      });
    });

    $("#extraNa").addEventListener("input", function (e) {
      state.extra = Math.max(0, num(e.target.value) || 0);
      updateCount();
      schedule();
    });
    $("#weight").addEventListener("input", function (e) {
      var v = num(e.target.value);
      state.weight = v && v >= 30 && v <= 250 ? v : null;
      schedule();
    });

    $("#analyzeBtn").addEventListener("click", function () { analyze(true); });
    $("#resetBtn").addEventListener("click", function () {
      state.sel = {}; state.extra = 0; state.weight = null; state.act = 0; state.goal = 2000;
      $$("#menuList input").forEach(function (el) { el.checked = false; });
      $("#extraNa").value = "";
      $("#weight").value = "";
      $$("#goalSeg .seg__btn").forEach(function (x, i) { x.classList.toggle("is-on", i === 1); x.setAttribute("aria-pressed", i === 1 ? "true" : "false"); });
      $$("#actSeg .seg__btn").forEach(function (x, i) { x.classList.toggle("is-on", i === 0); x.setAttribute("aria-pressed", i === 0 ? "true" : "false"); });
      $("#result").hidden = true;
      last = null;
      updateCount();
      $("#checker").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("#copyBtn").addEventListener("click", copyResult);
    $("#editBtn").addEventListener("click", function () {
      $("#checker").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    var y = $("#year");
    if (y) y.textContent = String(new Date().getFullYear());
    updateCount();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
