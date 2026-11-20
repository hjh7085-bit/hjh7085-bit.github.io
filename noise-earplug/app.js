/* ==========================================================================
   팩트체크 건강연구소 · 층간소음·수면 방해 dB별 귀마개(NRR) 스펙 추천기
   실효 차음 = (NRR − 7) ÷ 2 (OSHA) · 저주파는 추가 −5dB 보정
   ⚠️ NRR은 실험실 값. 실제 차음은 착용법·귀 모양에 좌우.
   ========================================================================== */

(function () {
  "use strict";

  var NOISES = [
    { id: "thump", e: "👣", n: "발망치·쿵쿵 (아이 뛰는 소리)", s: "저주파 · 구조 전달", lo: 45, hi: 65, freq: "low", note: "63~125Hz 대역이 중심이라 귀마개로 잘 안 막힙니다." },
    { id: "talk", e: "🗣️", n: "말소리·TV 소리", s: "공기전달 · 중주파", lo: 50, hi: 65, freq: "mid", note: "500~2,000Hz는 귀마개가 가장 잘 막는 대역입니다." },
    { id: "road", e: "🚗", n: "도로·교통 소음", s: "광대역 · 지속", lo: 55, hi: 75, freq: "broad", note: "지속음이라 차음보다 백색소음·이중창이 효과적입니다." },
    { id: "snore", e: "😴", n: "옆자리 코골이", s: "저중주파 · 간헐", lo: 50, hi: 70, freq: "low", note: "코골이는 저주파가 많아 NRR보다 이어머프·백색소음이 낫습니다." },
    { id: "focus", e: "📚", n: "도서관·사무실 웅성거림", s: "중주파 · 말소리", lo: 45, hi: 60, freq: "mid", note: "말소리는 집중을 가장 방해하는 소리입니다." },
    { id: "machine", e: "🔨", n: "공사·기계·진공청소기", s: "광대역 · 고음", lo: 70, hi: 90, freq: "broad", note: "고음이 많아 폼 귀마개 NRR이 비교적 잘 통합니다." }
  ];

  var MATS = [
    { id: "foam", n: "폼 (이어플러그)", nrr: 33, low: "보통", side: "좋음", hy: "1~2개월 교체", price: "1,000~3,000원" },
    { id: "silicone", n: "실리콘 · 왁스", nrr: 27, low: "양호", side: "매우 좋음", hy: "매일 세척", price: "3,000~8,000원" },
    { id: "mold", n: "커스텀 몰드", nrr: 30, low: "양호", side: "좋음", hy: "세척 · 2~3년", price: "5만~15만원" },
    { id: "muff", n: "이어머프", nrr: 30, low: "보통", side: "어려움", hy: "패드 교체", price: "2만~5만원" },
    { id: "filter", n: "필터형 이어플러그", nrr: 20, low: "약함", side: "좋음", hy: "세척", price: "2만~6만원" }
  ];

  var OPTS = [
    { id: "tinnitus", e: "🔔", n: "이명이 있다", s: "귀울림", w: 2 },
    { id: "otitis", e: "💧", n: "외이도염을 반복했다", s: "귀가 자주 붓고 아픔", w: 3 },
    { id: "pain", e: "😣", n: "귀마개를 끼면 아프다", s: "작은 귀·압박", w: 2 },
    { id: "insomnia", e: "🌙", n: "잠들기가 어렵다", s: "소음에 예민", w: 1 },
    { id: "hearing", e: "👂", n: "잘 안 들리는 느낌", s: "청력 확인 필요", w: 3 }
  ];

  var LEVEL_ADJ = [-6, 0, 6, 12];
  var TARGET = { sleep: 45, focus: 50, hear: 85 };
  var TARGET_IDEAL = { sleep: 35, focus: 45, hear: 85 };

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }
  function fmt(n) { return Math.round(n).toLocaleString("ko-KR"); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function eff(nrr) { return Math.max(0, (nrr - 7) / 2); }

  var state = { noise: "thump", level: 1, db: null, goal: "sleep", ear: 1, side: 1, opts: {} };
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

  function noiseOf() { for (var i = 0; i < NOISES.length; i++) if (NOISES[i].id === state.noise) return NOISES[i]; return NOISES[0]; }

  function compute() {
    var nz = noiseOf();
    var db = state.db !== null ? state.db : Math.round((nz.lo + nz.hi) / 2 + LEVEL_ADJ[state.level]);
    var target = TARGET[state.goal];
    var need = Math.max(0, db - target);
    var freqPenalty = nz.freq === "low" ? 5 : nz.freq === "mid" ? 0 : nz.freq === "broad" ? 2 : 3;
    var needEff = need + freqPenalty;
    var nrrNeed = Math.max(0, Math.round(2 * needEff + 7));
    var maxEff = eff(33);
    var achievable = Math.max(0, maxEff - freqPenalty);
    var residual = db - achievable;
    var coverage = need > 0 ? achievable / need : 1;
    var tone = coverage >= 1 ? "green" : coverage >= 0.6 ? "amber" : "red";
    return {
      nz: nz, db: db, target: target, need: need, freqPenalty: freqPenalty,
      needEff: needEff, nrrNeed: nrrNeed, maxEff: maxEff, achievable: achievable,
      residual: residual, tone: tone, coverage: coverage
    };
  }

  function analyze(scroll) {
    var r = compute();
    var nz = r.nz;
    var toneName = { green: "충분", amber: "병행 필요", red: "귀마개 한계" };

    $("#resultSub").innerHTML = "<b>" + esc(nz.n) + "</b> · 추정 음량 <b>" + r.db + "dB</b> · 목표 " + r.target + "dB(" +
      ({ sleep: "수면", focus: "집중", hear: "청력 보호" })[state.goal] + ") 기준으로 계산했습니다.";

    var badge, title;
    var needTxt = Math.round(r.need) + "dB";
    if (r.tone === "green") {
      badge = "🟢 이 스펙이면 충분";
      title = "NRR " + Math.max(20, Math.min(33, r.nrrNeed)) + "dB 이상이면 목표에 닿습니다";
    } else if (r.tone === "amber") {
      badge = "🟡 귀마개 + 병행 대책";
      title = needTxt + " 감쇠가 필요한데, 폼 최대가 " + Math.round(r.achievable) + "dB입니다";
    } else {
      badge = "🔴 귀마개만으로는 부족";
      title = needTxt + " 감쇠는 귀마개 한계(" + Math.round(r.achievable) + "dB)를 넘습니다";
    }

    var desc = esc(nz.note) + " 목표(" + r.target + "dB)까지 <b>" + Math.round(r.need) + "dB</b>를 줄여야 하고, 여기에 주파수 보정 " +
      r.freqPenalty + "dB를 더하면 실효 <b>" + Math.round(r.needEff) + "dB</b>가 필요합니다. 시중 최대는 폼 <b>NRR 33</b>(실효 " +
      Math.round(r.achievable) + "dB)이라, " +
      (r.tone === "red" ? "이 소음은 <b>소음원 대책</b>이나 이중 착용이 함께 필요합니다." :
        r.tone === "amber" ? "잔여 " + Math.round(r.residual) + "dB가 남습니다 — <b>이어머프 병행(+5dB)</b>이나 백색소음을 함께 쓰세요." :
          "폼 귀마개 하나로 목표 아래로 들어옵니다.");

    $("#verdictBox").innerHTML =
      '<div class="verdict verdict--' + r.tone + '">' +
      '<span class="verdict__badge">' + badge + "</span>" +
      '<div class="verdict__title">' + title + "</div>" +
      '<div class="verdict__desc">' + desc + "</div></div>";

    $("#summaryBox").innerHTML = [
      { label: "필요 감쇠", num: String(Math.round(r.need)), unit: "dB", cls: r.tone },
      { label: "폼 최대 실효", num: String(Math.round(r.achievable)), unit: "dB", cls: "amber" },
      { label: "잔여 소음", num: String(Math.round(r.residual)), unit: "dB", cls: r.residual <= r.target ? "green" : "red" }
    ].map(function (c) {
      return '<div class="summary__card summary__card--' + c.cls + '"><span class="summary__label">' + c.label + "</span>" +
        '<span class="summary__num"' + (c.unit ? "" : ' style="font-size:20px"') + ">" + c.num + (c.unit ? "<small>" + c.unit + "</small>" : "") + "</span></div>";
    }).join("");

    /* 계산 과정 */
    var freqName = { low: "저주파 (63~125Hz)", mid: "중주파 (500~2,000Hz)", broad: "광대역", lowmid: "저중주파" };
    $("#calcRows").innerHTML = [
      ["추정 소음", nz.n + " · " + freqName[nz.freq], r.db + " dB"],
      ["목표 수준", ({ sleep: "수면 (방해 최소 45dB · 이상적 35dB)", focus: "집중 (50dB)", hear: "청력 보호 (85dB)" })[state.goal], r.target + " dB"],
      ["필요 감쇠", "소음 − 목표", Math.round(r.need) + " dB"],
      ["주파수 보정", "저주파·광대역은 NRR이 과대평가", "+" + r.freqPenalty + " dB"],
      ["필요 실효 차음", "합계", Math.round(r.needEff) + " dB"],
      ["필요 라벨 NRR", "(실효 × 2) + 7 · 최대 33 초과면 한계", (r.nrrNeed > 33 ? "33 초과" : r.nrrNeed + " dB")],
      ["실효 최대 (NRR 33)", "폼 귀마개 최고 스펙", Math.round(r.achievable) + " dB"]
    ].map(function (row) {
      return '<div class="rx__row"><span class="rx__name">' + row[0] + "<span>" + row[1] + "</span></span><span class=\"rx__val\">" + row[2] + "</span></div>";
    }).join("");

    /* 추천 */
    var picks = [];
    var earTxt = ["스몰(S)", "레귤러(M)", "라지(L)"][state.ear];
    if (nz.freq === "low") {
      picks.push({
        t: "1순위 · 실리콘·왁스형 + 이어머프 병행",
        b: "저주파는 폼보다 <b>밀봉</b>이 중요합니다. 실리콘·왁스(NRR 22~27)를 깊게 성형하고, 등으로 잔다면 <b>이어머프</b>를 겹치세요(최대 +5dB). 옆으로 잔다면 머프는 불가능하니 실리콘 + 백색소음으로.",
        now: "오늘 주문"
      });
    } else if (r.tone === "red") {
      picks.push({
        t: "1순위 · 폼 NRR 32~33 + 이어머프 이중 착용",
        b: "이 정도 소음(80dB 이상)은 귀마개 하나로 불가능합니다. <b>폼 NRR 33</b>을 정확히 삽입하고 머프를 겹쳐 <b>+5dB</b>를 더하세요. 그래도 부족하면 소음 노출 시간을 줄이는 게 우선입니다.",
        now: "즉시"
      });
    } else {
      picks.push({
        t: "1순위 · 폼 귀마개 NRR " + Math.max(29, r.nrrNeed) + "~33 (" + earTxt + ")",
        b: "가장 가성비가 좋습니다. 삽입 전 <b>10~20초 비벼</b> 얇게 만든 뒤, 반대손으로 귀를 뒤로 당기고 <b>깊게</b> 넣으세요. 얕게 넣으면 차음이 절반으로 떨어집니다.",
        now: "오늘 주문"
      });
    }
    if (state.side === 1) {
      picks.push({
        t: "2순위 · 옆으로 자는 조건",
        b: "폼은 베개 압력에 눌려도 밀봉이 유지되지만, <b>이어머프는 옆으로 자면 새요</b>. 옆으로 잔다면 폼(스몰~레귤러)이나 실리콘을 쓰고, 머프는 '등으로 잘 때만' 쓰세요.",
        now: "수면 자세"
      });
    } else {
      picks.push({
        t: "2순위 · 이어머프 병행 가능",
        b: "등으로 자면 <b>이어머프를 겹칠 수 있어 +5dB</b>를 더 얻습니다. 플러그를 먼저 넣고 머프를 씌우세요. 순서를 바꾸면 효과가 줄어요.",
        now: "취침 시"
      });
    }
    if (state.opts.otitis || state.opts.pain) {
      picks.push({
        t: "3순위 · 귀 건강 우선",
        b: "외이도염을 반복했거나 끼면 아프다면 <b>폼을 매일 밤 쓰지 마세요</b>. 통풍이 되는 실리콘·커스텀 몰드로 바꾸고, 하루씩 쉬는 날을 두세요. 귀가 가렵거나 분비물이 나면 2~3일 중단하고 진료.",
        now: "이번 주"
      });
    } else {
      picks.push({
        t: "3순위 · 삽입 위생",
        b: "폼은 <b>1~2개월</b>마다 교체, 실리콘은 매일 세척 후 완전 건조. 젖은 귀에 끼우면 외이도염 위험이 커집니다. 손을 씻고 만지세요.",
        now: "습관"
      });
    }
    $("#pickList").innerHTML = picks.map(function (p, i) {
      return '<div class="plan__item"><span class="plan__num">' + (i + 1) + "</span><div>" +
        '<div class="plan__title">' + p.t + "</div>" +
        '<div class="plan__body">' + p.b + ' <span class="plan__now">' + p.now + "</span></div></div></div>";
    }).join("");

    /* 재질 표 */
    $("#matBody").innerHTML = MATS.map(function (m) {
      var e = Math.round(eff(m.nrr));
      var hl = (m.id === "foam" && nz.freq !== "low") || (m.id === "silicone" && nz.freq === "low");
      return "<tr" + (hl ? ' style="background:var(--mint-soft)"' : "") + "><td>" + m.n + "</td><td>" + m.nrr + "</td><td>" + e +
        "</td><td>" + m.low + "</td><td>" + m.side + "</td></tr>";
    }).join("");

    /* 집에서 할 수 있는 것 */
    var home = [
      { t: "두꺼운 러그·매트 (소음원)", b: "윗집 발소리는 <b>매트</b>로 줄입니다. 직접 요청이 어렵다면 관리사무소를 통해 '층간소음 매트 안내'를 받아 보세요.", now: "1주 내" },
      { t: "침대·책상을 벽에서 10cm 띄우기", b: "벽에 붙은 가구는 진동을 그대로 전달합니다. <b>진동 전달 경로</b>를 끊는 것만으로 체감이 달라져요.", now: "오늘" },
      { t: "백색소음으로 '차이'를 가리기", b: "저주파는 완전히 막을 수 없으니, 선풍기·백색소음 앱으로 <b>소리 대비</b>를 줄이세요. 40~50dB 정도면 충분하고, 이어폰으로 자지 마세요.", now: "취침 시" },
      { t: "공식 절차: 측정·상담", b: "층간소음 이웃사이센터 <b>1661-2642</b>에서 상담·측정을 지원합니다. 야간 기준 직접충격음 <b>34dB(A)</b>를 넘으면 문제 제기가 가능해요.", now: "지속될 때" }
    ];
    $("#homeList").innerHTML = home.map(function (h, i) {
      return '<div class="plan__item"><span class="plan__num">' + (i + 1) + "</span><div>" +
        '<div class="plan__title">' + h.t + "</div>" +
        '<div class="plan__body">' + h.b + ' <span class="plan__now">' + h.now + "</span></div></div></div>";
    }).join("");

    last = { r: r, tone: toneName[r.tone], title: title };
    if ($("#result").hidden) {
      $("#result").hidden = false;
      if (scroll) $("#result").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function updateCount() {
    var nz = noiseOf();
    $("#countText").textContent = nz.e + " " + nz.n;
    $("#countHint").textContent = "체감 " + ["겨우 들림", "또렷이", "크게", "아플 정도"][state.level] + " · " +
      (state.db !== null ? state.db + "dB 입력됨" : "자동 추정");
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
    if (!last) return;
    var r = last.r;
    var text = "【귀마개 스펙 추천】\n" + r.nz.n + " · 추정 " + r.db + "dB → 목표 " + r.target + "dB\n" +
      "필요 실효 차음 " + Math.round(r.needEff) + "dB → 라벨 NRR " + r.nrrNeed + "dB\n" +
      "실효 최대 " + Math.round(r.achievable) + "dB · 잔여 " + Math.round(r.residual) + "dB (" + last.tone + ")";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("결과를 복사했어요"); }, function () { toast("복사에 실패했어요"); });
    } else toast("복사가 지원되지 않는 브라우저예요");
  }

  function init() {
    initTheme();

    $("#noiseList").innerHTML = NOISES.map(function (n) {
      return '<label class="item"><input type="radio" name="noise" data-noise="' + n.id + '"' + (n.id === state.noise ? " checked" : "") + ">" +
        '<span class="item__box" aria-hidden="true"></span>' +
        '<span class="item__text"><span class="item__name">' + n.e + " " + esc(n.n) + "</span>" +
        '<span class="item__sub">' + esc(n.s) + " · " + n.lo + "~" + n.hi + "dB</span></span></label>";
    }).join("");
    $$("#noiseList input").forEach(function (el) {
      el.addEventListener("change", function () {
        state.noise = el.dataset.noise;
        updateCount(); analyze(false);
      });
    });

    $("#optList").innerHTML = OPTS.map(function (o) {
      return '<label class="item"><input type="checkbox" data-opt="' + o.id + '" aria-label="' + esc(o.n) + '">' +
        '<span class="item__box" aria-hidden="true"></span>' +
        '<span class="item__text"><span class="item__name">' + o.e + " " + esc(o.n) + "</span>" +
        '<span class="item__sub">' + esc(o.s) + "</span></span></label>";
    }).join("");
    $$("#optList input").forEach(function (el) {
      el.addEventListener("change", function () {
        if (el.checked) state.opts[el.dataset.opt] = true; else delete state.opts[el.dataset.opt];
        updateCount(); schedule_();
      });
    });

    [["#levelSeg", "level"], ["#goalSeg", "goal"], ["#earSeg", "ear"], ["#sideSeg", "side"]].forEach(function (pair) {
      $$(pair[0] + " .seg__btn").forEach(function (b) {
        b.addEventListener("click", function () {
          $$(pair[0] + " .seg__btn").forEach(function (x) { x.classList.remove("is-on"); x.setAttribute("aria-pressed", "false"); });
          b.classList.add("is-on"); b.setAttribute("aria-pressed", "true");
          var v = b.dataset.v;
          state[pair[1]] = (pair[1] === "level" || pair[1] === "ear" || pair[1] === "side") ? parseInt(v, 10) : v;
          updateCount(); schedule_();
        });
      });
    });

    $("#dbInput").addEventListener("input", function (e) {
      state.db = num(e.target.value);
      updateCount(); schedule_();
    });

    $("#analyzeBtn").addEventListener("click", function () { analyze(true); });
    $("#resetBtn").addEventListener("click", function () {
      state = { noise: "thump", level: 1, db: null, goal: "sleep", ear: 1, side: 1, opts: {} };
      $("#dbInput").value = "";
      $$("#noiseList input").forEach(function (el, i) { el.checked = i === 0; });
      $$("#optList input").forEach(function (el) { el.checked = false; });
      [["#levelSeg", 1], ["#goalSeg", 0], ["#earSeg", 1], ["#sideSeg", 0]].forEach(function (p) {
        $$(p[0] + " .seg__btn").forEach(function (x, i) { x.classList.toggle("is-on", i === p[1]); x.setAttribute("aria-pressed", i === p[1] ? "true" : "false"); });
      });
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
