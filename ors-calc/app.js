/* ==========================================================================
   팩트체크 건강연구소 · 집에서 만드는 ORS(경구수액) 황금비율 계산기
   WHO 저삼투압 ORS 표준 농도(1L: NaCl 2.6g · 포도당 13.5g · KCl 1.5g · 구연산 2.9g)
   → 물 용량별 계량 + 당 종류별 환산 + 마시는 속도 + 병원 적신호
   --------------------------------------------------------------------------
   ⚠️ WHO 표준 농도의 '가정 근사' 도구입니다. 시판 ORS가 더 정확합니다.
   ========================================================================== */

(function () {
  "use strict";

  var WHO = { nacl: 2.6, glucose: 13.5, kcl: 1.5, citrate: 2.9, soda: 2.5 };
  var SUCROSE_PER_L = 25.7;   /* 포도당 75mmol에 해당하는 자당 */
  var HONEY_PER_L = 33.0;     /* 당 약 82% 가정, 포도당+과당 */
  var TSP = { salt: 5.9, sugar: 4.2, honey: 7.0, kcl: 6.0, soda: 4.6 };

  var state = { vol: 1000, sugar: "sucrose", kcl: false, soda: false, who: "adult" };
  var lastResult = null;

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmt(n, d) {
    if (!isFinite(n)) return "-";
    var fixed = (typeof d === "number") ? n.toFixed(d) : String(Math.round(n));
    var parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }
  function volLabel(v) { return v === 1000 ? "1L" : v === 500 ? "500mL" : "1.5L"; }

  function spoon(g, per) {
    var t = g / per;
    if (!isFinite(t) || t <= 0) return "";
    var frac = [[0.125, "1/8"], [0.25, "1/4"], [0.33, "1/3"], [0.5, "1/2"], [0.66, "2/3"], [0.75, "3/4"], [1, "1"]];
    if (t < 1.05) {
      var best = frac[0];
      frac.forEach(function (f) { if (Math.abs(t - f[0]) < Math.abs(t - best[0])) best = f; });
      return "약 " + best[1] + " 작은술";
    }
    var n = Math.round(t * 2) / 2;
    if (Math.abs(n - Math.round(n)) < 0.01) return "약 " + Math.round(n) + " 작은술";
    return "약 " + String(n).replace(".5", "½") + " 작은술";
  }

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

  function toast(msg) {
    var t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("is-on");
    setTimeout(function () { t.classList.remove("is-on"); }, 1800);
  }

  /* ------------------------------------------------------------------ model */
  function compute() {
    var L = state.vol / 1000;
    var salt = WHO.nacl * L;
    var kcl = state.kcl ? WHO.kcl * L : 0;
    var alk = state.soda ? WHO.soda * L : 0;
    var citrate = state.soda ? 0 : WHO.citrate * L;
    var sugarG = state.sugar === "glucose" ? WHO.glucose * L
      : state.sugar === "honey" ? HONEY_PER_L * L
        : SUCROSE_PER_L * L;

    /* 추정 삼투압: Na + Cl + K + 알칼리 + 당 입자 */
    var naSalt = salt / 58.44 * 1000;
    var naCit = citrate / 294.1 * 1000 * 3;
    var naBic = alk / 84.01 * 1000;
    var cl = naSalt + kcl / 74.55 * 1000;
    var k = kcl / 74.55 * 1000;
    var citrateMmol = citrate / 294.1 * 1000;
    var bicMmol = alk / 84.01 * 1000;
    var sugarParticles = state.sugar === "glucose" ? (sugarG / 180.16 * 1000)
      : state.sugar === "honey" ? (sugarG * 0.35 / 180.16 * 1000 + sugarG * 0.40 / 180.16 * 1000)
        : (sugarG / 342.3 * 1000);
    var na = naSalt + naCit + naBic;
    var osm = na + cl + k + citrateMmol + bicMmol + sugarParticles;

    return {
      L: L, salt: salt, kcl: kcl, alk: alk, citrate: citrate, sugarG: sugarG,
      na: na, osm: osm,
      honey: state.sugar === "honey",
      hasAlk: alk > 0 || citrate > 0,
      who: state.who
    };
  }

  /* ---------------------------------------------------------------- render */
  function verdictHTML(r) {
    var v = "green", badge = "🟢 만들 수 있습니다", title, desc;
    if (state.sugar === "honey" && state.who === "infant") {
      v = "red"; badge = "🔴 꿀 금지";
      title = "만 1세 미만에게는 꿀을 먹이면 안 됩니다";
      desc = "꿀에는 보툴리누스균 포자가 있을 수 있어 영아 보툴리누스증 위험이 있습니다. <b>설탕이나 포도당으로 바꿔</b> 만드세요. 영아 탈수는 진행이 빨라 <b>진료가 우선</b>입니다.";
    } else if (state.who === "infant") {
      v = "amber"; badge = "🟡 영아 · 진료 우선";
      title = "영아는 집에서 만든 용액보다 시판 ORS·진료가 먼저입니다";
      desc = "2세 미만은 탈수가 빠르고 전해질 이상에 취약합니다. 집에서 만들 경우에도 <b>소금 계량 오차가 위험</b>하므로 약국 ORS를 쓰고, 6시간 이상 소변이 없거나 축 처지면 바로 진료하세요.";
    } else if (state.sugar === "honey") {
      v = "amber"; badge = "🟡 꿀 사용";
      title = "꿀은 단당류라 삼투압이 높습니다 — 양을 지키세요";
      desc = "꿀은 포도당·과당이 이미 분해된 상태라 같은 무게에서 입자 수가 2배입니다. <b>" + fmt(r.sugarG, 1) + "g</b>을 넘기면 삼투압이 올라가 설사가 악화될 수 있고, 제품별 당 조성 편차가 커서 WHO 표준을 정확히 맞추기도 어렵습니다. 가능하면 <b>설탕이나 포도당</b>을 쓰세요.";
    } else if (!r.hasAlk) {
      v = "amber"; badge = "🟡 구연산 없음";
      title = "소금·당만으로 만드는 응급 버전입니다";
      desc = "구연산(또는 베이킹소다)이 없으면 <b>나트륨 농도가 약 " + fmt(r.na) + "mmol/L</b>로 표준(75)보다 낮고 산증 교정 효과도 없습니다. 가벼운 탈수에는 충분하지만, 심한 탈수에는 시판 ORS가 낫습니다.";
    } else {
      title = "물 " + volLabel(state.vol) + "에 소금 " + fmt(r.salt, 1) + "g · " +
        (r.honey ? "꿀 " : state.sugar === "glucose" ? "포도당 " : "설탕 ") + fmt(r.sugarG, 1) + "g";
      desc = "WHO 저삼투압 ORS 농도에 맞춘 배합입니다. <b>정확히 계량</b>하고, 24시간 안에 다 마시세요. 아이에게 먹일 때는 <b>5분에 50mL</b> 정도로 천천히.";
    }
    return '<div class="verdict verdict--' + v + '">' +
      '<span class="verdict__badge">' + badge + "</span>" +
      '<h3 class="verdict__title">' + title + "</h3>" +
      '<p class="verdict__desc">' + desc + "</p>" +
      '<ul class="reasons">' +
      '<li><span class="r__dot"></span><span>나트륨 약 <b>' + fmt(r.na) + "mmol/L</b> · 추정 삼투압 <b>" + fmt(r.osm) + "mOsm/L</b> (표준 245)</span></li>" +
      '<li><span class="r__dot"></span><span>칼륨 <b>' + (r.kcl > 0 ? fmt(r.kcl / 74.55 * 1000) + "mmol/L" : "없음(생략)") + "</b> · 구연산/탄산수소 " +
      (r.citrate > 0 ? fmt(r.citrate, 1) + "g" : r.alk > 0 ? fmt(r.alk, 1) + "g" : "없음") + "</span></li>" +
      "</ul></div>";
  }

  function recipeHTML(r) {
    var rows = [];
    rows.push(['물 <span>끓여서 식힌 물</span>', fmt(state.vol) + " <small>mL</small>", ""]);
    rows.push(['소금 (정제염) <span>염화나트륨</span>', fmt(r.salt, 1) + " <small>g</small>", spoon(r.salt, TSP.salt)]);
    if (state.sugar === "honey") {
      rows.push(['꿀 <span>만 1세 이상</span>', fmt(r.sugarG, 1) + " <small>g</small>", spoon(r.sugarG, TSP.honey)]);
    } else if (state.sugar === "glucose") {
      rows.push(['포도당 (덱스트로스) <span>WHO 표준과 동일</span>', fmt(r.sugarG, 1) + " <small>g</small>", spoon(r.sugarG, TSP.sugar)]);
    } else {
      rows.push(['설탕 (자당) <span>포도당 75mmol 상당</span>', fmt(r.sugarG, 1) + " <small>g</small>", spoon(r.sugarG, TSP.sugar)]);
    }
    if (r.kcl > 0) rows.push(['염화칼륨 (KCl) <span>선택</span>', fmt(r.kcl, 1) + " <small>g</small>", spoon(r.kcl, TSP.kcl)]);
    if (r.alk > 0) rows.push(['베이킹소다 <span>구연산 대체</span>', fmt(r.alk, 1) + " <small>g</small>", spoon(r.alk, TSP.soda)]);
    if (r.citrate > 0) rows.push(['구연산삼나트륨 <span>있으면 사용</span>', fmt(r.citrate, 1) + " <small>g</small>", "가루약 형태"]);

    return rows.map(function (x) {
      return '<div class="rx__row"><div class="rx__name">' + x[0] + "</div>" +
        '<div class="rx__val">' + x[1] + (x[2] ? "<br><span style=\"font-size:11px;color:var(--ink-3);font-weight:600\">" + x[2] + "</span>" : "") + "</div></div>";
    }).join("");
  }

  function orderHTML() {
    var steps = [
      { t: "물을 끓여 식힙니다", d: "수돗물은 1분 이상 끓인 뒤 식히세요. 생수(먹는샘물)는 그대로 써도 됩니다." },
      { t: "소금을 먼저 정확히", d: "저울이 있으면 g으로, 없으면 작은술로. 소금은 <b>깎아서</b> 계량하세요." },
      { t: "당을 넣고 녹입니다", d: "설탕·포도당은 잘 풀립니다. 꿀은 물 조금에 미리 풀어 넣으세요." },
      { t: "맛을 확인합니다", d: "눈물보다 조금 짠 정도가 기준입니다. <b>짜면 소금을 더 넣지 말고 물을 조금 더</b> 넣으세요." }
    ];
    return steps.map(function (s, i) {
      return '<div class="plan__item"><div class="plan__num">' + (i + 1) + "</div><div>" +
        '<div class="plan__title">' + esc(s.t) + "</div>" +
        '<div class="plan__body">' + s.d + "</div></div></div>";
    }).join("");
  }

  function cmpHTML(r) {
    function row(label, a, b, c) { return "<tr><td>" + label + "</td><td>" + a + "</td><td>" + b + "</td><td>" + c + "</td></tr>"; }
    var L = r.L;
    return row("염화나트륨", "2.6 g", fmt(r.salt, 1) + " g", "2.6 g") +
      row("포도당", "13.5 g", (state.sugar === "glucose" ? fmt(r.sugarG, 1) : state.sugar === "honey" ? fmt(r.sugarG, 1) : fmt(r.sugarG, 1)) + " g<em>" + (r.honey ? "꿀 기준" : state.sugar === "glucose" ? "동일" : "자당 기준") + "</em>", "13.5 g") +
      row("칼륨(KCl)", "1.5 g", r.kcl > 0 ? fmt(r.kcl, 1) + " g" : "없음<em>생략</em>", "1.5 g") +
      row("구연산/탄산수소", "2.9 g", r.citrate > 0 ? fmt(r.citrate, 1) + " g" : r.alk > 0 ? fmt(r.alk, 1) + " g<em>베이킹소다</em>" : "없음<em>생략</em>", "2.9 g") +
      row("나트륨", "75 mmol/L", fmt(r.na) + " mmol/L", "75 mmol/L") +
      row("삼투압", "245 mOsm/L", "약 " + fmt(r.osm) + " mOsm/L<em>추정</em>", "245 mOsm/L") +
      row("만드는 시간", "제조 공정", "2분", "물만 붓기") +
      row("정확도", "표준", "계량 오차 있음", "표준");
  }

  function paceHTML() {
    var groups = [
      { id: "adult", emoji: "🧑", t: "성인", per: "200~400 mL", d: "설사 1회마다. 갈증이 없어도 마시고, 하루 소변이 1L 이상 나오게 유지하세요." },
      { id: "child", emoji: "🧒", t: "소아 2~10세", per: "100~200 mL", d: "설사 1회마다. 5분에 50mL 페이스로 나눠 먹이고, 마실 때마다 칭찬해 주세요." },
      { id: "infant", emoji: "👶", t: "영아 2세 미만", per: "50~100 mL", d: "설사 1회마다. 모유수유는 계속하세요. 6시간 이상 소변이 없으면 바로 진료." }
    ];
    return groups.map(function (g) {
      var on = g.id === state.who;
      return '<div class="stepcard' + (g.id === "infant" ? " stepcard--amber" : "") + '"' +
        (on ? ' style="border-left-width:4px;box-shadow:0 0 0 2px color-mix(in srgb, var(--mint) 22%, transparent)"' : "") + ">" +
        '<div class="stepcard__time">' + (on ? "✅ 내 대상 · " : "") + esc(g.t) + "</div>" +
        '<div class="stepcard__title">' + g.per + "</div>" +
        '<div class="stepcard__body">' + esc(g.d) + "</div></div>";
    }).join("");
  }

  function redFlagHTML() {
    var items = [
      ["🌡️ 고열 38.5℃ 이상이 지속", "열이 나면서 물도 잘 못 마시면 탈수가 빨라집니다."],
      ["🩸 혈변·점액변", "세균성 장염(이질)일 수 있어 항생제 평가가 필요합니다."],
      ["🚽 6시간(영아)~8시간 이상 소변 없음", "신장으로 가는 혈류가 줄었다는 신호입니다. 가장 확실한 탈수 지표입니다."],
      ["🤮 물도 못 마시는 구토", "경구수액 자체가 불가능하면 정맥 수액이 필요합니다."],
      ["😵 의식 저하·축 처짐·경련", "즉시 응급실. 고나트륨·저나트륨혈증 가능성."],
      ["💧 입술·혀 바짝 마름, 눈물 없음", "중등도 이상 탈수 신호입니다."],
      ["⚖️ 체중 5% 이상 감소", "영아는 10% 이상이면 중증으로 봅니다."],
      ["🫃 심한 복통·배가 딱딱함", "장폐색·복막염 등 다른 원인을 배제해야 합니다."],
      ["⏳ 24시간 이상 호전 없음", "설사·구토가 하루를 넘기면 진료가 원칙입니다."]
    ];
    return '<div class="rule-list">' + items.map(function (x) {
      return '<div class="rule rule--red"><div class="rule__head"><span class="rule__level">병원</span>' +
        '<span class="rule__title">' + esc(x[0]) + "</span></div>" +
        '<div class="rule__body">' + esc(x[1]) + "</div></div>";
    }).join("") + "</div>" +
      '<div class="insight" style="margin-top:10px"><b>기저질환 주의</b> — 신장질환·심부전·간경변·당뇨병이 있으면 나트륨·칼륨·당 부담이 문제가 됩니다. 집에서 만들지 말고 <b>미리 의사·약사에게</b> 물어보세요.</div>';
  }

  function render(r) {
    lastResult = r;
    $("#volEcho").textContent = volLabel(state.vol);
    $("#volEcho2").textContent = volLabel(state.vol);
    $("#resultSub").textContent = (state.sugar === "honey" ? "꿀" : state.sugar === "glucose" ? "포도당" : "설탕") +
      " 기준 · 대상 " + (state.who === "adult" ? "성인" : state.who === "child" ? "소아 2~10세" : "영아 2세 미만") +
      " · 24시간 안에 다 마시세요.";
    $("#verdictBox").innerHTML = verdictHTML(r);
    $("#recipeBox").innerHTML = recipeHTML(r);
    $("#orderBox").innerHTML = orderHTML();
    $("#cmpBody").innerHTML = cmpHTML(r);
    $("#paceBox").innerHTML = paceHTML();
    $("#paceNote").innerHTML = '<div class="insight"><b>구토할 때</b> — 10분 쉬었다가 더 천천히 다시 시작하세요. ' +
      "그래도 계속 토하면 경구수액이 불가능하므로 진료가 필요합니다. " +
      "<b>마신 양을 기록</b>하면 진료 때 큰 도움이 됩니다.</div>";
    $("#redFlagArea").innerHTML = redFlagHTML();
    $("#result").hidden = false;

    $("#countText").textContent = volLabel(state.vol) + " · 소금 " + fmt(r.salt, 1) + "g";
    $("#countHint").textContent = (r.honey ? "꿀 " : state.sugar === "glucose" ? "포도당 " : "설탕 ") + fmt(r.sugarG, 1) + "g";
  }

  function refresh(scroll) {
    var r = compute();
    render(r);
    if (scroll) {
      var el = $("#result");
      var top = el.getBoundingClientRect().top + window.pageYOffset - 10;
      window.scrollTo({ top: top, behavior: "smooth" });
    }
    return r;
  }

  function copyResult() {
    if (!lastResult) return;
    var r = lastResult;
    var text = "【ORS 배합표 · " + volLabel(state.vol) + "】\n" +
      "· 물 " + fmt(state.vol) + "mL (끓여 식힌 것)\n" +
      "· 소금 " + fmt(r.salt, 1) + "g (" + spoon(r.salt, TSP.salt) + ")\n" +
      "· " + (r.honey ? "꿀" : state.sugar === "glucose" ? "포도당" : "설탕") + " " + fmt(r.sugarG, 1) + "g (" +
      spoon(r.sugarG, r.honey ? TSP.honey : TSP.sugar) + ")\n" +
      (r.kcl > 0 ? "· 염화칼륨 " + fmt(r.kcl, 1) + "g\n" : "") +
      (r.alk > 0 ? "· 베이킹소다 " + fmt(r.alk, 1) + "g\n" : "") +
      (r.citrate > 0 ? "· 구연산삼나트륨 " + fmt(r.citrate, 1) + "g\n" : "") +
      "나트륨 약 " + fmt(r.na) + "mmol/L · 24시간 안에 소비\n" +
      "※ WHO 표준 농도 기반 참고 배합 (팩트체크 건강연구소) — 심한 탈수는 진료";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("배합표를 복사했습니다"); },
        function () { toast("복사가 차단되었습니다"); });
    } else {
      toast("이 브라우저에서는 복사가 지원되지 않습니다");
    }
  }

  /* ------------------------------------------------------------------ events */
  function bindSeg(sel, attr, setter) {
    $$(sel + " .seg__btn").forEach(function (b) {
      b.addEventListener("click", function () {
        setter(b.getAttribute(attr));
        $$(sel + " .seg__btn").forEach(function (x) { x.classList.toggle("is-on", x === b); });
        refresh(false);
      });
    });
  }

  function init() {
    initTheme();
    bindSeg("#volSeg", "data-vol", function (v) { state.vol = parseInt(v, 10); });
    bindSeg("#sugarSeg", "data-sugar", function (v) { state.sugar = v; });
    bindSeg("#whoSeg", "data-who", function (v) { state.who = v; });
    $("#kclChk").addEventListener("change", function (e) { state.kcl = e.target.checked; refresh(false); });
    $("#sodaChk").addEventListener("change", function (e) { state.soda = e.target.checked; refresh(false); });

    $("#calcBtn").addEventListener("click", function () { refresh(true); });
    $("#resetBtn").addEventListener("click", function () {
      state.vol = 1000; state.sugar = "sucrose"; state.kcl = false; state.soda = false; state.who = "adult";
      $$("#volSeg .seg__btn").forEach(function (b) { b.classList.toggle("is-on", b.getAttribute("data-vol") === "1000"); });
      $$("#sugarSeg .seg__btn").forEach(function (b) { b.classList.toggle("is-on", b.getAttribute("data-sugar") === "sucrose"); });
      $$("#whoSeg .seg__btn").forEach(function (b) { b.classList.toggle("is-on", b.getAttribute("data-who") === "adult"); });
      $("#kclChk").checked = false;
      $("#sodaChk").checked = false;
      refresh(false);
      toast("기본값으로 돌아갔습니다");
    });
    $("#copyBtn").addEventListener("click", copyResult);
    $("#editBtn").addEventListener("click", function () {
      var top = $("#calc").getBoundingClientRect().top + window.pageYOffset - 70;
      window.scrollTo({ top: top, behavior: "smooth" });
    });

    var y = $("#year");
    if (y) y.textContent = String(new Date().getFullYear());

    refresh(false);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
