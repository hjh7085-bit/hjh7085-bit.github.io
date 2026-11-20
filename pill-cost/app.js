/* ==========================================================================
   팩트체크 건강연구소 · 영양제 1알 단가 / 1일 유지비 비교기
   최대 3개 제품의 1알 단가·1일 유지비·30일·1년·성분 1,000mg당 가격 비교
   ========================================================================== */

(function () {
  "use strict";

  var SLOTS = [
    { n: 1, label: "제품 A", note: "필수" },
    { n: 2, label: "제품 B", note: "선택" },
    { n: 3, label: "제품 C", note: "선택" }
  ];

  /* 같은 성분(오메가3) 3종 예시 — 1일 유지비 1위와 성분당 가격 1위가 갈리는 케이스 */
  var SAMPLE = [
    { name: "오메가3 A (120정)", price: "32900", caps: "120", day: "2", mg: "1000" },
    { name: "오메가3 B (90정)", price: "27900", caps: "90", day: "2", mg: "1200" },
    { name: "오메가3 C (120정)", price: "19900", caps: "120", day: "2", mg: "500" }
  ];

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function num(v) { var n = parseFloat(String(v).replace(/,/g, "")); return isFinite(n) ? n : null; }
  function fmt(n) { return Math.round(n).toLocaleString("ko-KR"); }
  function fmt1(n) { return (Math.round(n * 10) / 10).toLocaleString("ko-KR"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

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

  function renderCards() {
    $("#productStack").innerHTML = SLOTS.map(function (s) {
      return '<div class="fcard">' +
        '<div class="fcard__head"><span class="fcard__icon" aria-hidden="true">' + (s.n === 1 ? "💊" : s.n === 2 ? "💊" : "💊") + "</span>" +
          '<h3 class="fcard__title">' + s.label + '</h3><span class="fcard__note">' + s.note + "</span></div>" +
        '<div class="fgrid">' +
          '<label class="field field--full"><span class="field__label">제품명</span>' +
            '<span class="input-wrap"><input class="input" id="p' + s.n + '-name" type="text" placeholder="예: 오메가3 120정" autocomplete="off"></span></label>' +
          '<label class="field"><span class="field__label">가격</span>' +
            '<span class="input-wrap"><input class="input" id="p' + s.n + '-price" type="number" inputmode="numeric" min="0" step="100" placeholder="예: 32,900" autocomplete="off"><span class="input__unit">원</span></span></label>' +
          '<label class="field"><span class="field__label">총 알 수</span>' +
            '<span class="input-wrap"><input class="input" id="p' + s.n + '-caps" type="number" inputmode="numeric" min="1" step="1" placeholder="예: 120" autocomplete="off"><span class="input__unit">정</span></span>' +
            '<span class="field__hint">1+1은 합계 (120정 1+1 = 240정)</span></label>' +
          '<label class="field"><span class="field__label">1일 섭취</span>' +
            '<span class="input-wrap"><input class="input" id="p' + s.n + '-day" type="number" inputmode="decimal" min="0.5" step="0.5" value="1" autocomplete="off"><span class="input__unit">알</span></span>' +
            '<span class="field__hint">제품 뒷면 1일 섭취량</span></label>' +
          '<label class="field"><span class="field__label">1알 주성분 함량 <span class="opt">선택</span></span>' +
            '<span class="input-wrap"><input class="input" id="p' + s.n + '-mg" type="number" inputmode="decimal" min="0" step="0.1" placeholder="예: 1000" autocomplete="off"><span class="input__unit">mg</span></span>' +
            '<span class="field__hint">함량이 다르면 이 칸을 채우세요</span></label>' +
        "</div></div>";
    }).join("");

    $$("#productStack input").forEach(function (el) {
      el.addEventListener("input", function () { updateCount(); schedule(); });
      el.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); analyze(true); } });
    });
  }

  function readProducts() {
    return SLOTS.map(function (s) {
      var name = ($("#p" + s.n + "-name").value || "").trim() || s.label;
      var price = num($("#p" + s.n + "-price").value);
      var caps = num($("#p" + s.n + "-caps").value);
      var day = num($("#p" + s.n + "-day").value);
      var mg = num($("#p" + s.n + "-mg").value);
      if (!price || price <= 0 || !caps || caps <= 0 || !day || day <= 0) return null;
      var unit = price / caps;
      var daily = unit * day;
      var days = caps / day;
      return {
        n: s.n, label: s.label, name: name, price: price, caps: caps, day: day, mg: mg,
        unit: unit, daily: daily, monthly: daily * 30, yearly: daily * 365, days: days,
        comp: mg && mg > 0 ? price / (caps * mg) * 1000 : null,
        dailyComp: mg && mg > 0 ? mg * day : null
      };
    });
  }

  function compute() {
    var items = readProducts().filter(Boolean);
    if (!items.length) return null;
    var byDaily = items.slice().sort(function (a, b) { return a.daily - b.daily; });
    var withComp = items.filter(function (x) { return x.comp !== null; });
    var byComp = withComp.slice().sort(function (a, b) { return a.comp - b.comp; });
    return { items: items, byDaily: byDaily, byComp: byComp, best: byDaily[0] };
  }

  function verdictHtml(r) {
    var best = r.best;
    var title, desc;
    if (r.items.length === 1) {
      title = best.name + " — 하루 " + fmt(best.daily) + "원";
      desc = "1알 " + fmt(best.unit) + "원 × 하루 " + fmt1(best.day) + "알 = <b>하루 " + fmt(best.daily) + "원</b>, 30일 " + fmt(best.monthly) + "원입니다. 비교할 제품을 더 넣으면 가장 싼 쪽을 찾아드려요.";
    } else {
      var worst = r.byDaily[r.byDaily.length - 1];
      var save = worst.daily - best.daily;
      title = best.name + " — 하루 " + fmt(best.daily) + "원으로 가장 저렴";
      desc = best.name + "의 1알 단가는 " + fmt(best.unit) + "원, 하루 " + fmt1(best.day) + "알 기준 <b>" + fmt(best.daily) + "원</b>입니다. " +
        "가장 비싼 " + worst.name + "(" + fmt(worst.daily) + "원)보다 <b>하루 " + fmt(save) + "원</b>, 1년이면 <b>" + fmt(save * 365) + "원</b> 차이입니다.";
    }

    var compWarn = "";
    if (r.byComp.length >= 2 && r.byComp[0].n !== r.best.n) {
      var c = r.byComp[0];
      compWarn = " <b>다만 성분 1,000mg당으로는 " + c.name + " — " + fmt(c.comp) + "원으로 가장 저렴합니다.</b> 1일 유지비 1위와 다르니, 함량이 다르면 성분 기준을 보세요.";
    }
    return '<div class="verdict verdict--green">' +
      '<span class="verdict__badge">🥇 최저가 판정</span>' +
      '<h3 class="verdict__title">' + title + "</h3>" +
      '<p class="verdict__desc">' + desc + compWarn + "</p></div>";
  }

  function cardHtml(r) {
    return r.byDaily.map(function (p, i) {
      var isBest = i === 0;
      return '<div class="pcol' + (isBest ? " is-best" : "") + '">' +
        '<div class="pcol__name">' + esc(p.name) + (isBest ? ' <span class="rank">1위</span>' : "") + "</div>" +
        '<div class="pcol__price">' + fmt(p.daily) + '<small>원 / 1일</small></div>' +
        '<div class="pcol__rows">' +
          "<div><span>1알 단가</span><b>" + fmt(p.unit) + "원</b></div>" +
          "<div><span>30일</span><b>" + fmt(p.monthly) + "원</b></div>" +
          "<div><span>1년</span><b>" + fmt(p.yearly) + "원</b></div>" +
          "<div><span>한 통(" + fmt(p.caps) + "정)</span><b>" + fmt(p.days) + "일분</b></div>" +
          (p.comp !== null ? "<div><span>성분 1,000mg당</span><b>" + fmt(p.comp) + "원</b></div>" : "") +
        "</div>" +
        '<div class="pcol__foot">' + fmt(p.price) + "원 ÷ " + fmt(p.caps) + "정 × 하루 " + fmt1(p.day) + "알" + (p.mg ? " · 1알 " + fmt1(p.mg) + "mg" : "") + "</div>" +
        "</div>";
    }).join("");
  }

  function barHtml(r) {
    var max = r.byDaily[r.byDaily.length - 1].daily;
    return r.byDaily.map(function (p, i) {
      var w = Math.max(6, p.daily / max * 100);
      return '<div class="load">' +
        '<div class="load__head"><span class="load__name">' + (i === 0 ? "🥇 " : "") + esc(p.name) +
          "<span>1알 " + fmt(p.unit) + "원 × " + fmt1(p.day) + "알</span></span>" +
          '<span class="load__num">' + fmt(p.daily) + "원<small>1일</small></span></div>" +
        '<div class="load__track"><span class="load__keep" style="width:' + w.toFixed(1) + '%"></span></div></div>';
    }).join("");
  }

  function tableHtml(r) {
    $("#cmpBody").innerHTML = r.byDaily.map(function (p, i) {
      return "<tr" + (i === 0 ? ' class="is-best"' : "") + ">" +
        "<td><b>" + esc(p.name) + "</b>" + (i === 0 ? ' <span class="rank">1위</span>' : "") + "<em>" + fmt(p.price) + "원 · " + fmt(p.caps) + "정</em></td>" +
        "<td>" + fmt(p.unit) + "<em>원</em></td>" +
        "<td>" + fmt(p.daily) + "<em>원</em></td>" +
        "<td>" + fmt(p.monthly) + "<em>원</em></td>" +
        "<td>" + fmt(p.yearly) + "<em>원</em></td>" +
        "<td>" + fmt(p.days) + "<em>일</em></td></tr>";
    }).join("");
  }

  function compHtml(r) {
    var withComp = r.items.filter(function (x) { return x.comp !== null; });
    if (!withComp.length) { $("#compBlock").hidden = true; return; }
    $("#compBlock").hidden = false;
    var bestComp = r.byComp[0];
    $("#compBody").innerHTML = r.byDaily.map(function (p) {
      if (p.comp === null) {
        return "<tr><td><b>" + esc(p.name) + "</b></td><td colspan=\"3\" class=\"muted\">함량 미입력</td></tr>";
      }
      var isBest = bestComp && p.n === bestComp.n;
      return "<tr" + (isBest ? ' class="is-best"' : "") + ">" +
        "<td><b>" + esc(p.name) + "</b>" + (isBest ? ' <span class="rank">성분 1위</span>' : "") + "</td>" +
        "<td>" + fmt1(p.mg) + "<em>mg/알</em></td>" +
        "<td>" + fmt(p.comp) + "<em>원</em></td>" +
        "<td>" + fmt1(p.dailyComp) + "<em>mg</em></td></tr>";
    }).join("");

    var note;
    if (r.byComp.length === 1) {
      note = "함량을 2개 이상 넣으면 성분 기준 순위도 비교합니다.";
    } else if (bestComp.n === r.best.n) {
      note = "1알 단가 1위와 성분 1,000mg당 1위가 <b>같습니다</b>. 이 제품은 가격·함량 모두 유리합니다.";
    } else {
      note = "1일 유지비 1위 제품은 <b>" + r.best.name + "</b>, 성분 1,000mg당 1위 제품은 <b>" + bestComp.name + "</b> — " + fmt(bestComp.comp) + "원입니다. 함량이 낮은 제품은 1알 단가가 싸 보일 뿐 실제로는 더 비쌀 수 있어요.";
    }
    $("#compNote").innerHTML = note;
  }

  function trapHtml() {
    var items = [
      { cls: "plan__item--red", n: "1", t: "1+1을 120정으로 입력", b: "1+1은 <b>총 알 수</b>에 240정을 넣어야 합니다. 120정으로 넣으면 1알 단가가 2배로 계산됩니다." },
      { cls: "plan__item--amber", n: "2", t: "하루 2알 제품을 1알 단가로 비교", b: "1알 단가가 반값이어도 하루 2알이면 유지비는 같아집니다. 실제 지출은 <b>1일 유지비</b>로 보세요." },
      { cls: "plan__item--red", n: "3", t: "함량이 다른데 1알 단가만 비교", b: "500mg 1알과 1,000mg 1알은 같은 알이 아닙니다. 함량을 넣고 <b>성분 1,000mg당</b>으로 비교하세요." },
      { cls: "", n: "4", t: "정기배송 첫 달 가격", b: "첫 달 할인가로 계산하면 1년 비용이 실제보다 낮게 나옵니다. <b>2회차 이후 금액</b>으로 넣으세요." },
      { cls: "", n: "5", t: "배송비·쿠폰 누락", b: "무료배송 기준을 안 채우면 배송비가 붙습니다. 실제 결제액 기준으로 비교하는 게 정확합니다." },
      { cls: "plan__item--amber", n: "6", t: "유통기한 임박 대용량", b: "싸게 사도 다 못 먹으면 낭비입니다. 한 통 사용일을 확인하고, 유통기한 안에 먹을 수 있는 양인지 보세요." }
    ];
    $("#trapList").innerHTML = items.map(function (it) {
      return '<div class="plan__item ' + it.cls + '"><span class="plan__num">' + it.n + "</span>" +
        '<div><div class="plan__title">' + it.t + "</div>" +
        '<div class="plan__body">' + it.b + "</div></div></div>";
    }).join("");
  }

  function analyze(scroll) {
    var r = compute();
    if (!r) { $("#result").hidden = true; last = null; return; }
    last = r;
    $("#result").hidden = false;
    $("#verdictBox").innerHTML = verdictHtml(r);
    $("#cardList").innerHTML = cardHtml(r);
    $("#barList").innerHTML = barHtml(r);
    tableHtml(r);
    compHtml(r);
    trapHtml();
    $("#resultSub").textContent = r.items.length + "개 제품 비교 · 1일 유지비 기준";
    updateCount();
    if (scroll) $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateCount() {
    var items = readProducts().filter(Boolean);
    if (!items.length) {
      $("#countText").textContent = "가격과 알 수를 넣으면 자동 계산";
      $("#countHint").textContent = "1일 유지비가 가장 낮은 제품을 찾아드려요";
      return;
    }
    var best = items.slice().sort(function (a, b) { return a.daily - b.daily; })[0];
    $("#countText").textContent = items.length + "개 제품 · 최저 " + fmt(best.daily) + "원/일";
    $("#countHint").textContent = best.name + " · 하루 " + fmt1(best.day) + "알 기준";
  }

  function schedule() {
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
    var r = last;
    var lines = r.byDaily.map(function (p, i) {
      return (i + 1) + ". " + p.name + " — 1알 " + fmt(p.unit) + "원 · 하루 " + fmt(p.daily) + "원 · 30일 " + fmt(p.monthly) + "원" + (p.comp !== null ? " · 성분 1,000mg당 " + fmt(p.comp) + "원" : "");
    });
    var text = lines.join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("결과를 복사했어요"); }, function () { toast("복사에 실패했어요"); });
    } else toast("복사가 지원되지 않는 브라우저예요");
  }

  function fillSample() {
    SLOTS.forEach(function (s, i) {
      var d = SAMPLE[i];
      $("#p" + s.n + "-name").value = d.name;
      $("#p" + s.n + "-price").value = d.price;
      $("#p" + s.n + "-caps").value = d.caps;
      $("#p" + s.n + "-day").value = d.day;
      $("#p" + s.n + "-mg").value = d.mg;
    });
    updateCount();
    analyze(false);
  }

  function clearAll() {
    SLOTS.forEach(function (s) {
      $("#p" + s.n + "-name").value = "";
      $("#p" + s.n + "-price").value = "";
      $("#p" + s.n + "-caps").value = "";
      $("#p" + s.n + "-day").value = "1";
      $("#p" + s.n + "-mg").value = "";
    });
    $("#result").hidden = true; last = null;
    updateCount();
  }

  function init() {
    initTheme();
    renderCards();
    $("#analyzeBtn").addEventListener("click", function () { analyze(true); });
    $("#resetBtn").addEventListener("click", function () {
      clearAll();
      $("#checker").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("#sampleBtn").addEventListener("click", fillSample);
    $("#clearAllBtn").addEventListener("click", clearAll);
    $("#copyBtn").addEventListener("click", copyResult);
    $("#editBtn").addEventListener("click", function () { $("#checker").scrollIntoView({ behavior: "smooth", block: "start" }); });
    var y = $("#year");
    if (y) y.textContent = String(new Date().getFullYear());
    updateCount();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
