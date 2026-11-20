/* ==========================================================================
   팩트체크 건강연구소 · 1+1·대용량 꼼수 걸러내는 g/mL당 역산기
   단품 A vs 묶음 B → 100g(100mL·1개)당 실제 단가와 차액 판정
   ========================================================================== */

(function () {
  "use strict";

  var PRESETS = {
    trap: {
      unit: "mL",
      a: { name: "우유 900mL", price: 2400, size: 900, qty: 1, promo: 1 },
      b: { name: "우유 500mL 1+1", price: 2900, size: 500, qty: 1, promo: 2 }
    },
    deal: {
      unit: "g",
      a: { name: "견과류 500g", price: 8900, size: 500, qty: 1, promo: 1 },
      b: { name: "견과류 1kg 대용량", price: 12900, size: 1000, qty: 1, promo: 1 }
    },
    multi: {
      unit: "ea",
      a: { name: "주방세제 1개", price: 3000, size: 1, qty: 1, promo: 1 },
      b: { name: "주방세제 3+1", price: 15000, size: 1, qty: 1, promo: 4 }
    }
  };

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function num(v) { var n = parseFloat(String(v).replace(/,/g, "")); return isFinite(n) ? n : null; }
  function fmt(n) { return Math.round(n).toLocaleString("ko-KR"); }
  function fmt1(n) { return (Math.round(n * 10) / 10).toLocaleString("ko-KR"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var state = { unit: "g", aPromo: 1, bPromo: 1 };
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

  function baseLabel() { return state.unit === "ea" ? "1개당" : "100" + state.unit + "당"; }
  function unitText() { return state.unit === "ea" ? "개" : state.unit; }

  function setUnit(u) {
    state.unit = u;
    $$("#unitSeg .seg__btn").forEach(function (b) {
      var on = b.dataset.unit === u;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $$(".js-unit").forEach(function (el) { el.textContent = u === "ea" ? "개" : u; });
    ["a", "b"].forEach(function (k) {
      var field = $("#" + k + "-size").closest(".field");
      field.style.display = u === "ea" ? "none" : "";
      if (u === "ea") $("#" + k + "-size").value = "1";
    });
  }

  function readOne(k, promo) {
    var name = ($("#" + k + "-name").value || "").trim() || (k === "a" ? "상품 A" : "상품 B");
    var price = num($("#" + k + "-price").value);
    var size = state.unit === "ea" ? 1 : num($("#" + k + "-size").value);
    var qty = num($("#" + k + "-qty").value);
    if (!price || price <= 0 || !size || size <= 0 || !qty || qty <= 0) return null;
    var totalQty = qty * promo;
    var totalContent = size * totalQty;
    var perBase = price / totalContent * 100; /* 100g/100mL 기준, 개 단위는 ×100/1 = 개당×100 */
    if (state.unit === "ea") perBase = price / totalQty; /* 개당 */
    return {
      name: name, price: price, size: size, qty: qty, promo: promo,
      totalQty: totalQty, totalContent: totalContent,
      perUnit: price / totalQty, perBase: perBase
    };
  }

  function compute() {
    var a = readOne("a", state.aPromo);
    var b = readOne("b", state.bPromo);
    if (!a || !b) return null;
    var diff = (b.perBase - a.perBase) / a.perBase * 100;
    var targetContent = b.totalContent;
    var aCostForSame = state.unit === "ea" ? a.perBase * b.totalQty : a.perBase / 100 * targetContent;
    var money = b.price - aCostForSame;
    return { a: a, b: b, diff: diff, aCostForSame: aCostForSame, money: money };
  }

  function verdictHtml(r) {
    var tone, badge, title, desc;
    var d = r.diff;
    var promoWord = r.b.promo > 1 ? (r.b.promo === 2 ? "1+1" : r.b.promo === 3 ? "2+1" : "3+1") : "묶음";
    if (Math.abs(d) <= 2) {
      tone = "amber"; badge = "🟡 거의 같아요";
      title = "단가 차이 " + fmt1(Math.abs(d)) + "% — 사실상 같습니다";
      desc = "A는 " + baseLabel() + " <b>" + fmt(r.a.perBase) + "원</b>, B는 <b>" + fmt(r.b.perBase) + "원</b>입니다. 차이가 2% 이내라 가격만 보면 어느 쪽을 사도 비슷해요. <b>유통기한·보관 공간·배송비</b>로 결정하세요.";
    } else if (d < 0) {
      tone = "green"; badge = "🟢 B가 더 저렴";
      title = "B가 " + baseLabel() + " " + fmt1(Math.abs(d)) + "% 저렴합니다";
      desc = "A " + fmt(r.a.perBase) + "원 → B <b>" + fmt(r.b.perBase) + "원</b> (" + baseLabel() + "). 같은 양을 B로 사면 A 기준보다 <b>" + fmt(Math.abs(r.money)) + "원</b> 덜 냅니다. " +
        (r.b.promo > 1 ? promoWord + "이라 개수는 " + r.b.totalQty + "개, 총 내용량은 " + fmt(r.b.totalContent) + unitText() + "입니다." : "총 내용량 " + fmt(r.b.totalContent) + unitText() + " 기준입니다.");
    } else {
      tone = "red"; badge = "🔴 B가 더 비쌉니다";
      title = promoWord + "인데 " + baseLabel() + " " + fmt1(d) + "% 더 비쌉니다";
      desc = "A " + fmt(r.a.perBase) + "원 → B <b>" + fmt(r.b.perBase) + "원</b> (" + baseLabel() + "). 개수는 " + r.b.totalQty + "개로 늘었지만 내용량이 " + fmt(r.b.totalContent) + unitText() + "뿐이라, 같은 양을 B로 사면 <b>" + fmt(Math.abs(r.money)) + "원 더 냅니다</b>. A를 사거나 다른 묶음을 찾으세요.";
    }
    return '<div class="verdict verdict--' + tone + '">' +
      '<span class="verdict__badge">' + badge + "</span>" +
      '<h3 class="verdict__title">' + title + "</h3>" +
      '<p class="verdict__desc">' + desc + "</p></div>";
  }

  function summaryHtml(r) {
    var tone = Math.abs(r.diff) <= 2 ? "amber" : r.diff < 0 ? "green" : "red";
    return '<div class="summary__card"><span class="summary__num">' + fmt(r.a.perBase) + '<span style="font-size:13px">원</span></span><span class="summary__label">A ' + baseLabel() + "</span></div>" +
      '<div class="summary__card summary__card--' + tone + '"><span class="summary__num">' + fmt(r.b.perBase) + '<span style="font-size:13px">원</span></span><span class="summary__label">B ' + baseLabel() + "</span></div>" +
      '<div class="summary__card summary__card--' + tone + '"><span class="summary__num">' + (r.diff > 0 ? "+" : "") + fmt1(r.diff) + '<span style="font-size:13px">%</span></span><span class="summary__label">B가 A보다</span></div>';
  }

  function barHtml(r) {
    var max = Math.max(r.a.perBase, r.b.perBase);
    return [r.a, r.b].map(function (p, i) {
      var w = Math.max(6, p.perBase / max * 100);
      return '<div class="load">' +
        '<div class="load__head"><span class="load__name">' + (i === 0 ? "🅰️ " : "🅱️ ") + esc(p.name) +
          "<span>" + fmt(p.price) + "원 · 총 " + p.totalQty + "개 · " + fmt(p.totalContent) + unitText() + "</span></span>" +
          '<span class="load__num">' + fmt(p.perBase) + "원<small>" + baseLabel() + "</small></span></div>" +
        '<div class="load__track"><span class="load__keep' + (p.perBase > (i === 0 ? r.b.perBase : r.a.perBase) ? " load__cut" : "") + '" style="width:' + w.toFixed(1) + '%"></span></div></div>';
    }).join("");
  }

  function tableHtml(r) {
    var rows = [
      { k: "가격", a: fmt(r.a.price) + "원", b: fmt(r.b.price) + "원" },
      { k: "총 수량", a: r.a.totalQty + "개", b: r.b.totalQty + "개" },
      { k: "총 용량", a: fmt(r.a.totalContent) + unitText(), b: fmt(r.b.totalContent) + unitText() },
      { k: "개당 가격", a: fmt(r.a.perUnit) + "원", b: fmt(r.b.perUnit) + "원" },
      { k: baseLabel(), a: "<b>" + fmt(r.a.perBase) + "원</b>", b: "<b>" + fmt(r.b.perBase) + "원</b>", hi: true }
    ];
    $("#cmpBody").innerHTML = rows.map(function (row) {
      return "<tr" + (row.hi ? ' class="is-best"' : "") + "><td><b>" + row.k + "</b></td><td>" + row.a + "</td><td>" + row.b + "</td></tr>";
    }).join("");
  }

  function moneyHtml(r) {
    var tone = r.money > 0 ? "var(--red)" : "var(--green)";
    $("#moneyMetrics").innerHTML =
      '<div class="metric"><span class="metric__label">B의 총 내용량</span><div class="metric__value">' + fmt(r.b.totalContent) + "<small>" + unitText() + "</small></div>" +
        '<div class="metric__sub">' + r.b.totalQty + "개 · B 가격 " + fmt(r.b.price) + "원</div></div>" +
      '<div class="metric"><span class="metric__label">같은 양을 A로 살 때</span><div class="metric__value">' + fmt(r.aCostForSame) + "<small>원</small></div>" +
        '<div class="metric__sub">A 단가 ' + fmt(r.a.perBase) + "원 × 같은 내용량</div></div>" +
      '<div class="metric metric--accent"><span class="metric__label">B를 고르면</span><div class="metric__value" style="color:' + tone + '">' + (r.money > 0 ? "+" : "−") + fmt(Math.abs(r.money)) + "<small>원</small></div>" +
        '<div class="metric__sub">' + (r.money > 0 ? "같은 양인데 더 냅니다" : "같은 양 기준 절약") + " · 월 2회면 연 " + fmt(Math.abs(r.money) * 24) + "원</div></div>";
    $("#moneyNote").innerHTML = r.money > 0
      ? "B는 개수가 많아 보이지만 <b>내용량 기준으로 " + fmt(Math.abs(r.money)) + "원 더 비쌉니다.</b> 묶음 상품은 개수가 아니라 <b>총 g·mL</b>로 비교해야 합니다."
      : "B가 같은 양 기준 <b>" + fmt(Math.abs(r.money)) + "원 저렴</b>합니다. 다만 다 먹을 수 있는 양인지, 유통기한이 남았는지 확인하세요.";
  }

  function trapHtml() {
    var items = [
      { cls: "plan__item--red", n: "1", t: "1+1은 용량이 줄어든 채로 나오기도", b: "개수만 2배고 1개 용량이 작아지면 100g당 단가는 오히려 오릅니다. 이 계산기가 잡아내는 대표 사례예요." },
      { cls: "plan__item--amber", n: "2", t: "유통기한 임박 재고", b: "1+1·대용량은 소비기한이 짧은 재고를 푸는 경우가 많습니다. 사기 전에 <b>소비기한</b>을 확인하세요." },
      { cls: "plan__item--red", n: "3", t: "g과 mL를 섞어 비교", b: "물은 1mL≈1g이지만 기름·세제·샴푸는 다릅니다. 단위가 다르면 100g과 100mL를 비교하면 안 됩니다." },
      { cls: "", n: "4", t: "개당 가격의 착시", b: "1개 용량이 다른데 개당만 보면 속습니다. 개수가 아니라 <b>총 내용량</b>을 보세요." },
      { cls: "", n: "5", t: "배송비·무료배송 기준", b: "묶음으로 금액을 채우려고 더 사는 경우, 배송비 몇 천 원이 단가 차이를 뒤집습니다. 결제액 기준으로 넣으세요." },
      { cls: "plan__item--amber", n: "6", t: "쿠폰·카드할인은 조건부", b: "첫 구매 쿠폰, 카드 즉시할인은 재구매 때 사라집니다. 반복 구매라면 할인 전 가격으로도 비교하세요." }
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
    $("#summaryBox").innerHTML = summaryHtml(r);
    $("#barList").innerHTML = barHtml(r);
    tableHtml(r);
    moneyHtml(r);
    trapHtml();
    $("#resultSub").textContent = r.a.name + " vs " + r.b.name + " · " + baseLabel() + " 기준";
    updateCount();
    if (scroll) $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateCount() {
    var a = readOne("a", state.aPromo);
    var b = readOne("b", state.bPromo);
    if (!a || !b) {
      $("#countText").textContent = "가격·용량을 넣으면 자동 계산";
      $("#countHint").textContent = "B가 진짜 싼지 판정해 드려요";
      return;
    }
    var d = (b.perBase - a.perBase) / a.perBase * 100;
    $("#countText").textContent = "A " + fmt(a.perBase) + "원 · B " + fmt(b.perBase) + "원";
    $("#countHint").textContent = Math.abs(d) <= 2 ? "거의 같은 단가예요" : d < 0 ? "B가 " + fmt1(Math.abs(d)) + "% 저렴" : "B가 " + fmt1(d) + "% 더 비쌈";
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
    var text = "A " + r.a.name + ": " + fmt(r.a.perBase) + "원/" + baseLabel() + "\n" +
      "B " + r.b.name + ": " + fmt(r.b.perBase) + "원/" + baseLabel() + "\n" +
      "판정: " + (Math.abs(r.diff) <= 2 ? "거의 같음" : r.diff < 0 ? "B가 " + fmt1(Math.abs(r.diff)) + "% 저렴" : "B가 " + fmt1(r.diff) + "% 더 비쌈") + "\n" +
      "같은 양 기준 차액: " + (r.money > 0 ? "+" : "−") + fmt(Math.abs(r.money)) + "원";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("결과를 복사했어요"); }, function () { toast("복사에 실패했어요"); });
    } else toast("복사가 지원되지 않는 브라우저예요");
  }

  function fillPreset(key) {
    var p = PRESETS[key];
    if (!p) return;
    setUnit(p.unit);
    ["a", "b"].forEach(function (k) {
      var d = p[k];
      $("#" + k + "-name").value = d.name;
      $("#" + k + "-price").value = d.price;
      if (p.unit !== "ea") $("#" + k + "-size").value = d.size;
      $("#" + k + "-qty").value = d.qty;
    });
    state.aPromo = p.a.promo;
    state.bPromo = p.b.promo;
    $$("#aPromo .seg__btn").forEach(function (b) {
      var on = parseInt(b.dataset.promo, 10) === p.a.promo;
      b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $$("#bPromo .seg__btn").forEach(function (b) {
      var on = parseInt(b.dataset.promo, 10) === p.b.promo;
      b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $$(".preset").forEach(function (x) { x.classList.remove("is-active"); });
    var btn = document.querySelector('.preset[data-preset="' + key + '"]');
    if (btn) btn.classList.add("is-active");
    updateCount();
    analyze(false);
  }

  function init() {
    initTheme();

    $$("#unitSeg .seg__btn").forEach(function (b) {
      b.addEventListener("click", function () { setUnit(b.dataset.unit); schedule(); });
    });
    [["a", "aPromo"], ["b", "bPromo"]].forEach(function (pair) {
      var k = pair[0], segId = pair[1];
      $$("#" + segId + " .seg__btn").forEach(function (b) {
        b.addEventListener("click", function () {
          $$("#" + segId + " .seg__btn").forEach(function (x) { x.classList.remove("is-on"); x.setAttribute("aria-pressed", "false"); });
          b.classList.add("is-on"); b.setAttribute("aria-pressed", "true");
          state[k + "Promo"] = parseInt(b.dataset.promo, 10);
          updateCount(); schedule();
        });
      });
    });

    ["a-name", "a-price", "a-size", "a-qty", "b-name", "b-price", "b-size", "b-qty"].forEach(function (id) {
      var el = $("#" + id);
      el.addEventListener("input", function () {
        $$(".preset").forEach(function (x) { x.classList.remove("is-active"); });
        updateCount(); schedule();
      });
      el.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); analyze(true); } });
    });

    $$(".preset").forEach(function (b) {
      b.addEventListener("click", function () { fillPreset(b.dataset.preset); });
    });

    $("#analyzeBtn").addEventListener("click", function () { analyze(true); });
    $("#resetBtn").addEventListener("click", function () {
      ["a", "b"].forEach(function (k) {
        $("#" + k + "-name").value = ""; $("#" + k + "-price").value = "";
        $("#" + k + "-size").value = ""; $("#" + k + "-qty").value = "1";
      });
      state.aPromo = 1; state.bPromo = 1;
      [["aPromo"], ["bPromo"]].forEach(function (p) {
        $$("#" + p[0] + " .seg__btn").forEach(function (x, i) { x.classList.toggle("is-on", i === 0); x.setAttribute("aria-pressed", i === 0 ? "true" : "false"); });
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
    setUnit("g");
    updateCount();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
