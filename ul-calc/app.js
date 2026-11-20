/* ==========================================================================
   팩트체크 건강연구소 · 영양제 1일 상한선(UL) 합산기
   제품 여러 개의 성분 함량을 합산해 UL 대비 %를 계산합니다.
   --------------------------------------------------------------------------
   ⚠️ UL 값은 「2020 한국인 영양소 섭취기준」과 미국 NIH ODS 공개 자료를
   그대로 옮긴 '참고용' 기준입니다. 진단·처방이 아닙니다.
   ========================================================================== */

(function () {
  "use strict";

  var BLOG = "https://blog.naver.com/hjh7085/";

  var COLUMNS = [
    { url: BLOG + "224474970152", tag: "성분 해부", title: "아연만 고용량 먹으면 빈혈 온다? 아연과 구리 15:1 황금비율 팩트" },
    { url: BLOG + "224477169582", tag: "1분 논문 팩트", title: "눈 밑 떨림, 마그네슘 먹어도 안 멈추는 이유 — 산화 vs 글리시네이트" },
    { url: BLOG + "224474981968", tag: "성분 해부", title: "8만 원 노르딕 vs 3만 원 CGN 오메가3 — rTG 성분표 솔직 해부" },
    { url: BLOG + "224477176691", tag: "성분 해부", title: "아침 공복 속쓰림에 양배추즙 vs 매스틱검 vs 카베진 성분 해부" },
    { url: BLOG + "224476159368", tag: "성분 해부", title: "만성 피로·간 수치 잡는 밀크씨슬: 쏜 S.A.T. vs 나우푸드 흡수율 해부" },
    { url: BLOG + "224474930562", tag: "성분 해부", title: "마운자로 속쓰림·명치 막힘 뚫는 법: 소화효소 2종 솔직 비교" }
  ];

  /* ------------------------------------------------------------- 영양소 정의 */
  var NUTRIENTS = [
    { id: "vitD", name: "비타민D", short: "비타민D", unit: "IU", kr: 4000, us: 4000, hint: "1µg = 40IU",
      risk: "고칼슘혈증(메스꺼움·변비·다뇨·혼동), 신장결석, 신기능 악화",
      act: "매일 복용이면 하루 합계를, 주 1회 고용량이면 주간 합계를 4,000IU×7로 따져보세요. 초과 시 격일 복용으로 바꾸는 방법이 흔합니다.",
      src: "KDRI 2020 · NIH ODS" },
    { id: "zinc", name: "아연", short: "아연", unit: "mg", kr: 35, us: 40, hint: "라벨 '아연' 또는 '산화아연 40mg(아연 32mg)'",
      risk: "구리 결핍(빈혈·백혈구 감소·손발 저림), HDL 콜레스테롤 감소, 위장 장애",
      act: "35mg 이상을 몇 달 먹을 계획이라면 구리 1~2mg을 함께 챙기세요. 감기 트로키는 3~5일 단기로만 쓰는 것이 안전합니다.",
      src: "KDRI 2020 (35mg) · NIH ODS (40mg)" },
    { id: "mag", name: "마그네슘", short: "마그네슘", unit: "mg", kr: 350, us: 350, hint: "보충제 기준(식품 제외)",
      risk: "설사·복통, 저혈압, 신장 기능이 나쁘면 고마그네슘혈증",
      act: "산화마그네슘은 흡수율이 낮고 설사가 잦습니다. 350mg을 넘긴다면 글리시네이트·트레오네이트처럼 원소량 대비 부피가 큰 형태로 나눠 드세요.",
      src: "KDRI 2020 · NIH ODS (보충제 기준)" },
    { id: "vitC", name: "비타민C", short: "비타민C", unit: "mg", kr: 2000, us: 2000, hint: "서방형·분말 포함",
      risk: "복통·설사 등 위장관 장애, 신장결석(감수성 있는 사람)",
      act: "1,000mg을 한 번에 먹기보다 아침·저녁으로 나누면 흡수율이 좋고 위장관 부담이 적습니다.",
      src: "KDRI 2020 · NIH ODS" },
    { id: "iron", name: "철분", short: "철분", unit: "mg", kr: 45, us: 45, hint: "원소 철 기준(mg)",
      risk: "위장 장애·변비·흑변, 철 과잉축적(혈색소침착증 위험자)",
      act: "공복 흡수가 좋지만 속이 쓰리면 식후로. 비타민C와 함께 먹으면 흡수가 올라가고, 우유·커피·차는 1시간 피하세요.",
      src: "KDRI 2020 · NIH ODS" },
    { id: "vitA", name: "비타민A", short: "비타민A", unit: "µg RAE", kr: 3000, us: 3000, hint: "레티놀 기준 · β-카로틴은 제외",
      risk: "두통·피부 건조·간 손상, 임신 중 기형 위험",
      act: "레티놀로 3,000µg RAE를 넘겼다면 β-카로틴 제품으로 바꾸는 편이 안전합니다. 임신을 계획 중이라면 1,500µg 아래로 낮추고 의사와 상의하세요.",
      src: "KDRI 2020 · NIH ODS" },
    { id: "vitE", name: "비타민E", short: "비타민E", unit: "mg α-TE", kr: 540, us: 1000, hint: "d-α-토코페롤 기준",
      risk: "출혈 경향 증가(특히 항응고제·아스피린 복용자), 수술 전 출혈",
      act: "항응고제를 먹는다면 고용량 비타민E는 피하세요. 수술·시술 예정이면 2주 전 중단을 의사와 상의합니다.",
      src: "KDRI 2020 (540mg) · NIH ODS (1,000mg)" },
    { id: "vitB6", name: "비타민B6", short: "비타민B6", unit: "mg", kr: 100, us: 100, hint: "피리독신 기준",
      risk: "감각신경병증 — 손발 저림·감각 둔화(장기 고용량에서 보고)",
      act: "100mg은 '넘지 말아야 할 선'입니다. 장기 복용은 50mg 이하가 안전하고, 손발 저림이 생기면 바로 중단하세요.",
      src: "KDRI 2020 · NIH ODS" },
    { id: "selenium", name: "셀레늄", short: "셀레늄", unit: "µg", kr: 400, us: 400, hint: "셀렌산나트륨·셀레노메티오닌 모두",
      risk: "탈모, 손톱 변형·부서짐, 마늘 냄새 호흡, 위장 장애",
      act: "브라질너트 1~2알에 셀레늄이 70~90µg 들어 있습니다. 종합비타민과 겹치면 너트 섭취량부터 줄이세요.",
      src: "KDRI 2020 · NIH ODS" },
    { id: "folate", name: "엽산", short: "엽산", unit: "µg", kr: 1000, us: 1000, hint: "합성 엽산(보충제) 기준",
      risk: "비타민B12 결핍을 가려 신경 손상이 진행돼도 모르게 함",
      act: "1,000µg을 넘겨 먹는다면 B12 수치를 함께 확인하세요. 고령·메트포르민 장기 복용자는 B12 결핍 위험이 큽니다.",
      src: "KDRI 2020 · NIH ODS (보충제 기준)" }
  ];

  var MAX_PRODUCTS = 6;
  var products = [];
  var std = "kr";
  var uid = 0;

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function num(v) { var n = parseFloat(v); return isFinite(n) && n > 0 ? n : 0; }
  function fmt(n) { return Math.round(n).toLocaleString("ko-KR"); }
  function fmt1(n) { return (Math.round(n * 10) / 10).toLocaleString("ko-KR"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function ulOf(n) { return std === "kr" ? n.kr : n.us; }

  /* --------------------------------------------------------------- 제품 카드 */
  function newProduct(name) {
    var p = { key: "p" + (++uid), name: name || "", vals: {} };
    NUTRIENTS.forEach(function (n) { p.vals[n.id] = ""; });
    products.push(p);
    return p;
  }

  function productCard(p, idx) {
    var fields = NUTRIENTS.map(function (n) {
      return '<label class="field nfield">' +
        '<span class="field__label">' + n.short + '</span>' +
        '<span class="input-wrap">' +
        '<input class="input input--sm" type="number" inputmode="decimal" min="0" step="any" data-key="' + p.key + '" data-nut="' + n.id + '" value="' + esc(p.vals[n.id]) + '" placeholder="—" aria-label="' + n.short + ' 함량" autocomplete="off">' +
        '<span class="input__unit">' + n.unit + '</span>' +
        '</span>' +
        '</label>';
    }).join("");

    return '<div class="fcard prod" data-card="' + p.key + '">' +
      '<div class="prod__head">' +
      '<span class="prod__idx">' + (idx + 1) + '</span>' +
      '<input class="prod__name" type="text" data-key="' + p.key + '" data-role="name" value="' + esc(p.name) + '" placeholder="제품 이름 (예: 종합비타민)" aria-label="제품 이름" maxlength="24" autocomplete="off">' +
      '<button class="prod__del" type="button" data-key="' + p.key + '" aria-label="이 제품 삭제">✕</button>' +
      '</div>' +
      '<div class="ninputs">' + fields + '</div>' +
      '</div>';
  }

  function renderProducts() {
    var host = $("#products");
    host.innerHTML = products.map(productCard).join("");
    if (products.length >= MAX_PRODUCTS) $("#addBtn").disabled = true;
    else $("#addBtn").disabled = false;
    $("#addBtn").textContent = products.length >= MAX_PRODUCTS ? "제품은 6개까지" : "+ 제품 추가";
  }

  function bindProductInputs() {
    var host = $("#products");
    host.addEventListener("input", function (e) {
      var t = e.target;
      var key = t.getAttribute("data-key");
      if (!key) return;
      var p = products.filter(function (x) { return x.key === key; })[0];
      if (!p) return;
      if (t.getAttribute("data-role") === "name") {
        p.name = t.value;
      } else {
        var nut = t.getAttribute("data-nut");
        if (nut) p.vals[nut] = t.value;
      }
      $("#countText").textContent = "입력 중…";
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () { analyze(false); }, 260);
    });
    host.addEventListener("click", function (e) {
      var btn = e.target.closest(".prod__del");
      if (!btn) return;
      var key = btn.getAttribute("data-key");
      products = products.filter(function (x) { return x.key !== key; });
      if (!products.length) newProduct("");
      renderProducts();
      analyze(false);
    });
    host.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); analyze(true); }
    });
  }

  /* ------------------------------------------------------------------ 계산 */
  var debounceTimer = null;
  var lastResult = null;

  function collect() {
    var sums = {};
    var sources = {};
    NUTRIENTS.forEach(function (n) { sums[n.id] = 0; sources[n.id] = []; });
    products.forEach(function (p, i) {
      var label = (p.name || "").trim() || ("제품 " + (i + 1));
      NUTRIENTS.forEach(function (n) {
        var v = num(p.vals[n.id]);
        if (v > 0) {
          sums[n.id] += v;
          sources[n.id].push({ label: label, value: v });
        }
      });
    });
    return { sums: sums, sources: sources };
  }

  function analyze(scroll) {
    var s = collect();
    var rows = NUTRIENTS.map(function (n) {
      var sum = s.sums[n.id];
      var ul = ulOf(n);
      return { n: n, sum: sum, ul: ul, pct: sum > 0 ? (sum / ul) * 100 : 0, parts: s.sources[n.id] };
    }).filter(function (r) { return r.sum > 0; });

    if (!rows.length) {
      $("#result").hidden = true;
      lastResult = null;
      $("#countText").textContent = "성분을 넣으면 자동 합산";
      $("#countHint").textContent = "입력하는 즉시 UL 대비 %가 바뀝니다";
      return;
    }

    rows.sort(function (a, b) { return b.pct - a.pct; });
    var over = rows.filter(function (r) { return r.pct > 100; });
    var near = rows.filter(function (r) { return r.pct >= 70 && r.pct <= 100; });
    var top = rows[0];

    lastResult = { rows: rows, over: over, near: near, top: top };

    $("#resultSub").textContent = products.filter(function (p) {
      return NUTRIENTS.some(function (n) { return num(p.vals[n.id]) > 0; });
    }).length + "개 제품 · " + rows.length + "개 성분 합산 · " +
      (std === "kr" ? "한국 KDRI 2020 기준" : "미국 NIH ODS 기준");

    /* 판정 카드 */
    var box;
    if (over.length) {
      box = '<div class="verdict verdict--red">' +
        '<span class="verdict__badge">🔴 UL 초과 ' + over.length + "개</span>" +
        '<p class="verdict__title">' + over.map(function (r) { return r.n.short + " " + fmt(r.pct) + "%"; }).join(" · ") + "</p>" +
        '<p class="verdict__desc">' + (std === "kr" ? "한국" : "미국") + " 성인 상한섭취량을 넘었습니다. 한 번 넘긴 것으로 급성 중독이 되는 값은 아니지만, <b>매일 이 상태가 유지되면</b> 누적 위험이 생깁니다. 아래 초과 항목에서 어느 제품이 원인인지 확인하고 조정하세요.</p>" +
        "</div>";
    } else if (near.length) {
      box = '<div class="verdict verdict--amber">' +
        '<span class="verdict__badge">🟡 경계 ' + near.length + "개</span>" +
        '<p class="verdict__title">UL의 70% 이상 — 여유가 없습니다</p>' +
        '<p class="verdict__desc">' + near.map(function (r) { return "<b>" + r.n.short + " " + fmt(r.pct) + "%</b>"; }).join(", ") + "는 음식으로 먹는 양이 더해지면 UL에 닿을 수 있습니다. 제품을 하나 줄이거나 격일 복용으로 바꾸면 여유가 생깁니다.</p>" +
        "</div>";
    } else {
      box = '<div class="verdict verdict--green">' +
        '<span class="verdict__badge">🟢 여유 있음</span>' +
        '<p class="verdict__title">합산해도 UL의 ' + fmt(top.pct) + "% 수준입니다</p>" +
        '<p class="verdict__desc">넣은 성분 중 가장 높은 항목이 <b>' + top.n.short + " " + fmt(top.pct) + "%</b>입니다. 다만 이 계산은 보충제 함량만 더한 값이라, 식사로 먹는 양은 포함되지 않습니다.</p>" +
        "</div>";
    }
    $("#verdictBox").innerHTML = box;

    /* 요약 지표 */
    var maxPct = top.pct;
    $("#metricRow").innerHTML =
      metric("넘은 항목", over.length + "개", over.length ? "조정 필요" : "없음", over.length ? "bad" : "ok") +
      metric("경계(70~100%)", near.length + "개", near.length ? "여유 없음" : "없음", near.length ? "warn" : "ok") +
      metric("최고 비율", fmt(maxPct) + "%", top.n.short, maxPct > 100 ? "bad" : maxPct >= 70 ? "warn" : "ok");

    /* 막대 그래프 */
    $("#bars").innerHTML = rows.map(function (r) {
      var pct = r.pct;
      var cls = pct > 100 ? "is-red" : pct >= 70 ? "is-amber" : "is-green";
      var scale = Math.max(r.ul * 1.25, r.sum * 1.02);
      var fillW = Math.min(100, (r.sum / scale) * 100);
      var markLeft = Math.min(100, (r.ul / scale) * 100);
      var parts = r.parts.map(function (p) { return esc(p.label) + " " + fmt1(p.value) + r.n.unit; }).join(" + ");
      return '<div class="bar ' + cls + '">' +
        '<div class="bar__top">' +
        '<span class="bar__name">' + r.n.name + '</span>' +
        '<span class="bar__pct">' + fmt(pct) + '%</span>' +
        '</div>' +
        '<div class="bar__track"><span class="bar__fill" style="width:' + fillW.toFixed(2) + '%"></span><span class="bar__ul" style="left:' + markLeft.toFixed(2) + '%" aria-hidden="true"></span></div>' +
        '<div class="bar__sub"><b>' + fmt1(r.sum) + " " + r.n.unit + "</b> / UL " + fmt(r.ul) + " " + r.n.unit + " · " + parts + "</div>" +
        "</div>";
    }).join("");

    /* 초과 경고 */
    if (over.length) {
      $("#warnBlock").hidden = false;
      $("#warnArea").innerHTML = over.map(function (r, i) {
        return '<div class="plan__item plan__item--red">' +
          '<span class="plan__num">' + (i + 1) + "</span>" +
          "<div>" +
          '<p class="plan__title">' + r.n.name + " " + fmt1(r.sum) + " " + r.n.unit + " — UL의 " + fmt(r.pct) + "%</p>" +
          '<p class="plan__body"><b>왜 조정하나</b> · ' + r.n.risk + "</p>" +
          '<p class="plan__body"><b>오늘 할 일</b> · ' + r.n.act + "</p>" +
          '<p class="plan__body plan__now">기여 제품 · ' + r.parts.map(function (p) { return esc(p.label) + " " + fmt1(p.value) + r.n.unit; }).join(", ") + "</p>" +
          "</div></div>";
      }).join("");
    } else {
      $("#warnBlock").hidden = true;
    }

    /* 전체 표 */
    $("#ulTable").innerHTML = NUTRIENTS.map(function (n) {
      var sum = s.sums[n.id];
      var overKr = sum > n.kr, overUs = sum > n.us;
      return '<div class="rx__row">' +
        '<span class="rx__name">' + n.name + '<span>' + n.hint + "</span></span>" +
        '<span class="rx__val">' + (overKr ? '<span style="color:var(--red)">' : "<span>") + "한 " + fmt(n.kr) + "</span> · " +
        (overUs ? '<span style="color:var(--red)">' : "<span>") + "미 " + fmt(n.us) + "</span> <small>" + n.unit + "</small></span>" +
        "</div>";
    }).join("");

    $("#result").hidden = false;
    $("#countText").textContent = "합산 완료";
    $("#countHint").textContent = "값을 바꾸면 바로 다시 계산합니다";

    if (scroll) {
      setTimeout(function () { $("#result").scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
    }
  }

  function metric(label, value, sub, tone) {
    var color = tone === "bad" ? "var(--red)" : tone === "warn" ? "var(--amber)" : "var(--green)";
    return '<div class="metric"><p class="metric__label">' + label + '</p>' +
      '<p class="metric__value" style="color:' + color + '">' + value + "</p>" +
      '<p class="metric__sub">' + sub + "</p></div>";
  }

  /* ---------------------------------------------------------------- 복사 */
  function copyResult() {
    if (!lastResult) return;
    var r = lastResult;
    var lines = ["[팩트체크 건강연구소] 영양제 UL 합산"];
    lines.push(std === "kr" ? "기준: 한국 KDRI 2020" : "기준: 미국 NIH ODS");
    lines.push("");
    r.rows.forEach(function (x) {
      lines.push(x.n.name + " " + fmt1(x.sum) + x.n.unit + " / UL " + fmt(x.ul) + x.n.unit + " → " + fmt(x.pct) + "%" +
        (x.pct > 100 ? "  ⚠️ 초과" : x.pct >= 70 ? "  (경계)" : ""));
    });
    lines.push("");
    lines.push("https://hjh7085-bit.github.io/ul-calc/");
    lines.push("※ 참고용이며 진단이 아닙니다. 복용 조정은 의사·약사와 상의하세요.");
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
    zinc: [
      { name: "종합비타민", vitD: 1000, vitC: 200, zinc: 15, vitE: 15, folate: 400 },
      { name: "아연 단일제", zinc: 30 },
      { name: "아연 트로키", zinc: 25 }
    ],
    d3: [
      { name: "비타민D 5,000IU", vitD: 5000 },
      { name: "종합비타민", vitD: 1000, vitA: 750, vitE: 15, zinc: 10 }
    ],
    multi: [
      { name: "종합비타민 A", vitA: 1000, vitD: 1000, vitE: 20, vitC: 200, vitB6: 5, zinc: 15, iron: 10, folate: 400, selenium: 55 },
      { name: "종합비타민 B", vitA: 800, vitD: 2000, vitE: 30, vitC: 500, vitB6: 10, zinc: 20, folate: 400, selenium: 100 }
    ]
  };

  function applyPreset(key) {
    var list = PRESETS[key];
    if (!list) return;
    products = [];
    list.forEach(function (src) {
      var p = newProduct(src.name);
      NUTRIENTS.forEach(function (n) {
        if (src[n.id]) p.vals[n.id] = String(src[n.id]);
      });
    });
    renderProducts();
    $$(".preset").forEach(function (b) { b.classList.toggle("is-active", b.dataset.preset === key); });
    analyze(true);
  }

  /* ---------------------------------------------------------------- 테마/칼럼 */
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

  /* ---------------------------------------------------------------- 초기화 */
  function init() {
    initTheme();
    renderColumns();
    newProduct("");
    renderProducts();
    bindProductInputs();

    $$(".seg__btn").forEach(function (b) {
      b.addEventListener("click", function () {
        std = b.dataset.std;
        $$(".seg__btn").forEach(function (x) { x.classList.toggle("is-on", x === b); });
        if (!$("#result").hidden) analyze(false);
      });
    });

    $("#addBtn").addEventListener("click", function () {
      if (products.length >= MAX_PRODUCTS) { toast("제품은 6개까지 넣을 수 있어요"); return; }
      newProduct("");
      renderProducts();
      var cards = $$(".prod");
      var last = cards[cards.length - 1];
      if (last) last.querySelector(".prod__name").focus();
    });

    $("#analyzeBtn").addEventListener("click", function () { analyze(true); });
    $("#resetBtn").addEventListener("click", function () {
      products = [];
      newProduct("");
      renderProducts();
      $("#result").hidden = true;
      lastResult = null;
      $$(".preset").forEach(function (b) { b.classList.remove("is-active"); });
      $("#countText").textContent = "성분을 넣으면 자동 합산";
      $("#countHint").textContent = "입력하는 즉시 UL 대비 %가 바뀝니다";
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
