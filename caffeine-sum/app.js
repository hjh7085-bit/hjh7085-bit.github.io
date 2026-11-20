/* ==========================================================================
   팩트체크 건강연구소 · 커피+에너지드링크+다이어트제 카페인 합산기
   잔 수 × 1회 카페인 → 합산 · 상한(400/200/체중) · 취침 시 잔류
   --------------------------------------------------------------------------
   ⚠️ 제품 표시값 기반 '참고용' 합산입니다. 민감도는 개인차가 큽니다.
   ========================================================================== */

(function () {
  "use strict";

  var ITEMS = [
    { id: "americano", emoji: "☕", name: "아메리카노 (톨 355mL)", sub: "1잔 150mg", mg: 150 },
    { id: "espresso", emoji: "⚡", name: "에스프레소 1샷", sub: "1샷 75mg", mg: 75 },
    { id: "cold", emoji: "🧊", name: "콜드브루 1잔 (355mL)", sub: "1잔 150mg", mg: 150 },
    { id: "mix", emoji: "🥤", name: "커피믹스 1봉", sub: "1봉 69mg", mg: 69 },
    { id: "can", emoji: "🥫", name: "캔커피 1캔", sub: "1캔 74mg", mg: 74 },
    { id: "latte", emoji: "🥛", name: "카페라떼 (톨·1샷)", sub: "1잔 75mg", mg: 75 },
    { id: "decaf", emoji: "🌙", name: "디카페인 아메리카노", sub: "1잔 10mg", mg: 10 },
    { id: "cola", emoji: "🟤", name: "콜라 1캔 (250mL)", sub: "1캔 23mg", mg: 23 },
    { id: "zero", emoji: "🖤", name: "제로콜라 1캔 (250mL)", sub: "1캔 23mg", mg: 23 },
    { id: "redbull", emoji: "🐂", name: "에너지드링크 250mL", sub: "레드불·핫식스급 63mg", mg: 63 },
    { id: "monster", emoji: "👹", name: "고카페인 에너지 355mL", sub: "몬스터급 100mg", mg: 100 },
    { id: "bacca", emoji: "💉", name: "박카스F 1병 (120mL)", sub: "1병 30mg", mg: 30 },
    { id: "greentea", emoji: "🍵", name: "녹차 1잔", sub: "1잔 15mg", mg: 15 },
    { id: "blacktea", emoji: "🫖", name: "홍차 1잔", sub: "1잔 40mg", mg: 40 },
    { id: "choco", emoji: "🍫", name: "다크초콜릿 30g", sub: "30g 25mg", mg: 25 },
    { id: "milk", emoji: "🥤", name: "커피우유 1팩 (200mL)", sub: "1팩 47mg", mg: 47 },
    { id: "diet", emoji: "💊", name: "다이어트제 1정", sub: "과라나·녹차추출물 30~200mg", mg: 100 },
    { id: "pwo", emoji: "🏋️", name: "프리워크아웃 1스쿱", sub: "150~300mg · 표시 확인", mg: 200 },
    { id: "custom", emoji: "✏️", name: "직접 입력 (mg)", sub: "라벨의 총카페인", mg: 0, custom: true }
  ];

  var TABLE = [
    ["커피전문점 커피", "1잔", "123mg"],
    ["아메리카노 톨", "355mL", "150mg"],
    ["에스프레소", "1샷", "75mg"],
    ["캔커피", "1캔", "74mg"],
    ["커피믹스", "1봉", "69mg"],
    ["에너지드링크", "1캔 평균", "58mg"],
    ["레드불", "250mL", "62.5mg"],
    ["몬스터", "355mL", "100mg"],
    ["콜라·제로콜라", "250mL", "23mg"],
    ["녹차", "1잔", "15mg"],
    ["초콜릿", "1회", "16mg"],
    ["프리워크아웃", "1스쿱", "150~300mg"],
    ["다이어트제(과라나)", "1정", "30~200mg"]
  ];

  var HALF_LIFE = 5;
  var state = { who: "adult", qty: {} };
  var lastResult = null;

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function num(v) { var n = parseFloat(String(v).replace(/[^0-9.]/g, "")); return isFinite(n) ? n : NaN; }
  function fmt(n, d) {
    if (!isFinite(n)) return "-";
    var fixed = (typeof d === "number") ? n.toFixed(d) : String(Math.round(n));
    var parts = fixed.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
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

  /* ------------------------------------------------------------------ build */
  function renderItems() {
    $("#itemList").innerHTML = ITEMS.map(function (it) {
      var extra = it.custom
        ? '<input class="crow__mg" type="number" inputmode="numeric" min="0" max="1000" step="5" placeholder="mg" data-mg="' + it.id + '" aria-label="직접 입력 카페인 mg">'
        : "";
      return '<div class="crow" data-id="' + it.id + '">' +
        '<div class="crow__main">' +
        '<span class="crow__emoji" aria-hidden="true">' + it.emoji + "</span>" +
        '<span class="crow__text"><span class="crow__name">' + esc(it.name) + "</span>" +
        '<span class="crow__sub">' + esc(it.sub) + "</span></span>" +
        extra +
        "</div>" +
        '<div class="qty">' +
        '<button type="button" data-step="-1" data-for="' + it.id + '" aria-label="' + esc(it.name) + ' 줄이기">−</button>' +
        '<input type="number" inputmode="numeric" min="0" max="20" step="1" value="0" data-qty="' + it.id + '" aria-label="' + esc(it.name) + ' 개수">' +
        '<button type="button" data-step="1" data-for="' + it.id + '" aria-label="' + esc(it.name) + ' 늘리기">+</button>' +
        "</div></div>";
    }).join("");
  }

  /* ------------------------------------------------------------------ model */
  function limitOf() {
    if (state.who === "preg") return { limit: 200, label: "임신·수유부", note: "EFSA 200mg / 식약처 300mg" };
    if (state.who === "teen") {
      var w = num($("#teenWeight").value);
      if (!isFinite(w) || w < 25 || w > 90) return { limit: NaN, label: "청소년", note: "체중을 25~90kg로 입력하세요" };
      return { limit: w * 2.5, label: "청소년", note: "체중 " + fmt(w, 1) + "kg × 2.5mg" };
    }
    return { limit: 400, label: "성인", note: "식약처·EFSA·FDA 400mg" };
  }

  function analyse() {
    var total = 0;
    var rows = [];
    ITEMS.forEach(function (it) {
      var q = parseInt(state.qty[it.id] || 0, 10) || 0;
      if (!q) return;
      var per = it.custom ? (num($('[data-mg="' + it.id + '"]').value) || 0) : it.mg;
      var mg = q * per;
      total += mg;
      rows.push({ it: it, qty: q, per: per, mg: mg });
    });
    rows.sort(function (a, b) { return b.mg - a.mg; });

    var lim = limitOf();
    var pct = isFinite(lim.limit) && lim.limit > 0 ? total / lim.limit * 100 : 0;
    var bedH = num($("#bedHours").value);
    if (!isFinite(bedH) || bedH < 0) bedH = 0;
    var residual = total * Math.pow(0.5, bedH / HALF_LIFE);
    var needH = total > 50 ? HALF_LIFE * Math.log(total / 50) / Math.LN2 : 0;
    var maxSingle = rows.reduce(function (m, r) { return Math.max(m, r.per); }, 0);

    return {
      total: total, rows: rows, lim: lim, pct: pct, bedH: bedH,
      residual: residual, needH: needH, maxSingle: maxSingle
    };
  }

  /* ---------------------------------------------------------------- render */
  function verdictHTML(r) {
    var v, badge, title, desc;
    if (r.total === 0) {
      v = "green"; badge = "🟢 0mg";
      title = "오늘 입력한 카페인이 없습니다";
      desc = "위에서 마신 음료의 잔 수를 올리면 합산이 시작됩니다.";
    } else if (r.pct > 100) {
      v = "red"; badge = "🔴 상한 초과";
      title = "상한 " + fmt(r.lim.limit) + "mg을 " + fmt(r.total - r.lim.limit) + "mg 넘었습니다";
      desc = r.lim.label + " 기준의 <b>" + fmt(r.pct) + "%</b>입니다. 오늘은 카페인을 더 마시지 말고, 두근거림·불안·두통이 있으면 물을 마시며 쉬세요. 심한 가슴 통증이나 부정맥이 느껴지면 진료를 받으세요.";
    } else if (r.pct >= 70) {
      v = "amber"; badge = "🟡 상한 근접";
      title = "상한의 " + fmt(r.pct) + "% — 한 잔만 더 마셔도 선을 넘습니다";
      desc = "남은 여유는 <b>" + fmt(r.lim.limit - r.total) + "mg</b>입니다. 아메리카노 1잔(150mg)이면 초과합니다. 오후에는 디카페인·보리차로 바꾸세요.";
    } else {
      v = "green"; badge = "🟢 안전 범위";
      title = "상한의 " + fmt(r.pct) + "% — 여유는 " + fmt(r.lim.limit - r.total) + "mg";
      desc = "총량은 문제 없습니다. 다만 <b>마신 시각</b>이 늦으면 잠은 방해받습니다. 아래 취침 잔류량을 확인하세요.";
    }
    var extra = "";
    if (r.maxSingle >= 200) {
      extra = '<br><br><b>1회 200mg 이상</b>을 한 번에 마셨습니다. EFSA는 1회 200mg까지를 안전 범위로 보지만, 예민한 사람은 한 번에 두근거림·불안이 올 수 있습니다.';
    }
    return '<div class="verdict verdict--' + v + '">' +
      '<span class="verdict__badge">' + badge + "</span>" +
      '<h3 class="verdict__title">' + title + "</h3>" +
      '<p class="verdict__desc">' + desc + extra + "</p></div>";
  }

  function summaryHTML(r) {
    function card(val, unit, label, cls) {
      return '<div class="summary__card' + (cls ? " summary__card--" + cls : "") + '">' +
        '<div class="summary__num">' + val + (unit ? '<small style="font-size:12px;font-weight:700;color:var(--ink-3)"> ' + unit + "</small>" : "") + "</div>" +
        '<div class="summary__label">' + label + "</div></div>";
    }
    var pctCls = r.pct > 100 ? "red" : r.pct >= 70 ? "amber" : "green";
    return card(fmt(r.total), "mg", "오늘 합계") +
      card(fmt(r.pct) + "%", "", "상한 대비", pctCls) +
      card(fmt(r.residual), "mg", "취침 시 잔류", r.residual > 50 ? "amber" : "green");
  }

  function meterHTML(r) {
    var pct = isFinite(r.pct) ? r.pct : 0;
    var fill = Math.min(100, Math.max(0, pct));
    var seg = pct > 100 ? "high" : pct >= 70 ? "mid" : "ok";
    return '<div class="meter">' +
      '<div class="meter__head">' +
      '<div class="meter__title">' + r.lim.label + " 기준 상한 " + fmt(r.lim.limit) + "mg<small>" + esc(r.lim.note) + "</small></div>" +
      '<div class="meter__value">' + fmt(r.total) + " <small>mg</small></div>" +
      "</div>" +
      '<div class="meter__track"><div class="meter__fill" style="width:' + fill.toFixed(1) + '%">' +
      '<div class="meter__seg meter__seg--' + seg + '" style="width:100%"></div></div></div>' +
      '<div class="meter__scale"><span>0</span><span>' + fmt(r.lim.limit * 0.7) + "mg (70%)</span><span>" + fmt(r.lim.limit) + "mg 상한</span></div>" +
      "</div>" +
      '<div class="badge-row">' +
      '<span class="tbadge tbadge--ok">🟢 0~70% 안전</span>' +
      '<span class="tbadge tbadge--mid">🟡 70~100% 근접</span>' +
      '<span class="tbadge tbadge--high">🔴 100% 초과</span>' +
      "</div>";
  }

  function sleepHTML(r) {
    function metric(label, value, sub, accent) {
      return '<div class="metric' + (accent ? " metric--accent" : "") + '"><div class="metric__label">' + label + "</div>" +
        '<div class="metric__value">' + value + "</div>" +
        '<div class="metric__sub">' + sub + "</div></div>";
    }
    return metric("취침 시 잔류", fmt(r.residual) + "<small>mg</small>", "반감기 5시간 가정 · " + fmt(r.bedH, 1) + "시간 후", true) +
      metric("50mg 아래까지", r.total > 50 ? fmt(r.needH, 1) + "<small>시간</small>" : "0<small>시간</small>", "지금 이후 필요 시간") +
      metric("반감기 범위", "3~7<small>h</small>", "개인차·약 복용에 따라") +
      metric("한 잔 더 마시면", fmt(r.total + 150) + "<small>mg</small>", "아메리카노 1잔 추가 시");
  }

  function sleepAdviceHTML(r) {
    var t, d, cls = "insight";
    if (r.residual >= 100) {
      t = "취침 때 " + fmt(r.residual) + "mg — 잠들기 어려운 수준입니다";
      d = "50mg 아래로 떨어뜨리려면 지금부터 <b>" + fmt(r.needH, 1) + "시간</b>이 필요합니다. 오늘은 카페인을 더 마시지 말고, 잠자리에 누웠을 때 20분 안에 잠들지 않으면 일어나 조용한 활동을 하세요. 억지로 누워 있으면 오히려 수면 효율이 떨어집니다.";
    } else if (r.residual >= 50) {
      t = "취침 때 " + fmt(r.residual) + "mg — 예민한 사람은 영향";
      d = "수면 잠복기(잠들기까지 걸리는 시간)가 늘 수 있습니다. <b>잠들기 6시간 전에는 컵을 내려놓으세요.</b> 다음 날은 오후 2시 이후 카페인을 피하는 것이 가장 확실합니다.";
    } else {
      t = "취침 때 " + fmt(r.residual) + "mg — 잠에 크게 영향 없는 수준";
      d = "이 정도면 대부분 문제없습니다. 다만 카페인에 예민하거나 불면이 있다면 <b>취침 8시간 전</b>까지만 마시는 규칙이 안전합니다.";
    }
    return '<div class="' + cls + '"><b>' + t + "</b><br>" + d + "</div>";
  }

  function breakHTML(r) {
    if (!r.rows.length) return '<div class="rule-empty">아직 올린 잔 수가 없습니다.</div>';
    return '<div class="loads">' + r.rows.map(function (x) {
      var w = r.total > 0 ? x.mg / r.total * 100 : 0;
      return '<div class="load">' +
        '<div class="load__head"><div class="load__name">' + x.it.emoji + " " + esc(x.it.name) +
        "<span>" + x.qty + " × " + fmt(x.per) + "mg</span></div>" +
        '<div class="load__num">' + fmt(x.mg) + "mg<small>" + fmt(w) + "%</small></div></div>" +
        '<div class="load__track"><div class="load__keep" style="width:' + w.toFixed(1) + '%"></div>' +
        '<div class="load__cut" style="width:' + (100 - w).toFixed(1) + '%"></div></div>' +
        "</div>";
    }).join("") + "</div>";
  }

  function planHTML(r) {
    var cut = r.total > 0 ? Math.max(0, Math.round((r.bedH - r.needH) * 10) / 10) : 0;
    return '<div class="plan__item"><div class="plan__num">1</div><div>' +
      '<div class="plan__title">컷오프 시각 정하기</div>' +
      '<div class="plan__body">오늘 합계 ' + fmt(r.total) + "mg을 50mg 아래로 떨어뜨리는 데 <b>" + fmt(r.needH, 1) + "시간</b>이 필요합니다. " +
      "내 컷오프를 정해 두면 매일 계산할 필요가 없습니다." +
      (cut <= 0 && r.total > 0 ? " 지금 이미 늦었으니 오늘은 더 마시지 마세요." : "") + "</div></div></div>" +
      '<div class="plan__item"><div class="plan__num">2</div><div>' +
      '<div class="plan__title">오후 한 잔은 디카페인·보리차로</div>' +
      '<div class="plan__body">아메리카노 1잔(150mg)을 디카페인(10mg)으로 바꾸면 <b>−140mg</b>입니다. 하루 두 잔을 바꾸면 400mg 상한 안에 여유가 생깁니다.</div></div></div>' +
      '<div class="plan__item plan__item--amber"><div class="plan__num">3</div><div>' +
      '<div class="plan__title">보조제 라벨의 ‘총카페인’ 확인</div>' +
      '<div class="plan__body">과라나·녹차추출물·프리워크아웃은 카페인을 <b>“에너지 원료”</b>로 표시해 총량이 눈에 띄지 않습니다. ' +
      "액체식품은 0.15mg/mL 이상이면 총카페인 함량 표시가 의무입니다.</div></div></div>";
  }

  function tableHTML() {
    return TABLE.map(function (row) {
      var m = row[2].match(/[0-9]+(?:\.[0-9]+)?/);
      var mgNum = m ? parseFloat(m[0]) : 0;
      var per = mgNum ? fmt(400 / mgNum, 1) : "-";
      return "<tr><td><b>" + esc(row[0]) + "</b></td><td>" + esc(row[1]) + "</td><td>" + esc(row[2]) + "</td><td>" + per + "</td></tr>";
    }).join("");
  }

  function render(r) {
    lastResult = r;
    $("#totalEcho").textContent = fmt(r.total) + "mg";
    $("#resultSub").textContent = r.total > 0
      ? r.lim.label + " 기준 상한 " + fmt(r.lim.limit) + "mg 대비 " + fmt(r.pct) + "% · 취침 " + fmt(r.bedH, 1) + "시간 전 기준."
      : "마신 잔 수를 올리면 상한 대비 위치와 취침 시 잔류량이 계산됩니다.";
    $("#verdictBox").innerHTML = verdictHTML(r);
    $("#summaryBox").innerHTML = summaryHTML(r);
    $("#meterArea").innerHTML = meterHTML(r);
    $("#sleepMetrics").innerHTML = sleepHTML(r);
    $("#sleepAdvice").innerHTML = sleepAdviceHTML(r);
    $("#breakArea").innerHTML = breakHTML(r);
    $("#planList").innerHTML = planHTML(r);
    $("#tableBody").innerHTML = tableHTML();
    $("#result").hidden = false;

    $("#countText").textContent = "오늘 " + fmt(r.total) + "mg";
    $("#countHint").textContent = isFinite(r.pct) ? "상한의 " + fmt(r.pct) + "%" : r.lim.note;
  }

  function refresh(scroll) {
    var r = analyse();
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
    var text = "【오늘 카페인 합산】\n" +
      ITEMS.filter(function (it) { return r.rows.some(function (x) { return x.it.id === it.id; }); })
        .map(function (it) {
          var row = r.rows.filter(function (x) { return x.it.id === it.id; })[0];
          return "· " + it.name + " " + row.qty + " × " + row.per + "mg = " + row.mg + "mg";
        }).join("\n") +
      "\n합계 " + r.total + "mg / " + r.lim.label + " 상한 " + fmt(r.lim.limit) + "mg (" + fmt(r.pct) + "%)\n" +
      "취침 " + fmt(r.bedH, 1) + "시간 후 잔류 약 " + fmt(r.residual) + "mg\n" +
      "※ 참고용 합산 (팩트체크 건강연구소)";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("결과를 복사했습니다"); },
        function () { toast("복사가 차단되었습니다"); });
    } else {
      toast("이 브라우저에서는 복사가 지원되지 않습니다");
    }
  }

  /* ------------------------------------------------------------------ events */
  function setWho(v) {
    state.who = v;
    $$("#whoSeg .seg__btn").forEach(function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-who") === v);
    });
    $("#teenWeightField").hidden = v !== "teen";
  }

  function init() {
    initTheme();
    renderItems();
    setWho("adult");

    $("#itemList").addEventListener("click", function (e) {
      var b = e.target.closest("[data-step]");
      if (!b) return;
      var id = b.getAttribute("data-for");
      var input = $('[data-qty="' + id + '"]');
      var v = parseInt(input.value, 10) || 0;
      v = Math.max(0, Math.min(20, v + parseInt(b.getAttribute("data-step"), 10)));
      input.value = String(v);
      state.qty[id] = v;
      refresh(false);
    });
    $("#itemList").addEventListener("input", function (e) {
      var id = e.target.getAttribute("data-qty");
      if (id) {
        var v = parseInt(e.target.value, 10);
        state.qty[id] = isFinite(v) ? Math.max(0, Math.min(20, v)) : 0;
        refresh(false);
        return;
      }
      if (e.target.getAttribute("data-mg")) refresh(false);
    });

    $$("#whoSeg .seg__btn").forEach(function (b) {
      b.addEventListener("click", function () { setWho(b.getAttribute("data-who")); refresh(false); });
    });
    $("#teenWeight").addEventListener("input", function () { refresh(false); });
    $("#bedHours").addEventListener("input", function () { refresh(false); });

    $("#calcBtn").addEventListener("click", function () { refresh(true); });
    $("#resetBtn").addEventListener("click", function () {
      state.qty = {};
      $$("[data-qty]").forEach(function (i) { i.value = "0"; });
      $$("[data-mg]").forEach(function (i) { i.value = ""; });
      setWho("adult");
      $("#bedHours").value = "8";
      refresh(false);
      toast("입력을 초기화했습니다");
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
