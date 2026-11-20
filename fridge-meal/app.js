/* ==========================================================================
   팩트체크 건강연구소 · 냉장고 남은 재료 저당·고단백 조합기
   영양 수치: 식약처 식품영양성분DB 대표값을 1인분으로 반올림한 추정치
   ⚠️ 브랜드·조리법·기름 양에 따라 달라짐. 혈당 반응은 개인차.
   ========================================================================== */

(function () {
  "use strict";

  var ING = [
    { id: "egg", e: "🥚", n: "계란", s: "1개 70kcal · 단백질 6g", t: "protein" },
    { id: "tofu", e: "🧊", n: "두부", s: "100g 80kcal · 단백질 8g", t: "protein" },
    { id: "chicken", e: "🍗", n: "닭가슴살", s: "100g 110kcal · 단백질 23g", t: "protein" },
    { id: "tuna", e: "🐟", n: "참치캔", s: "100g 100kcal · 단백질 22g", t: "protein" },
    { id: "greek", e: "🥣", n: "그릭요거트", s: "100g 90kcal · 단백질 9g", t: "protein" },
    { id: "shrimp", e: "🍤", n: "새우", s: "100g 90kcal · 단백질 20g", t: "protein" },
    { id: "salmon", e: "🍣", n: "연어", s: "100g 200kcal · 단백질 20g", t: "protein" },
    { id: "bean", e: "🫘", n: "콩·렌틸콩", s: "삶은 100g 116kcal · 단백질 9g", t: "protein" },
    { id: "cheese", e: "🧀", n: "슬라이스치즈", s: "1장 60kcal · 단백질 3g", t: "protein" },
    { id: "milk", e: "🥛", n: "우유·두유", s: "200mL 120kcal · 단백질 6g", t: "protein" },
    { id: "cabbage", e: "🥬", n: "양배추", s: "100g 23kcal · 식이섬유 2g", t: "veg" },
    { id: "cucumber", e: "🥒", n: "오이", s: "100g 15kcal · 수분 95%", t: "veg" },
    { id: "tomato", e: "🍅", n: "토마토", s: "100g 18kcal · 칼륨", t: "veg" },
    { id: "avocado", e: "🥑", n: "아보카도", s: "50g 80kcal · 불포화지방", t: "fat" },
    { id: "kimchi", e: "🫙", n: "김치", s: "100g 20kcal · 유산균", t: "veg" },
    { id: "rice", e: "🍚", n: "현미밥", s: "150g 225kcal · 탄수화물 45g", t: "carb" },
    { id: "sweetpotato", e: "🍠", n: "고구마", s: "150g 190kcal · 식이섬유 3g", t: "carb" },
    { id: "paprika", e: "🫑", n: "파프리카", s: "100g 30kcal · 비타민C", t: "veg" },
    { id: "broccoli", e: "🥦", n: "브로콜리", s: "100g 33kcal · 식이섬유 3g", t: "veg" },
    { id: "spinach", e: "🌿", n: "시금치", s: "100g 23kcal · 엽산·철분", t: "veg" },
    { id: "mushroom", e: "🍄", n: "버섯", s: "100g 20kcal · 식이섬유", t: "veg" },
    { id: "onion", e: "🧅", n: "양파", s: "100g 40kcal · 알리신", t: "veg" },
    { id: "oil", e: "🫒", n: "들기름·올리브유", s: "1큰술 45kcal · 양념 가정", t: "fat" }
  ];

  var RECIPES = [
    {
      n: "두부 계란찜", e: "🍲", need: ["tofu", "egg"], tool: "mw", time: 8, kcal: 260, p: 24, c: 6, f: 16, fib: 2,
      steps: ["두부 150g을 으깨 내열 그릇에 담기", "계란 2개 + 물 50mL + 소금 약간을 섞어 붓기", "뚜껑(또는 랩) 덮고 전자레인지 3분 → 1분 쉬고 2분 더"],
      tip: "부드러워서 씹기 힘들 때 최고. 간장은 반 숟갈만."
    },
    {
      n: "닭가슴살 양배추 볶음", e: "🍳", need: ["chicken", "cabbage"], tool: "pan", time: 10, kcal: 212, p: 31, c: 8, f: 8, fib: 4,
      steps: ["닭가슴살 120g을 얇게 썰어 소금·후추", "양배추 150g 먼저 2분 볶아 숨 죽이기", "닭가슴살 넣고 4~5분, 들기름 1작은술로 마무리"],
      tip: "단백질 31g. 양배추를 먼저 먹으면 혈당 완만."
    },
    {
      n: "참치 오이 샐러드", e: "🥗", need: ["tuna", "cucumber"], tool: "none", time: 5, kcal: 160, p: 27, c: 6, f: 4, fib: 2,
      steps: ["참치캔은 기름(또는 물)을 빼기", "오이 100g을 반달로 썰기", "그릭요거트 2큰술 + 머스터드 조금으로 버무리기"],
      tip: "불 없이 5분. 마요네즈 대신 그릭요거트면 칼로리 절반."
    },
    {
      n: "김치 두부", e: "🥘", need: ["tofu", "kimchi"], tool: "none", time: 5, kcal: 225, p: 18, c: 8, f: 12, fib: 3,
      steps: ["두부 200g을 도톰하게 썰어 접시에", "김치 100g을 위에 올리기", "들기름 1작은술 + 깨. 전자레인지 1분 돌리면 더 좋음"],
      tip: "김치의 유산균 + 두부 단백질. 나트륨은 김치 양으로 조절."
    },
    {
      n: "그릭요거트 아보카도 볼", e: "🥑", need: ["greek", "avocado"], tool: "none", time: 3, kcal: 215, p: 15, c: 10, f: 11, fib: 5,
      steps: ["그릭요거트 150g을 그릇에", "아보카도 50g을 깍둑 썰어 올리기", "후추·소금 약간, 올리브유 몇 방울"],
      tip: "아침 대용으로도 좋음. 단백질은 15g이라 한 끼로는 조금 부족."
    },
    {
      n: "현미밥 참치 비빔", e: "🍱", need: ["rice", "tuna", "kimchi"], tool: "mw", time: 6, kcal: 335, p: 28, c: 45, f: 4, fib: 3,
      steps: ["현미밥 150g 데우기", "참치캔 100g 기름 빼고 올리기", "김치 50g + 김가루. 참기름은 생략해도 됨"],
      tip: "밥은 반 공기부터. 채소·단백질 먼저 먹고 밥은 마지막에."
    },
    {
      n: "두부 스테이크", e: "🥩", need: ["tofu", "onion"], tool: "pan", time: 12, kcal: 225, p: 17, c: 9, f: 12, fib: 2,
      steps: ["두부 200g 물기를 빼고 1cm로 썰기", "팬에 들기름 두르고 앞뒤 4분씩 노릇하게", "양파 50g 볶아 간장 1작은술로 소스"],
      tip: "겉바속촉. 고기 대신 씹는 맛을 채워줍니다."
    },
    {
      n: "브로콜리 새우 볶음", e: "🍤", need: ["shrimp", "broccoli"], tool: "pan", time: 10, kcal: 205, p: 28, c: 10, f: 7, fib: 5,
      steps: ["브로콜리 150g을 데쳐 두기(전자레인지 2분도 가능)", "새우 120g을 2분 볶기", "브로콜리 넣고 마늘·소금, 1분 더"],
      tip: "단백질 28g · 식이섬유 5g. 저녁으로 가장 균형 잡힌 조합."
    },
    {
      n: "토마토 계란 볶음", e: "🍅", need: ["egg", "tomato"], tool: "pan", time: 8, kcal: 212, p: 13, c: 8, f: 16, fib: 2,
      steps: ["계란 2개를 풀어 반쯤 익혀 꺼내기", "토마토 150g을 2분 볶기", "계란 다시 넣고 소금·후추"],
      tip: "중국식 홍시초란 스타일. 단백질은 계란 2개면 12g 수준."
    },
    {
      n: "닭가슴살 샐러드", e: "🥬", need: ["chicken", "cabbage", "tomato"], tool: "none", time: 8, kcal: 199, p: 26, c: 10, f: 5, fib: 5,
      steps: ["닭가슴살 100g을 삶거나 전자레인지 2분", "양배추 100g + 토마토 100g 썰기", "올리브유 1작은술 + 레몬·소금"],
      tip: "드레싱은 기름+산. 시판 소스는 당이 많아요."
    },
    {
      n: "계란 시금치 볶음", e: "🌿", need: ["egg", "spinach"], tool: "pan", time: 7, kcal: 208, p: 14, c: 4, f: 16, fib: 3,
      steps: ["시금치 100g을 씻어 물기 빼기", "계란 2개 스크램블", "시금치 넣고 1분, 소금 약간"],
      tip: "철분·엽산 보충. 계란 노른자는 꼭 함께."
    },
    {
      n: "연어 아보카도 구이", e: "🐟", need: ["salmon", "avocado"], tool: "pan", time: 12, kcal: 330, p: 26, c: 3, f: 24, fib: 5,
      steps: ["연어 120g에 소금·후추", "팬에 껍질부터 3분, 뒤집어 2분", "아보카도 50g 썰어 곁들이기"],
      tip: "오메가3 + 단백질. 지방이 많아 칼로리는 높습니다."
    },
    {
      n: "버섯 두부 볶음", e: "🍄", need: ["tofu", "mushroom"], tool: "pan", time: 10, kcal: 200, p: 16, c: 8, f: 12, fib: 3,
      steps: ["두부 150g 물기 빼고 한입 크기", "버섯 100g 먼저 볶기", "두부 넣고 3분, 간장 1작은술"],
      tip: "감칠맛으로 소금을 줄일 수 있어요."
    },
    {
      n: "고구마 그릭요거트", e: "🍠", need: ["sweetpotato", "greek"], tool: "mw", time: 7, kcal: 280, p: 11, c: 45, f: 3, fib: 4,
      steps: ["고구마 150g을 전자레인지 4~5분", "으깨서 그릭요거트 100g", "계피·견과 약간"],
      tip: "운동 후 간식으로 좋음. 한 끼 단백질은 부족하니 계란 추가."
    },
    {
      n: "렌틸콩 토마토 샐러드", e: "🫘", need: ["bean", "tomato"], tool: "none", time: 6, kcal: 187, p: 10, c: 20, f: 6, fib: 6,
      steps: ["삶은 렌틸콩 100g 준비", "토마토·오이 썰어 섞기", "올리브유 1작은술 + 소금·후추"],
      tip: "식이섬유 6g. 단백질은 낮아 두부·계란을 더하세요."
    },
    {
      n: "두부 오이 무침", e: "🥒", need: ["tofu", "cucumber"], tool: "none", time: 5, kcal: 180, p: 12, c: 6, f: 12, fib: 2,
      steps: ["두부 150g 으깨기", "오이 100g 채 썰기", "들기름·깨·소금으로 무치기"],
      tip: "5분 완성. 밥 없이 먹으면 저녁으로 가볍습니다."
    },
    {
      n: "닭가슴살 김치 덮밥", e: "🍚", need: ["chicken", "rice", "kimchi"], tool: "mw", time: 8, kcal: 345, p: 29, c: 47, f: 4, fib: 3,
      steps: ["현미밥 150g 데우기", "닭가슴살 100g 전자레인지 2분 후 찢기", "김치 50g과 함께 올리고 김가루"],
      tip: "든든하게 먹고 싶은 날. 밥은 반 공기로 줄이면 혈당 완만."
    },
    {
      n: "그릭요거트 오이 샐러드", e: "🥣", need: ["greek", "cucumber"], tool: "none", time: 4, kcal: 195, p: 19, c: 12, f: 6, fib: 2,
      steps: ["오이 100g을 얇게 썰어 소금 살짝", "그릭요거트 200g", "마늘·레몬·올리브유 조금"],
      tip: "그릭요거트 200g이면 단백질 18g. 열량 대비 단백질이 좋습니다."
    }
  ];

  var TOOL_RANK = { none: 0, mw: 1, pan: 2 };

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  function fmt(n) { return Math.round(n).toLocaleString("ko-KR"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function byId(id) { for (var i = 0; i < ING.length; i++) if (ING[i].id === id) return ING[i]; return null; }

  var state = { sel: {}, kcal: 450, tool: "mw", weight: null, prot: 1.6 };
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

  function compute() {
    var have = Object.keys(state.sel);
    if (!have.length) return null;
    var maxTool = TOOL_RANK[state.tool];
    var rows = RECIPES.map(function (r) {
      var missing = r.need.filter(function (id) { return !state.sel[id]; });
      var toolOk = TOOL_RANK[r.tool] === 0 ? maxTool >= 0 : TOOL_RANK[r.tool] <= maxTool;
      var kcalGap = Math.abs(r.kcal - state.kcal);
      var score = (missing.length === 0 ? 1000 : missing.length === 1 ? 500 : 0) + r.p * 6 - kcalGap / 20 - r.time / 5;
      return { r: r, missing: missing, toolOk: toolOk, score: score };
    }).filter(function (x) { return x.toolOk && x.missing.length <= 1; });

    rows.sort(function (a, b) {
      if (a.missing.length !== b.missing.length) return a.missing.length - b.missing.length;
      return b.score - a.score;
    });

    var ready = rows.filter(function (x) { return x.missing.length === 0; }).slice(0, 3);
    var oneMore = rows.filter(function (x) { return x.missing.length === 1; }).slice(0, 3);

    var proteinIngs = have.filter(function (id) { var i = byId(id); return i && i.t === "protein"; });
    var vegIngs = have.filter(function (id) { var i = byId(id); return i && i.t === "veg"; });
    var fatIngs = have.filter(function (id) { var i = byId(id); return i && i.t === "fat"; });
    var carbIngs = have.filter(function (id) { var i = byId(id); return i && i.t === "carb"; });

    var best = ready[0] || oneMore[0] || null;
    var dailyProt = state.weight ? state.weight * state.prot : null;

    return {
      ready: ready, oneMore: oneMore, have: have, best: best,
      proteinIngs: proteinIngs, vegIngs: vegIngs, fatIngs: fatIngs, carbIngs: carbIngs,
      dailyProt: dailyProt, perMeal: dailyProt ? dailyProt / 3 : null
    };
  }

  function analyze(scroll) {
    var r = compute();
    if (!r) {
      $("#countText").textContent = "재료를 고르면 조합을 찾습니다";
      if (!$("#result").hidden) { $("#result").hidden = true; last = null; }
      return;
    }

    var tone = r.ready.length ? "green" : (r.oneMore.length ? "amber" : "red");
    var title, desc, badge;
    if (r.ready.length) {
      badge = "🟢 지금 바로 " + r.ready.length + "가지";
      title = "냉장고 그대로, " + r.ready[0].r.n + " 어떠세요";
      desc = "가장 단백질이 많은 조합은 <b>" + r.ready[0].r.n + "</b> (" + r.ready[0].r.p + "g · " + r.ready[0].r.kcal + "kcal · " +
        r.ready[0].r.time + "분). " + (r.perMeal ? "한 끼 목표 단백질 " + fmt(r.perMeal) + "g 기준 " +
        (r.ready[0].r.p >= r.perMeal ? "<b>충족</b>" : "<b>" + fmt(r.perMeal - r.ready[0].r.p) + "g 부족</b>") + "." : "체중을 넣으면 한 끼 단백질 목표와 비교해 드려요.");
    } else if (r.oneMore.length) {
      badge = "🟡 재료 1개만 더";
      title = oneMoreName(r.oneMore[0]) + " 하나만 있으면 됩니다";
      desc = "지금 재료로는 완성 조합이 없어요. <b>" + nameOf(r.oneMore[0].missing[0]) + "</b>만 추가하면 <b>" +
        r.oneMore[0].r.n + "</b>(" + r.oneMore[0].r.p + "g 단백질)을 만들 수 있습니다.";
    } else {
      badge = "🔴 조합 없음";
      title = "단백질 재료부터 하나 골라주세요";
      desc = "선택한 도구로 만들 수 있는 조합이 없습니다. <b>계란·두부·참치캔·그릭요거트</b> 중 하나와 <b>양배추·오이·김치</b> 중 하나만 있으면 대부분 조합이 열립니다.";
    }

    if (!r.proteinIngs.length) {
      tone = "red";
      badge = "🔴 단백질 재료 없음";
      title = "단백질 재료가 하나도 없어요";
      desc = "이 상태로 먹으면 탄수화물·채소만으로 한 끼가 됩니다. <b>계란(가장 저렴)·두부·참치캔</b> 중 하나만 있어도 단백질 20g대 조합이 만들어져요.";
    }

    $("#resultSub").innerHTML = "보유 재료 <b>" + r.have.length + "개</b> · 목표 " + state.kcal + "kcal · 도구 " +
      ({ none: "불 없이", mw: "전자레인지", pan: "팬" })[state.tool] + ".";

    $("#verdictBox").innerHTML =
      '<div class="verdict verdict--' + tone + '">' +
      '<span class="verdict__badge">' + badge + "</span>" +
      '<div class="verdict__title">' + title + "</div>" +
      '<div class="verdict__desc">' + desc + "</div></div>";

    var bestReady = r.ready[0];
    $("#summaryBox").innerHTML = [
      { label: "바로 가능", num: String(r.ready.length), unit: "개", cls: r.ready.length ? "green" : "amber" },
      { label: "최고 단백질", num: bestReady ? String(bestReady.r.p) : (r.oneMore[0] ? String(r.oneMore[0].r.p) : "—"), unit: "g", cls: "green" },
      { label: "칼로리", num: bestReady ? String(bestReady.r.kcal) : "—", unit: "kcal", cls: "amber" },
      { label: "식이섬유", num: bestReady ? String(bestReady.r.fib) : "—", unit: "g", cls: "amber" }
    ].map(function (c) {
      return '<div class="summary__card summary__card--' + c.cls + '"><span class="summary__label">' + c.label + "</span>" +
        '<span class="summary__num">' + c.num + "<small>" + c.unit + "</small></span></div>";
    }).join("");

    /* 레시피 카드 */
    var cards = r.ready.concat(r.oneMore);
    if (!cards.length) {
      $("#recipeList").innerHTML = '<div class="card"><div class="card__body"><p>조건에 맞는 레시피가 없습니다. <b>단백질 재료</b>를 하나 더 고르거나, 도구를 <b>팬</b>으로 바꿔 보세요.</p></div></div>';
    } else {
      $("#recipeList").innerHTML = cards.map(function (x, i) {
        var rc = x.r;
        var badgeCls = x.missing.length ? "mid" : "ok";
        var ingChips = rc.need.map(function (id) {
          var it = byId(id);
          var have = !!state.sel[id];
          return '<span class="pill" style="' + (have ? "" : "border-style:dashed;color:var(--ink-3);background:transparent") + '">' +
            (have ? "" : "＋") + it.e + " " + esc(it.n) + "</span>";
        }).join("");
        return '<div class="card" style="margin-top:12px">' +
          '<div class="card__title">' + (i + 1) + ". " + rc.e + " " + esc(rc.n) +
          '<span class="tbadge tbadge--' + badgeCls + '" style="margin-left:auto">' + (x.missing.length ? nameOf(x.missing[0]) + " 필요" : "바로 가능") + "</span></div>" +
          '<div class="badge-row" style="margin-top:0;margin-bottom:10px">' +
          '<span class="tbadge">' + rc.time + "분</span>" +
          '<span class="tbadge">' + rc.kcal + " kcal</span>" +
          '<span class="tbadge tbadge--ok">단백질 ' + rc.p + "g</span>" +
          '<span class="tbadge">탄수 ' + rc.c + "g</span>" +
          '<span class="tbadge">지방 ' + rc.f + "g</span>" +
          '<span class="tbadge">식이섬유 ' + rc.fib + "g</span></div>" +
          '<div class="slot__items" style="margin-bottom:10px">' + ingChips + "</div>" +
          '<div class="plan__body">' + rc.steps.map(function (s, k) { return "<b>" + (k + 1) + "</b>. " + esc(s); }).join("<br>") + "</div>" +
          '<div class="hintline" style="margin-top:8px">💡 ' + esc(rc.tip) + "</div></div>";
      }).join("");
    }

    /* 부족한 것 */
    var rules = [];
    if (!r.proteinIngs.length) {
      rules.push({ lv: "red", t: "단백질 재료가 없습니다", b: "계란 1판(약 3,000원)·두부 1모·참치캔 3개 중 하나면 한 끼 단백질 20g대가 열립니다. <b>가장 가성비는 계란</b>입니다." });
    } else if (r.ready.length && r.ready[0].r.p < 25) {
      rules.push({ lv: "amber", t: "단백질이 한 끼 기준에 살짝 모자랍니다", b: "최고 조합이 " + r.ready[0].r.p + "g. <b>계란 1개(6g)</b>나 <b>그릭요거트 100g(9g)</b>을 더하면 30g에 가까워집니다." });
    }
    if (!r.vegIngs.length) {
      rules.push({ lv: "amber", t: "채소(식이섬유)가 없습니다", b: "식이섬유는 식후 혈당 상승을 완만하게 하고 포만감을 오래 유지합니다. <b>양배추·오이·김치</b> 중 하나만 있으면 해결됩니다." });
    }
    if (r.ready.length && r.ready[0].r.fib < 5) {
      rules.push({ lv: "amber", t: "식이섬유가 5g 미만", b: "한 끼 목표는 약 <b>7g</b>입니다. 브로콜리 100g(3g)·양배추 100g(2g)·김치 50g을 곁들이면 채워집니다." });
    }
    if (state.kcal >= 550 && !r.carbIngs.length) {
      rules.push({ lv: "amber", t: "탄수화물이 없습니다", b: "든든하게 먹으려면 <b>현미밥 100g(150kcal)</b>이나 고구마 100g을 더하세요. 밥은 반 공기부터." });
    }
    if (state.kcal <= 400 && r.carbIngs.length) {
      rules.push({ lv: "amber", t: "탄수화물이 들어 있습니다", b: "가볍게 목표라면 밥은 <b>100g(반 공기)</b>으로 줄이고, 채소·단백질을 먼저 드세요." });
    }
    if (!r.fatIngs.length) {
      rules.push({ lv: "green", t: "지방 급원은 없어도 괜찮습니다", b: "계란·연어·두부에 지방이 들어 있어요. 다만 <b>들기름 1작은술(45kcal)</b>은 지용성 비타민 흡수를 돕습니다." });
    }
    if (r.perMeal) {
      rules.push({ lv: "green", t: "하루 단백질 목표 " + fmt(r.dailyProt) + "g", b: "체중 " + state.weight + "kg × " + state.prot + "g/kg 기준, 한 끼 <b>" + fmt(r.perMeal) + "g</b>입니다. 이 조합으로 " + (r.ready.length ? fmt(r.ready[0].r.p) + "g" : "—") + "을 채웁니다." });
    }
    if (!rules.length) {
      rules.push({ lv: "green", t: "지금 조합이면 충분합니다", b: "단백질·채소·식이섬유가 모두 들어 있습니다. 양념만 조금 줄이면 완성." });
    }
    $("#gapRules").innerHTML = rules.map(function (x) {
      return '<div class="rule rule--' + x.lv + '"><div class="rule__head"><span class="rule__level">' +
        (x.lv === "red" ? "부족" : x.lv === "amber" ? "보완" : "양호") + '</span><span class="rule__title">' + x.t + "</span></div>" +
        '<div class="rule__body">' + x.b + "</div></div>";
    }).join("");

    /* 하나만 더 */
    if (r.oneMore.length) {
      $("#oneMoreList").innerHTML = r.oneMore.map(function (x, i) {
        return '<div class="plan__item"><span class="plan__num">' + (i + 1) + "</span><div>" +
          '<div class="plan__title">' + nameOf(x.missing[0]) + " → " + x.r.e + " " + esc(x.r.n) + "</div>" +
          '<div class="plan__body">필요한 건 <b>' + nameOf(x.missing[0]) + "</b> 하나. " + x.r.p + "g 단백질 · " + x.r.kcal + "kcal · " + x.r.time + "분. " +
          '<span class="plan__now">장볼 때</span></div></div></div>';
      }).join("");
    } else {
      $("#oneMoreList").innerHTML = '<div class="plan__item"><span class="plan__num">✓</span><div><div class="plan__title">지금 재료로 충분합니다</div><div class="plan__body">위 조합 중 하나를 고르면 됩니다. <span class="plan__now">오늘</span></div></div></div>';
    }

    /* 혈당 팁 */
    var top = r.ready[0] ? r.ready[0].r : null;
    $("#glucoseTips").innerHTML = [
      { t: "순서: 채소 → 단백질 → 탄수화물", b: top && top.need.indexOf("rice") >= 0 ? "이 조합은 밥이 들어 있으니 <b>단백질·김치 먼저</b>, 밥은 마지막에." : "같은 음식도 순서만 바꾸면 식후 혈당 피크가 낮아집니다. 채소·단백질을 먼저 <b>5분</b>.", now: "이번 끼니" },
      { t: "밥은 반 공기부터", b: "현미밥 150g은 탄수화물 45g. 혈당이 걱정되면 <b>100g</b>으로 줄이고 그만큼 단백질을 늘리세요.", now: "이번 끼니" },
      { t: "식후 10분 걷기", b: "먹고 바로 눕지 말고 <b>10~15분</b> 걸으면 식후 혈당 상승이 완만해집니다. 설거지·계단청소도 포함.", now: "식후" }
    ].map(function (x, i) {
      return '<div class="plan__item"><span class="plan__num">' + (i + 1) + "</span><div>" +
        '<div class="plan__title">' + x.t + "</div>" +
        '<div class="plan__body">' + x.b + ' <span class="plan__now">' + x.now + "</span></div></div></div>";
    }).join("");

    last = { r: r, tone: tone, title: title, top: top };
    if (!$("#result").hidden) return;
    $("#result").hidden = false;
    if (scroll) $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function nameOf(id) { var i = byId(id); return i ? i.e + " " + i.n : id; }
  function oneMoreName(x) { return nameOf(x.missing[0]); }

  function updateCount() {
    var n = Object.keys(state.sel).length;
    $("#countText").textContent = n ? "재료 " + n + "개 선택" : "재료를 고르면 조합을 찾습니다";
    $("#countHint").textContent = n ? "조합 찾기를 눌러도 됩니다 (자동 계산)" : "단백질 재료 1개 + 채소 1개면 충분";
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
    if (!last || !last.top) return;
    var r = last.top;
    var text = "【" + r.n + "】 " + r.kcal + "kcal · 단백질 " + r.p + "g · " + r.time + "분\n" +
      "재료: " + r.need.map(nameOf).join(", ") + "\n" +
      r.steps.map(function (s, i) { return (i + 1) + ". " + s; }).join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("레시피를 복사했어요"); }, function () { toast("복사에 실패했어요"); });
    } else toast("복사가 지원되지 않는 브라우저예요");
  }

  function applySet(kind) {
    state.sel = {};
    if (kind === "basic") ["egg", "tofu", "cabbage", "kimchi", "cucumber", "rice"].forEach(function (id) { state.sel[id] = true; });
    if (kind === "diet") ["egg", "chicken", "greek", "cabbage", "tomato", "avocado", "broccoli"].forEach(function (id) { state.sel[id] = true; });
    $$("#ingList input").forEach(function (el) { el.checked = !!state.sel[el.dataset.ing]; });
    updateCount(); analyze(false);
  }

  function init() {
    initTheme();

    $("#ingList").innerHTML = ING.map(function (i) {
      return '<label class="item"><input type="checkbox" data-ing="' + i.id + '" aria-label="' + esc(i.n) + '">' +
        '<span class="item__box" aria-hidden="true"></span>' +
        '<span class="item__text"><span class="item__name">' + i.e + " " + esc(i.n) + "</span>" +
        '<span class="item__sub">' + esc(i.s) + "</span></span></label>";
    }).join("");

    $$("#ingList input").forEach(function (el) {
      el.addEventListener("change", function () {
        if (el.checked) state.sel[el.dataset.ing] = true; else delete state.sel[el.dataset.ing];
        updateCount(); schedule_();
      });
    });

    [["#kcalSeg", "kcal"], ["#toolSeg", "tool"], ["#protSeg", "prot"]].forEach(function (pair) {
      $$(pair[0] + " .seg__btn").forEach(function (b) {
        b.addEventListener("click", function () {
          $$(pair[0] + " .seg__btn").forEach(function (x) { x.classList.remove("is-on"); x.setAttribute("aria-pressed", "false"); });
          b.classList.add("is-on"); b.setAttribute("aria-pressed", "true");
          state[pair[1]] = pair[1] === "tool" ? b.dataset.v : parseFloat(b.dataset.v);
          updateCount(); schedule_();
        });
      });
    });

    $("#weight").addEventListener("input", function (e) { state.weight = num(e.target.value); schedule_(); });

    $$(".preset").forEach(function (b) {
      b.addEventListener("click", function () {
        applySet(b.dataset.set);
        $$(".preset").forEach(function (x) { x.classList.remove("is-active"); });
        if (b.dataset.set !== "clear") b.classList.add("is-active");
      });
    });

    $("#analyzeBtn").addEventListener("click", function () { analyze(true); });
    $("#resetBtn").addEventListener("click", function () {
      state = { sel: {}, kcal: 450, tool: "mw", weight: null, prot: 1.6 };
      $$("#ingList input").forEach(function (el) { el.checked = false; });
      $("#weight").value = "";
      [["#kcalSeg", 1], ["#toolSeg", 1], ["#protSeg", 1]].forEach(function (p) {
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
