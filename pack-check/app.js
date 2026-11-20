/* ==========================================================================
   팩트체크 건강연구소 · 여행 일수별 캐리어 무게 & 상비약 패킹 체크기
   무게: 의류·소지품 평균값(g) 기반 추정 · 체크 상태는 localStorage 저장
   ⚠️ 위탁·기내 허용량, 액체류 규정은 항공사·공항 안내가 우선.
   ========================================================================== */

(function () {
  "use strict";

  var STORE = "fcl-pack-v1";

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  function fmt(n) { return Math.round(n).toLocaleString("ko-KR"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function kg(g) { return (Math.round(g / 100) / 10).toFixed(1); }

  var state = { days: 3, season: "mild", bag: "both", wash: 1, style: "casual", gear: 0 };
  var checked = {};
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

  function loadChecks() {
    try {
      var raw = localStorage.getItem(STORE);
      if (raw) { var o = JSON.parse(raw); if (o && o.checked) checked = o.checked; }
    } catch (e) { checked = {}; }
  }
  function saveChecks() {
    try { localStorage.setItem(STORE, JSON.stringify({ checked: checked, savedAt: new Date().toISOString() })); } catch (e) {}
  }

  /* ── 짐 계산 ─────────────────────────────────────────── */
  function compute() {
    var d = state.days, nights = Math.max(1, d - 1);
    var wash = state.wash === 1;
    var shirts = wash ? Math.max(2, Math.ceil(d * 0.65)) : d;
    var pants = Math.max(1, Math.ceil(d / 3));
    var under = d + 1;
    var socks = d + 1;
    var pj = Math.min(nights, 2);
    var rows = [];

    function add(name, q, unit, note) { if (q > 0) rows.push({ n: name, q: q, unit: unit, total: q * unit, note: note || "" }); }

    add("상의 (티·셔츠)", shirts, 200, wash ? "세탁 가능 → 2일에 1벌" : "세탁 어려움 → 하루 1벌");
    add("하의", pants, 400, "3일에 1벌");
    add("속옷", under, 50, "일수+1");
    add("양말", socks, 50, "일수+1");
    if (state.season === "winter") {
      add("아우터 (코트·패딩)", 1, 1400, "겨울 필수");
      add("니트·기모 상의", 2, 300, "겹쳐 입기");
      add("목도리·장갑", 1, 200, "");
    } else if (state.season === "mild") {
      add("자켓·가디건", 1, 700, "일교차 대비");
    } else {
      add("얇은 가디건", 1, 300, "실내 냉방 대비");
      add("모자·선글라스", 1, 150, "");
      add("접이식 우산", 1, 250, "여름 소나기");
    }
    add("잠옷", pj, 250, "숙소에 없을 수 있음");
    add("여분 신발", 1, 800, "신고 가는 것 제외");

    if (state.style === "work") {
      add("단정한 셔츠·구두", 2, 500, "미팅·식사");
    } else if (state.style === "active") {
      add("운동복·트레킹화", 1, 900, "액티비티");
    }

    add("세면도구", 1, 500, "고체 제품이면 더 가벼움");
    add("액체류 파우치 (100mL)", 1, 300, "기내 반입분");
    add("상비약 세트", 1, 300, "");
    add("영양제 (파우치 분량)", 1, 120, "비타민D·유산균·오메가3");
    add("충전기·케이블", 1, 300, "");
    add("보조배터리", 1, 200, "기내 휴대만");
    add("서류·지갑", 1, 100, "여권·예약 확인");
    if (state.gear === 1) add("노트북", 1, 1300, "기내 가방 권장");
    if (state.gear === 2) add("카메라", 1, 800, "");

    var total = rows.reduce(function (a, r) { return a + r.total; }, 0);
    var carryG = 300 + 300 + 120 + 300 + 100 + (state.gear === 1 ? 1300 : state.gear === 2 ? 800 : 0) + 200 + 250;
    var carrier = state.bag === "cabin" ? 2500 : 4500;
    var limit = state.bag === "cabin" ? 10000 : 23000;
    var packed = total + carrier;
    var checkedIn = state.bag === "cabin" ? packed : total - carryG + carrier;

    return {
      rows: rows, total: total, carrier: carrier, packed: packed, carryG: carryG,
      checkedIn: checkedIn, limit: limit, days: d, nights: nights,
      shirts: shirts, pants: pants, under: under, socks: socks
    };
  }

  /* ── 체크리스트 항목 ──────────────────────────────────── */
  function sectionsOf(r) {
    return [
      {
        title: "👕 의류", sub: r.days + "일 · " + (state.wash ? "세탁 가능" : "세탁 어려움"),
        items: [
          { id: "c-shirts", n: "상의 " + r.shirts + "벌", s: state.wash ? "2일에 1벌 + 여유" : "하루 1벌" },
          { id: "c-pants", n: "하의 " + r.pants + "벌", s: "3일에 1벌" },
          { id: "c-under", n: "속옷 " + r.under + "장", s: "일수+1" },
          { id: "c-socks", n: "양말 " + r.socks + "켤레", s: "일수+1" },
          { id: "c-outer", n: state.season === "winter" ? "코트·패딩" : state.season === "mild" ? "자켓·가디건" : "얇은 가디건", s: "계절 대비" },
          { id: "c-pj", n: "잠옷 " + Math.min(r.nights, 2) + "벌", s: "숙소에 없을 수 있음" },
          { id: "c-shoes", n: "여분 신발 1켤레", s: "많이 걸을 여행이면 필수" }
        ]
      },
      {
        title: "💊 상비약 · 영양제", sub: "원래 용기 · 처방전",
        items: [
          { id: "m-looper", n: "지사제 (로페라마이드)", s: "2~3정 · 고열·혈변 땐 금지" },
          { id: "m-pain", n: "진통·해열 (아세트아미노펜)", s: "4~6정" },
          { id: "m-digest", n: "소화제·제산제", s: "1~2회분" },
          { id: "m-allergy", n: "알레르기약", s: "졸림 적은 2세대" },
          { id: "m-band", n: "밴드 · 소독티슈 · 연고", s: "가벼운 상처용" },
          { id: "m-rx", n: "처방약 1.5배 + 처방전", s: "주사제는 보냉백" },
          { id: "m-supp", n: "영양제 파우치", s: "비타민D·유산균·오메가3" }
        ]
      },
      {
        title: "🧴 세면 · 액체류", sub: "기내는 100mL 규격",
        items: [
          { id: "l-bag", n: "1L 지퍼백 + 100mL 용기", s: "1인 1개" },
          { id: "l-tooth", n: "칫솔·치약(고체 또는 100mL)", s: "" },
          { id: "l-foam", n: "면도기·면도 foam 대신 비누", s: "액체 줄이기" },
          { id: "l-sun", n: "선크림 (여름)", s: "100mL 이하" },
          { id: "l-mask", n: "마스크·물티슈", s: "" }
        ]
      },
      {
        title: "🔌 전자기기", sub: "배터리는 기내",
        items: [
          { id: "e-charger", n: "충전기·케이블", s: "멀티 충전기면 하나로" },
          { id: "e-battery", n: "보조배터리", s: "위탁 금지 · 기내만" },
          { id: "e-adapter", n: "해외 여행이면 변환 어댑터", s: "국가별 플러그" },
          { id: "e-ear", n: "이어폰·이어플러그", s: "기내 소음" },
          { id: "e-laptop", n: state.gear === 1 ? "노트북 + 충전기" : "", s: "기내 가방에" },
          { id: "e-cam", n: state.gear === 2 ? "카메라 + 여분 배터리" : "", s: "배터리 기내" }
        ].filter(function (x) { return x.n; })
      },
      {
        title: "📄 서류 · 마무리", sub: "출발 전 확인",
        items: [
          { id: "d-pass", n: "여권·신분증", s: "유효기간 6개월 이상" },
          { id: "d-book", n: "항공권·숙소 예약 확인", s: "오프라인 저장" },
          { id: "d-ins", n: "여행자 보험", s: "해외는 필수에 가깝게" },
          { id: "d-cash", n: "현금·카드(해외결제)", s: "소액권 섞어서" },
          { id: "d-home", n: "집 전원·가스·창문 확인", s: "나가기 전 1분" },
          { id: "d-bag", n: "위탁 짐 무게 재기", s: "체중계로 미리" }
        ]
      }
    ];
  }

  function analyze(scroll) {
    var r = compute();
    var ratio = r.packed / r.limit;
    var tone = ratio <= 0.7 ? "green" : ratio <= 0.95 ? "amber" : "red";
    var badge = tone === "green" ? "🟢 여유 있어요" : tone === "amber" ? "🟡 한도에 가까워요" : "🔴 한도 초과";
    var title = r.days + "일 여행 → 캐리어 약 " + kg(r.packed) + "kg";
    var desc = (state.bag === "cabin" ? "기내만" : "위탁 + 기내") + " 기준 한도 " + kg(r.limit) + "kg 중 <b>" +
      Math.round(ratio * 100) + "%</b>를 씁니다. " +
      (state.bag === "both" ? "위탁 짐은 약 <b>" + kg(r.checkedIn) + "kg</b>, 기내 가방은 약 <b>" + kg(r.carryG) + "kg</b>으로 나누면 됩니다." :
        "캐리어 자체 무게(" + kg(r.carrier) + "kg)까지 포함한 값입니다.");

    if (tone === "red") {
      desc += " <b>1~2kg을 줄여야 합니다.</b> 신발 한 켤레를 신고 가거나, 세면도구를 고체로 바꾸면 1kg 이상 줄어요.";
    } else if (tone === "amber") {
      desc += " 기념품·면세품 무게를 남겨두려면 <b>0.5~1kg</b>은 비워 두세요.";
    }

    $("#resultSub").innerHTML = r.days + "일 · " + (state.wash ? "세탁 가능" : "세탁 어려움") + " · " +
      ({ mild: "봄·가을", summer: "여름", winter: "겨울" })[state.season] + " 기준입니다.";

    $("#verdictBox").innerHTML =
      '<div class="verdict verdict--' + tone + '">' +
      '<span class="verdict__badge">' + badge + "</span>" +
      '<div class="verdict__title">' + title + "</div>" +
      '<div class="verdict__desc">' + desc + "</div></div>";

    $("#summaryBox").innerHTML = [
      { label: "짐 무게", num: kg(r.total), unit: "kg", cls: tone },
      { label: "캐리어 포함", num: kg(r.packed), unit: "kg", cls: tone },
      { label: "남은 여유", num: kg(Math.max(0, r.limit - r.packed)), unit: "kg", cls: tone === "green" ? "green" : "amber" },
      { label: "품목", num: String(r.rows.length), unit: "종", cls: "green" }
    ].map(function (c) {
      return '<div class="summary__card summary__card--' + c.cls + '"><span class="summary__label">' + c.label + "</span>" +
        '<span class="summary__num">' + c.num + "<small>" + c.unit + "</small></span></div>";
    }).join("");

    /* 무게 표 */
    $("#weightBody").innerHTML = r.rows.map(function (row) {
      return "<tr><td>" + esc(row.n) + (row.note ? '<span class=\"muted\" style=\"display:block;font-size:10.6px\">' + esc(row.note) + "</span>" : "") +
        "</td><td>" + row.q + "</td><td>" + fmt(row.unit) + "g</td><td>" + fmt(row.total) + "g</td></tr>";
    }).join("") +
      "<tr><th scope=\"row\">캐리어 자체</th><td>1</td><td>" + fmt(r.carrier) + "g</td><td>" + fmt(r.carrier) + "g</td></tr>" +
      "<tr><th scope=\"row\">합계</th><td>—</td><td>—</td><td><b>" + fmt(r.packed) + "g</b></td></tr>";

    $("#weightHint").innerHTML = "한도는 " + (state.bag === "cabin" ? "기내 10kg(항공사별 7~12kg)" : "위탁 23kg") +
      " 기준입니다. 실제로는 저울 앞에서 <b>" + kg(r.packed) + "kg</b> 전후가 나옵니다(옷 재질·신발에 따라 ±1kg).";

    /* 체크리스트 */
    var secs = sectionsOf(r);
    var totalItems = secs.reduce(function (a, s) { return a + s.items.length; }, 0);
    var doneItems = secs.reduce(function (a, s) {
      return a + s.items.filter(function (i) { return checked[i.id]; }).length;
    }, 0);

    $("#progressBox").innerHTML =
      '<div class="meter" style="margin-top:0">' +
      '<div class="meter__head"><span class="meter__title">패킹 진행률<small>' + doneItems + " / " + totalItems + "개 체크</small></span>" +
      '<span class="meter__value">' + Math.round(doneItems / totalItems * 100) + "<small>%</small></span></div>" +
      '<div class="meter__track"><div class="meter__fill"><span class="meter__seg meter__seg--ok" style="width:' +
      (doneItems / totalItems * 100).toFixed(1) + '%"></span></div></div></div>';

    $("#packList").innerHTML = secs.map(function (s) {
      var done = s.items.filter(function (i) { return checked[i.id]; }).length;
      return '<div class="fcard" style="box-shadow:none">' +
        '<div class="fcard__head"><span class="fcard__icon">' + s.title.split(" ")[0] + "</span>" +
        '<h3 class="fcard__title">' + s.title.replace(/^[^\s]+\s/, "") + "</h3>" +
        '<span class="fcard__note">' + done + "/" + s.items.length + " · " + s.sub + "</span></div>" +
        '<div class="items">' + s.items.map(function (i) {
          return '<label class="item"><input type="checkbox" data-check="' + i.id + '"' + (checked[i.id] ? " checked" : "") + ' aria-label="' + esc(i.n) + '">' +
            '<span class="item__box" aria-hidden="true"></span>' +
            '<span class="item__text"><span class="item__name">' + esc(i.n) + "</span>" +
            (i.s ? '<span class="item__sub">' + esc(i.s) + "</span>" : "") + "</span></label>";
        }).join("") + "</div></div>";
    }).join("");

    $$("#packList input").forEach(function (el) {
      el.addEventListener("change", function () {
        if (el.checked) checked[el.dataset.check] = true; else delete checked[el.dataset.check];
        saveChecks();
        refreshProgress(secs);
      });
    });

    last = { r: r, tone: tone, secs: secs, totalItems: totalItems };
    if ($("#result").hidden) {
      $("#result").hidden = false;
      if (scroll) $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function refreshProgress(secs) {
    var total = secs.reduce(function (a, s) { return a + s.items.length; }, 0);
    var done = secs.reduce(function (a, s) { return a + s.items.filter(function (i) { return checked[i.id]; }).length; }, 0);
    var box = $("#progressBox").querySelector(".meter__title small");
    if (box) box.textContent = done + " / " + total + "개 체크";
    var val = $("#progressBox").querySelector(".meter__value");
    if (val) val.innerHTML = Math.round(done / total * 100) + "<small>%</small>";
    var fill = $("#progressBox").querySelector(".meter__seg");
    if (fill) fill.style.width = (done / total * 100).toFixed(1) + "%";
    $$("#packList .fcard").forEach(function (card, idx) {
      var s = secs[idx];
      var d = s.items.filter(function (i) { return checked[i.id]; }).length;
      var note = card.querySelector(".fcard__note");
      if (note) note.textContent = d + "/" + s.items.length + " · " + s.sub;
    });
    $("#countText").textContent = "체크 " + done + " / " + total;
  }

  function schedule_() {
    clearTimeout(timer);
    timer = setTimeout(function () { analyze(false); }, 180);
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
    var lines = ["【" + last.r.days + "일 패킹 체크리스트】"];
    last.secs.forEach(function (s) {
      lines.push("\n[" + s.title.replace(/^[^\s]+\s/, "") + "]");
      s.items.forEach(function (i) {
        lines.push((checked[i.id] ? "☑ " : "☐ ") + i.n);
      });
    });
    lines.push("\n예상 무게 " + kg(last.r.packed) + "kg (한도 " + kg(last.r.limit) + "kg)");
    var text = lines.join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("체크리스트를 복사했어요"); }, function () { toast("복사에 실패했어요"); });
    } else toast("복사가 지원되지 않는 브라우저예요");
  }

  function init() {
    initTheme();
    loadChecks();

    $$("#daysSeg .seg__btn").forEach(function (b) {
      b.addEventListener("click", function () {
        $$("#daysSeg .seg__btn").forEach(function (x) { x.classList.remove("is-on"); x.setAttribute("aria-pressed", "false"); });
        b.classList.add("is-on"); b.setAttribute("aria-pressed", "true");
        state.days = parseInt(b.dataset.v, 10);
        updateCount(); analyze(false);
      });
    });

    [["#seasonSeg", "season"], ["#bagSeg", "bag"], ["#washSeg", "wash"], ["#styleSeg", "style"], ["#gearSeg", "gear"]].forEach(function (pair) {
      $$(pair[0] + " .seg__btn").forEach(function (b) {
        b.addEventListener("click", function () {
          $$(pair[0] + " .seg__btn").forEach(function (x) { x.classList.remove("is-on"); x.setAttribute("aria-pressed", "false"); });
          b.classList.add("is-on"); b.setAttribute("aria-pressed", "true");
          var v = b.dataset.v;
          state[pair[1]] = (pair[1] === "wash" || pair[1] === "gear") ? parseInt(v, 10) : v;
          updateCount(); schedule_();
        });
      });
    });

    $("#analyzeBtn").addEventListener("click", function () { analyze(true); });
    $("#resetBtn").addEventListener("click", function () {
      if (!Object.keys(checked).length) { toast("체크한 항목이 없어요"); return; }
      checked = {};
      saveChecks();
      if (last) analyze(false);
      toast("체크를 모두 지웠어요");
    });
    $("#copyBtn").addEventListener("click", copyResult);
    $("#editBtn").addEventListener("click", function () { $("#checker").scrollIntoView({ behavior: "smooth", block: "start" }); });

    var y = $("#year");
    if (y) y.textContent = String(new Date().getFullYear());
    updateCount();
  }

  function updateCount() {
    $("#countText").textContent = state.days + "일 여행 · " + (state.bag === "cabin" ? "기내만" : "위탁+기내");
    $("#countHint").textContent = Object.keys(checked).length ? "체크 " + Object.keys(checked).length + "개 저장됨" : "체크리스트는 브라우저에 자동 저장됩니다";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
