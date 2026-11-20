/* ==========================================================================
   팩트체크 건강연구소 · 혈당 덜 오르는 식순 배치기
   고른 음식 → 1·2·3·4단계 순서 + 시간 간격 + 참고 피크 감소 범위
   --------------------------------------------------------------------------
   ⚠️ 식사순서 연구(Shukla 2015, Imai 2011 등)를 정리한 '참고용' 배치입니다.
   개인 혈당 반응은 크게 다르며, 약·인슐린을 대신하지 않습니다.
   ========================================================================== */

(function () {
  "use strict";

  var CATS = [
    { id: "veg", emoji: "🥬", name: "채소·나물", sub: "샐러드 · 나물 · 김치", role: "fib", step: 1 },
    { id: "protein", emoji: "🍳", name: "단백질", sub: "계란 · 고기 · 생선", role: "prot", step: 2 },
    { id: "tofu", emoji: "🥜", name: "두부·견과류", sub: "식물성 단백질 · 지방", role: "prot", step: 2 },
    { id: "carb", emoji: "🍚", name: "밥·면·빵", sub: "탄수화물", role: "carb", step: 3 },
    { id: "soup", emoji: "🍲", name: "국물", sub: "국 · 찌개 · 탕", role: "soup", step: 3 },
    { id: "dessert", emoji: "🍰", name: "과일·디저트", sub: "당 · 후식", role: "sweet", step: 4 }
  ];

  var STEP_META = {
    1: { label: "1단계 · 섬유질", tip: "채소·나물부터. 김치는 3쪽, 나물은 한 접시. 여기에 5분을 쓰면 뒤가 편해집니다." },
    2: { label: "2단계 · 단백질·지방", tip: "계란·고기·생선, 두부·견과류. 밥보다 먼저 먹으면 포만감이 올라 과식도 줄어요." },
    3: { label: "3단계 · 탄수화물", tip: "밥·면·빵은 이제부터. 국물은 밥보다 뒤에, 반 그릇만 드세요." },
    4: { label: "4단계 · 디저트", tip: "과일·디저트는 식후 10~20분 뒤 소량. 견과·치즈와 함께면 더 완만합니다." }
  };

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function fmt(n) { return Math.round(n).toLocaleString("ko-KR"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var state = { sel: {}, gap: 5, rice: 1, start: "12:00" };
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

  function renderFoods() {
    $("#foodList").innerHTML = CATS.map(function (c) {
      return '<label class="item">' +
        '<input type="checkbox" data-food="' + c.id + '" aria-label="' + esc(c.name) + '">' +
        '<span class="item__box" aria-hidden="true"></span>' +
        '<span class="item__text"><span class="item__name">' + c.emoji + " " + esc(c.name) + "</span>" +
        '<span class="item__sub">' + esc(c.sub) + "</span></span></label>";
    }).join("");
    $$("#foodList input").forEach(function (el) {
      el.addEventListener("change", function () {
        state.sel[el.dataset.food] = el.checked;
        updateCount();
        schedule();
      });
    });
  }

  function has(id) { return !!state.sel[id]; }

  function clockAt(min) {
    var parts = (state.start || "12:00").split(":");
    var h = parseInt(parts[0], 10) || 0;
    var m = parseInt(parts[1], 10) || 0;
    var t = h * 60 + m + min;
    t = ((t % 1440) + 1440) % 1440;
    var hh = Math.floor(t / 60), mm = t % 60;
    return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
  }

  function compute() {
    var g = state.gap;
    var hasCarb = has("carb"), hasVeg = has("veg"), hasProt = has("protein") || has("tofu");
    var hasSoup = has("soup"), hasSweet = has("dessert");
    var count = CATS.filter(function (c) { return has(c.id); }).length;
    var total = count === 0 ? 0 : 1;

    var steps = [];
    if (hasVeg) steps.push({ step: 1, at: 0, items: ["채소·나물"] });
    if (hasProt) {
      var items = [];
      if (has("protein")) items.push("계란·고기·생선");
      if (has("tofu")) items.push("두부·견과류");
      steps.push({ step: 2, at: (hasVeg ? 1 : 0) * g, items: items });
    }
    if (hasCarb || hasSoup) {
      var items3 = [];
      if (hasCarb) items3.push("밥·면·빵");
      if (hasSoup) items3.push("국물은 밥 뒤 반 그릇");
      steps.push({ step: 3, at: ((hasVeg ? 1 : 0) + (hasProt ? 1 : 0)) * g, items: items3 });
    }
    if (hasSweet) {
      var base = ((hasVeg ? 1 : 0) + (hasProt ? 1 : 0) + ((hasCarb || hasSoup) ? 1 : 0)) * g;
      steps.push({ step: 4, at: base + 10, items: ["과일·디저트 소량"] });
    }

    var tier, missing = [];
    if (!count) tier = null;
    else if (hasCarb && !hasVeg && !hasProt) tier = "red";
    else if (hasCarb && (hasVeg && hasProt)) tier = "green";
    else if (hasCarb) { tier = "amber"; if (!hasVeg) missing.push("채소"); if (!hasProt) missing.push("단백질"); }
    else if (hasVeg && hasProt) tier = "green";
    else { tier = "amber"; if (!hasVeg) missing.push("채소"); if (!hasProt) missing.push("단백질"); }

    var peak = hasVeg && hasProt ? "20~40%" : (hasVeg || hasProt ? "10~25%" : "0~10%");
    var carbG = hasCarb ? Math.round(65 * state.rice) : 0;
    if (hasSweet) carbG += 15;

    return {
      steps: steps, tier: tier, missing: missing, count: count,
      hasVeg: hasVeg, hasProt: hasProt, hasCarb: hasCarb, hasSoup: hasSoup, hasSweet: hasSweet,
      peak: peak, carbG: carbG, gap: g, total: total
    };
  }

  function verdictHtml(r) {
    var tone = r.tier || "amber";
    var badge, title, desc;
    if (tone === "green") {
      badge = "🟢 방어 가능";
      title = "채소 → 단백질 → 밥, 오늘은 피크가 낮아요";
      desc = "섬유질과 단백질을 먼저 먹는 구성입니다. 같은 메뉴를 <b>밥부터</b> 먹을 때와 비교하면 식후 혈당 상승폭이 <b>약 " + r.peak + "</b> 낮게 보고되는 조합이에요. 순서만 지키면 됩니다.";
    } else if (tone === "amber") {
      badge = "🟡 보완 1가지";
      title = (r.missing.length ? r.missing.join(" · ") + "만 더하면 완성" : "탄수화물이 빠진 구성이에요");
      desc = r.missing.length
        ? "지금 구성도 밥부터 먹는 것보다는 낫지만, <b>" + r.missing.join("·") + "</b>이(가) 빠져 피크 감소가 <b>" + r.peak + "</b> 수준입니다. " +
          (r.missing.indexOf("채소") >= 0 ? "김치 3쪽·나물 한 접시만 추가해도 달라져요." : "계란 하나·두부 반 모만 추가해도 달라져요.")
        : "탄수화물이 없어 혈당 스파이크 위험은 낮습니다. 다만 끼니가 부실하면 다음 끼니에 몰아 먹기 쉬우니, 채소·단백질 양을 충분히 챙기세요.";
    } else {
      badge = "🔴 위험";
      title = "밥부터 먹는 구성 — 피크가 가장 큰 조합";
      desc = "채소도 단백질도 없이 <b>탄수화물만</b> 있습니다. 이대로면 식후 혈당이 빠르게 오르고, 2~3시간 뒤 허기가 오기 쉬워요. <b>김치 3쪽·계란 하나</b>만 앞에 더해도 순서가 살아납니다.";
    }
    return '<div class="verdict verdict--' + tone + '">' +
      '<span class="verdict__badge">' + badge + "</span>" +
      '<h3 class="verdict__title">' + title + "</h3>" +
      '<p class="verdict__desc">' + desc + "</p></div>";
  }

  function summaryHtml(r) {
    var tone = r.tier || "amber";
    return '<div class="summary__card summary__card--' + tone + '"><span class="summary__num">' + r.count + '<span style="font-size:13px">개</span></span><span class="summary__label">고른 음식</span></div>' +
      '<div class="summary__card summary__card--green"><span class="summary__num">' + r.steps.length + '<span style="font-size:13px">단계</span></span><span class="summary__label">섭취 순서</span></div>' +
      '<div class="summary__card"><span class="summary__num">' + r.peak + "</span><span class=\"summary__label\">피크 감소 참고범위</span></div>";
  }

  function stepsHtml(r) {
    var html = r.steps.map(function (s, i) {
      var meta = STEP_META[s.step];
      var label = (i + 1) + "단계 · " + meta.label.split(" · ")[1];
      var pills = s.items.map(function (t) { return '<span class="pill">' + esc(t) + "</span>"; }).join("");
      return '<div class="slot">' +
        '<div class="slot__time"><span class="slot__label">' + label + '</span><span class="slot__clock">' + clockAt(s.at) + " (" + (s.at === 0 ? "시작" : "+" + s.at + "분") + ")</span></div>" +
        '<div class="slot__items">' + pills + "</div>" +
        '<div class="slot__tip">' + meta.tip + "</div></div>";
    }).join("");

    if (!r.hasVeg) {
      html = '<div class="card card--warn" style="margin-bottom:10px"><div class="card__body">' +
        "<p><b>채소가 없습니다.</b> 김치 3쪽, 나물 한 접시, 오이·당근 스틱, 토마토 한 개 중 하나를 <b>맨 앞에</b> 추가하세요. 그것만으로도 순서가 달라집니다.</p></div></div>" + html;
    }
    $("#stepList").innerHTML = html;

    var note;
    if (r.hasCarb) {
      note = "예상 탄수화물 약 <b>" + r.carbG + "g</b> (밥 " + (state.rice === 0.5 ? "반" : state.rice === 1 ? "1" : "1.5") + "공기 기준" + (r.hasSweet ? " + 디저트 15g" : "") + "). 반찬·국물의 탄수화물은 빠진 대략치입니다.";
    } else {
      note = "밥·면·빵이 없어 탄수화물 부담은 낮습니다. 대신 단백질과 채소 양을 충분히 챙기세요.";
    }
    if (r.hasSoup) note += " 국물은 <b>밥보다 뒤</b>, 반 그릇만 — 국물밥은 피크를 키웁니다.";
    $("#stepNote").innerHTML = note;
  }

  function tipsHtml(r) {
    var items = [
      { cls: "", n: "1", t: "20분 이상, 천천히", b: "식사 시간이 10분 이하면 같은 양도 혈당이 더 빨리 오릅니다. 젓가락을 내려놓는 습관부터." },
      { cls: "", n: "2", t: "식후 10~20분 뒤 10~20분 걷기", b: "근육이 포도당을 가져다 씁니다. 식전이나 몇 시간 뒤보다 <b>식후 걷기</b>가 효과적이에요." },
      { cls: "", n: "3", t: "식전 물 300mL", b: "위 팽창으로 과식을 줄이고, 혈당 상승을 완만하게 하는 데 도움이 됩니다. 국물로 대신하지 마세요." },
      { cls: "plan__item--amber", n: "4", t: "식초 1큰술 (선택)", b: "초산이 식후 혈당 상승을 완만하게 한다는 소규모 연구가 있습니다. 물에 희석해 식사와 함께. <b>위염·역류가 있으면 피하세요.</b>" },
      { cls: "", n: "5", t: "밥은 반 공기부터", b: "부족하면 채소·단백질을 더 추가하세요. 밥을 늘리는 것보다 배부른 쪽이 혈당에 낫습니다." },
      { cls: "plan__item--red", n: "6", t: "디저트는 단백질·지방과", b: "과일 단독보다 견과·치즈·요거트와 함께. 주스는 피하고 통과일로." }
    ];
    $("#tipList").innerHTML = items.map(function (it) {
      return '<div class="plan__item ' + it.cls + '"><span class="plan__num">' + it.n + "</span>" +
        '<div><div class="plan__title">' + it.t + "</div>" +
        '<div class="plan__body">' + it.b + "</div></div></div>";
    }).join("");
  }

  function analyze(scroll) {
    var r = compute();
    if (!r || !r.count) {
      $("#result").hidden = true;
      last = null;
      return;
    }
    last = r;
    $("#result").hidden = false;
    $("#verdictBox").innerHTML = verdictHtml(r);
    $("#summaryBox").innerHTML = summaryHtml(r);
    stepsHtml(r);
    tipsHtml(r);
    var names = CATS.filter(function (c) { return has(c.id); }).map(function (c) { return c.name; });
    $("#resultSub").textContent = names.join(" · ") + " · " + clockAt(0) + " 시작 · " + r.gap + "분 간격";
    updateCount();
    if (scroll) $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateCount() {
    var n = CATS.filter(function (c) { return has(c.id); }).length;
    if (!n) {
      $("#countText").textContent = "음식을 고르면 순서를 짜드려요";
      $("#countHint").textContent = "채소·단백질·밥을 모두 고르면 가장 좋아요";
      return;
    }
    $("#countText").textContent = "고른 음식 " + n + "개 · " + state.gap + "분 간격";
    var hasVeg = has("veg"), hasProt = has("protein") || has("tofu"), hasCarb = has("carb");
    $("#countHint").textContent = hasVeg && hasProt && hasCarb ? "🟢 채소·단백질·밥 모두 있음" : (!hasVeg && !hasProt && hasCarb ? "🔴 밥부터 먹는 구성" : "🟡 한 가지만 보완하면 완성");
  }

  function schedule() {
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
    var r = last;
    var lines = ["오늘 식순 (" + clockAt(0) + " 시작, " + r.gap + "분 간격)"];
    r.steps.forEach(function (s) {
      lines.push(clockAt(s.at) + " " + STEP_META[s.step].label.split(" · ")[1] + ": " + s.items.join(", "));
    });
    lines.push("예상 피크 감소 참고범위: " + r.peak);
    var text = lines.join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("순서를 복사했어요"); }, function () { toast("복사에 실패했어요"); });
    } else toast("복사가 지원되지 않는 브라우저예요");
  }

  function init() {
    initTheme();
    renderFoods();

    $$("#gapSeg .seg__btn").forEach(function (b) {
      b.addEventListener("click", function () {
        $$("#gapSeg .seg__btn").forEach(function (x) { x.classList.remove("is-on"); x.setAttribute("aria-pressed", "false"); });
        b.classList.add("is-on"); b.setAttribute("aria-pressed", "true");
        state.gap = parseInt(b.dataset.gap, 10);
        updateCount(); schedule();
      });
    });
    $$("#riceSeg .seg__btn").forEach(function (b) {
      b.addEventListener("click", function () {
        $$("#riceSeg .seg__btn").forEach(function (x) { x.classList.remove("is-on"); x.setAttribute("aria-pressed", "false"); });
        b.classList.add("is-on"); b.setAttribute("aria-pressed", "true");
        state.rice = parseFloat(b.dataset.rice);
        schedule();
      });
    });
    $("#startTime").addEventListener("input", function (e) {
      if (e.target.value) { state.start = e.target.value; schedule(); }
    });
    $("#analyzeBtn").addEventListener("click", function () { analyze(true); });
    $("#resetBtn").addEventListener("click", function () {
      state.sel = {}; state.gap = 5; state.rice = 1;
      $$("#foodList input").forEach(function (el) { el.checked = false; });
      $("#startTime").value = state.start;
      $$("#gapSeg .seg__btn").forEach(function (x, i) { x.classList.toggle("is-on", i === 1); x.setAttribute("aria-pressed", i === 1 ? "true" : "false"); });
      $$("#riceSeg .seg__btn").forEach(function (x, i) { x.classList.toggle("is-on", i === 1); x.setAttribute("aria-pressed", i === 1 ? "true" : "false"); });
      $("#result").hidden = true; last = null;
      updateCount();
      $("#checker").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("#copyBtn").addEventListener("click", copyResult);
    $("#editBtn").addEventListener("click", function () { $("#checker").scrollIntoView({ behavior: "smooth", block: "start" }); });

    var y = $("#year");
    if (y) y.textContent = String(new Date().getFullYear());

    /* 기본 시작 시각을 지금 시각으로 */
    var now = new Date();
    var hh = now.getHours(), mm = now.getMinutes();
    $("#startTime").value = (hh < 10 ? "0" : "") + hh + ":" + (mm < 30 ? "00" : "30");
    state.start = $("#startTime").value;
    updateCount();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
