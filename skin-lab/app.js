/* ==========================================================================
   트러블·피부 성분 충돌 체크기 — skin-lab/app.js
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 테마 ---------- */
  var THEME_KEY = 'fchl-theme';
  var root = document.documentElement;
  var themeBtn = document.getElementById('themeToggle');
  function applyTheme(mode) {
    root.setAttribute('data-theme', mode);
    if (themeBtn) {
      themeBtn.setAttribute('aria-pressed', mode === 'dark' ? 'true' : 'false');
      themeBtn.setAttribute('aria-label', mode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환');
    }
  }
  var savedTheme = null;
  try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) {}
  applyTheme(savedTheme || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  });

  var toastEl = document.getElementById('toast');
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  }

  /* ---------- 성분 ---------- */
  var INGS = [
    { id: 'retinol', name: '레티놀', sub: '주름·탄력', legend: '비타민A 유도체. 빛에 약해 저녁 사용, 임신 중 사용 상담 필요.' },
    { id: 'tretinoin', name: '트레티노인', sub: '여드름·광노화 (처방)', legend: '처방 레티노이드. 자극이 강해 적응기 필요, 자외선차단 필수.' },
    { id: 'adapalene', name: '아다팔렌', sub: '여드름 (레티노이드)', legend: '일부 국가에서 OTC로 판매되는 레티노이드. 트레티노인보다 자극이 적은 편.' },
    { id: 'aha', name: 'AHA', sub: '글리콜릭·락틱', legend: '수용성 각질제거. pH가 낮아 자극·홍조가 생기기 쉽습니다.' },
    { id: 'bha', name: 'BHA', sub: '살리실산', legend: '지용성이라 모공 속 피지를 녹입니다. 모공·블랙헤드에 사용.' },
    { id: 'bpo', name: '벤조일퍼옥사이드', sub: '여드름 항균 (BPO)', legend: '여드름균을 죽이는 산화제. 수건·베개 표백과 건조에 주의.' },
    { id: 'vitc', name: '고농도 비타민C', sub: '20% 이상', legend: '항산화·미백. pH 3 이하라 다른 산과 겹치면 자극이 커집니다.' },
    { id: 'niacinamide', name: '나이아신아마이드', sub: '색소·피지·장벽', legend: '2~5%가 일반적. 색소·피지·장벽에 두루 작용합니다.' },
    { id: 'azelaic', name: '아젤라산', sub: '여드름·홍조·색소', legend: '처방은 15~20%. 자극이 완만하고 홍조·색소에 함께 작용합니다.' },
    { id: 'panthenol', name: '판테놀', sub: '진정·보습 (B5)', legend: '자극을 완충하는 보습 성분. 레티노이드·BPO와 궁합이 좋습니다.' },
    { id: 'ceramide', name: '세라마이드', sub: '장벽 보습', legend: '피부 지질을 채워 장벽을 회복합니다.' },
    { id: 'ha', name: '히알루론산', sub: '수분 보습', legend: '수분을 끌어당깁니다. 건조한 각질제거 후 보습에 좋습니다.' },
    { id: 'spf', name: '선크림', sub: '자외선 차단', legend: '레티노이드·AHA 사용 중에는 매일 필수입니다.' },
    { id: 'iso', name: '먹는 이소트레티노인', sub: '경구 여드름약 (처방)', legend: '피지를 강하게 줄여 극도로 건조해집니다. 복용 중 외용 각질제거·시술 금지.' }
  ];

  /* ---------- 규칙 ---------- */
  var RULES = [
    { a: 'retinol', b: 'tretinoin', level: 'bad', title: '레티노이드 중복', why: '같은 비타민A 계열을 두 개 겹치면 각질·홍조·박피가 급증합니다.', how: '둘 중 하나만 사용. 트레티노인 처방 중이면 레티놀은 중단하세요.' },
    { a: 'retinol', b: 'adapalene', level: 'bad', title: '레티노이드 중복', why: '레티노이드 두 종을 같이 쓰면 자극이 배로 늘고 이득은 없습니다.', how: '하나만 선택해 적응기를 거친 뒤 필요하면 교체하세요.' },
    { a: 'tretinoin', b: 'adapalene', level: 'bad', title: '레티노이드 중복', why: '처방 레티노이드끼리 겹치면 장벽 손상 위험이 큽니다.', how: '처방받은 한 가지만 사용하세요.' },
    { a: 'tretinoin', b: 'aha', level: 'bad', title: '레티노이드 × 산(AHA)', why: '각질 제거가 겹쳐 화상 같은 자극·흉터 위험이 있습니다.', how: '트레티노인 사용 기간에는 AHA를 중단하고, 보습·자외선차단에 집중하세요.' },
    { a: 'tretinoin', b: 'bha', level: 'bad', title: '레티노이드 × 산(BHA)', why: '각질 턴오버가 겹쳐 따가움·홍조가 심해집니다.', how: '트레티노인과 BHA는 같은 시기에 쓰지 마세요.' },
    { a: 'bpo', b: 'aha', level: 'bad', title: 'BPO × AHA', why: 'BPO의 강한 산화·건조에 AHA 각질까지 겹쳐 장벽이 쉽게 무너집니다.', how: '같은 날 사용 금지. BPO를 아침에 쓴다면 AHA는 주 1~2회 다른 날 저녁에.' },
    { a: 'bpo', b: 'vitc', level: 'bad', title: 'BPO × 비타민C', why: 'BPO가 아스코르빈산을 산화시켜 비타민C 효과를 없앱니다(제품 갈변).', how: '아침 비타민C / 저녁 BPO로 시간을 나누거나, 여드름 치료 기간에는 비타민C를 잠시 쉬세요.' },
    { a: 'bpo', b: 'retinol', level: 'warn', title: 'BPO × 레티놀', why: 'BPO가 레티놀을 산화시키고 건조·자극이 겹칩니다.', how: '아침 BPO / 저녁 레티놀로 분리하고, 사이에 보습을 충분히.' },
    { a: 'bpo', b: 'tretinoin', level: 'warn', title: 'BPO × 트레티노인', why: '따로 사서 같은 시간에 바르면 자극이 커집니다(고정 복합제는 예외).', how: '아침 BPO / 저녁 트레티노인. 처방 복합제는 의사 지시대로.' },
    { a: 'bpo', b: 'bha', level: 'warn', title: 'BPO × BHA', why: '건조·각질 작용이 겹쳐 붉어짐과 따가움이 생기기 쉽습니다.', how: '같은 날 겹치지 말고, BPO를 쓴 날은 BHA를 건너뛰세요.' },
    { a: 'bpo', b: 'azelaic', level: 'ok', title: 'BPO + 아젤라산', why: '여드름 치료에서 함께 쓰는 조합으로 근거가 있습니다.', how: '따로 쓰면 자극이 겹칠 수 있으니 아침·저녁으로 나눠 바르세요.' },
    { a: 'aha', b: 'bha', level: 'warn', title: 'AHA × BHA', why: '두 산을 같은 날 겹치면 각질·자극이 중복됩니다.', how: '하나를 고르거나, 주 2~3회씩 다른 날에 사용하세요.' },
    { a: 'aha', b: 'vitc', level: 'warn', title: 'AHA × 고농도 비타민C', why: '둘 다 pH가 낮아 함께 바르면 따가움·홍조가 커집니다.', how: '아침 비타민C / 저녁 AHA로 분리하세요.' },
    { a: 'aha', b: 'azelaic', level: 'warn', title: 'AHA × 아젤라산', why: '각질·자극 작용이 겹칩니다.', how: '격일로 나누거나 AHA를 주 1~2회로 줄이세요.' },
    { a: 'bha', b: 'vitc', level: 'warn', title: 'BHA × 고농도 비타민C', why: '산이 겹쳐 자극이 커지고 흡수가 불규칙해질 수 있습니다.', how: '아침 C / 저녁 BHA로 시간을 나누세요.' },
    { a: 'bha', b: 'azelaic', level: 'warn', title: 'BHA × 아젤라산', why: '자극이 겹칠 수 있습니다.', how: '같은 시간에 바르지 말고 하루씩 번갈아 사용하세요.' },
    { a: 'retinol', b: 'aha', level: 'warn', title: '레티놀 × AHA', why: '각질 작용이 겹쳐 홍조·따가움이 생기기 쉽습니다.', how: '아침 AHA / 저녁 레티놀, 또는 격일로 나누세요.' },
    { a: 'retinol', b: 'bha', level: 'warn', title: '레티놀 × BHA', why: '각질·건조가 겹칩니다.', how: '같은 날 밤에는 하나만. 다른 날로 나누는 게 안전합니다.' },
    { a: 'retinol', b: 'azelaic', level: 'warn', title: '레티놀 × 아젤라산', why: '자극이 겹칠 수 있습니다(특히 처방 아젤라산 15~20%).', how: '아침 아젤라산 / 저녁 레티놀로 분리하세요.' },
    { a: 'adapalene', b: 'aha', level: 'warn', title: '아다팔렌 × AHA', why: '레티노이드와 산이 겹쳐 자극이 커집니다.', how: '격일 또는 아침·저녁으로 분리하세요.' },
    { a: 'adapalene', b: 'bha', level: 'warn', title: '아다팔렌 × BHA', why: '각질 작용이 겹칩니다.', how: '같은 밤에 겹치지 말고 번갈아 사용하세요.' },
    { a: 'vitc', b: 'niacinamide', level: 'warn', title: '비타민C × 나이아신아마이드', why: '고농도 비타민C와 함께 쓸 때 홍조·자극을 호소하는 경우가 있습니다(최근 연구는 병용 무해).', how: '따갑거나 붉어지면 아침 비타민C / 저녁 나이아신아마이드로 나누세요.' },
    { a: 'retinol', b: 'vitc', level: 'warn', title: '레티놀 × 고농도 비타민C', why: '산성 비타민C와 레티놀이 겹치면 자극·불안정이 생길 수 있습니다.', how: '아침 비타민C / 저녁 레티놀이 표준입니다.' },
    { a: 'iso', b: 'retinol', level: 'bad', title: '경구 이소트레티노인 × 레티놀', why: '피지가 이미 줄어든 상태에서 레티노이드까지 겹치면 심한 건조·박피가 생깁니다.', how: '복용 중에는 외용 레티노이드를 중단하세요.' },
    { a: 'iso', b: 'tretinoin', level: 'bad', title: '경구 이소트레티노인 × 트레티노인', why: '자극·건조가 겹쳐 장벽이 손상됩니다.', how: '복용 중에는 외용 트레티노인을 중단하고 보습·자차에 집중하세요.' },
    { a: 'iso', b: 'adapalene', level: 'bad', title: '경구 이소트레티노인 × 아다팔렌', why: '자극이 겹칩니다.', how: '복용 기간에는 외용 레티노이드를 쓰지 마세요.' },
    { a: 'iso', b: 'aha', level: 'bad', title: '경구 이소트레티노인 × AHA', why: '각질제거로 피부가 벗겨지고 흉터·자극 위험이 커집니다.', how: '복용 중에는 AHA·필링·레이저 시술을 피하세요.' },
    { a: 'iso', b: 'bha', level: 'bad', title: '경구 이소트레티노인 × BHA', why: '건조한 피부에 각질제거가 겹치면 염증이 생깁니다.', how: '복용 중에는 BHA를 중단하세요.' },
    { a: 'iso', b: 'bpo', level: 'bad', title: '경구 이소트레티노인 × BPO', why: '건조·자극이 겹쳐 심하게 붉어질 수 있습니다.', how: '복용 중에는 BPO 사용을 멈추고 순한 세안·보습만.' },
    { a: 'iso', b: 'azelaic', level: 'warn', title: '경구 이소트레티노인 × 아젤라산', why: '자극이 겹칠 수 있습니다.', how: '꼭 필요하면 처방 의사와 상의해 소량만, 보습을 충분히.' },
    { a: 'iso', b: 'vitc', level: 'warn', title: '경구 이소트레티노인 × 고농도 비타민C', why: '건조한 피부에 산성 제품이 자극이 될 수 있습니다.', how: '복용 중에는 저자극 보습 위주로, 비타민C는 잠시 쉬세요.' },

    // 시너지
    { a: 'retinol', b: 'ceramide', level: 'ok', title: '레티놀 + 세라마이드', why: '레티놀의 건조·자극을 세라마이드가 완충해 적응이 편해집니다.', how: '레티놀 뒤 세라마이드 크림으로 마무리.' },
    { a: 'retinol', b: 'panthenol', level: 'ok', title: '레티놀 + 판테놀', why: '진정·보습으로 자극을 줄입니다.', how: '같은 루틴에 함께 사용해도 좋습니다.' },
    { a: 'retinol', b: 'niacinamide', level: 'ok', title: '레티놀 + 나이아신아마이드', why: '장벽·색소에 함께 작용하고 레티놀 자극을 완화합니다.', how: '나이아신아마이드 → 레티놀 순서로.' },
    { a: 'retinol', b: 'ha', level: 'ok', title: '레티놀 + 히알루론산', why: '건조함을 채워 각질·당김을 줄입니다.', how: '히알루론산 → 레티놀 → 보습크림.' },
    { a: 'retinol', b: 'spf', level: 'ok', title: '레티놀 + 선크림', why: '레티놀은 빛에 약하고 광민감성을 높여 자차가 필수입니다.', how: '다음 날 아침 SPF 30~50을 충분히.' },
    { a: 'tretinoin', b: 'ceramide', level: 'ok', title: '트레티노인 + 세라마이드', why: '장벽 회복으로 트레티노인 적응기를 견디기 쉽게 합니다.', how: '트레티노인 뒤 보습 크림을 넉넉히.' },
    { a: 'tretinoin', b: 'panthenol', level: 'ok', title: '트레티노인 + 판테놀', why: '진정 작용으로 자극을 완화합니다.', how: '같은 루틴 사용 가능.' },
    { a: 'tretinoin', b: 'ha', level: 'ok', title: '트레티노인 + 히알루론산', why: '건조함을 줄여 박피를 완화합니다.', how: '보습 단계에서 함께.' },
    { a: 'tretinoin', b: 'niacinamide', level: 'ok', title: '트레티노인 + 나이아신아마이드', why: '색소·장벽에 함께 작용합니다.', how: '아침 나이아신아마이드, 저녁 트레티노인.' },
    { a: 'tretinoin', b: 'spf', level: 'ok', title: '트레티노인 + 선크림', why: '트레티노인 사용 중 자외선은 자극·색소를 키웁니다.', how: '매일 아침 SPF 30 이상, 실내에서도.' },
    { a: 'adapalene', b: 'niacinamide', level: 'ok', title: '아다팔렌 + 나이아신아마이드', why: '여드름·색소에 함께 작용합니다.', how: '아침·저녁으로 나눠 사용.' },
    { a: 'adapalene', b: 'ceramide', level: 'ok', title: '아다팔렌 + 세라마이드', why: '장벽을 채워 자극을 줄입니다.', how: '아다팔렌 뒤 보습 크림.' },
    { a: 'adapalene', b: 'panthenol', level: 'ok', title: '아다팔렌 + 판테놀', why: '진정·보습으로 자극 완화.', how: '같은 루틴 사용 가능.' },
    { a: 'adapalene', b: 'ha', level: 'ok', title: '아다팔렌 + 히알루론산', why: '건조함 완화.', how: '보습 단계에서.' },
    { a: 'adapalene', b: 'spf', level: 'ok', title: '아다팔렌 + 선크림', why: '자외선 차단이 치료 효과를 지킵니다.', how: '아침 필수.' },
    { a: 'aha', b: 'niacinamide', level: 'ok', title: 'AHA + 나이아신아마이드', why: '각질 정돈과 색소·장벽을 함께 챙깁니다.', how: '나이아신아마이드 먼저, AHA 나중.' },
    { a: 'aha', b: 'ceramide', level: 'ok', title: 'AHA + 세라마이드', why: '각질제거 후 장벽을 회복시킵니다.', how: 'AHA 뒤 보습 크림 필수.' },
    { a: 'aha', b: 'panthenol', level: 'ok', title: 'AHA + 판테놀', why: '자극을 완충합니다.', how: '같은 루틴 가능.' },
    { a: 'aha', b: 'ha', level: 'ok', title: 'AHA + 히알루론산', why: '각질 후 수분을 채웁니다.', how: 'AHA 뒤 즉시 보습.' },
    { a: 'aha', b: 'spf', level: 'ok', title: 'AHA + 선크림', why: 'AHA는 광민감성을 높여 자차가 필수입니다.', how: '아침 SPF 필수, AHA는 저녁.' },
    { a: 'bha', b: 'niacinamide', level: 'ok', title: 'BHA + 나이아신아마이드', why: '모공 피지와 색소·장벽을 함께 관리합니다.', how: '같은 루틴 사용 가능.' },
    { a: 'bha', b: 'ceramide', level: 'ok', title: 'BHA + 세라마이드', why: '각질제거 후 장벽 회복.', how: 'BHA 뒤 보습.' },
    { a: 'bha', b: 'panthenol', level: 'ok', title: 'BHA + 판테놀', why: '진정·보습 완충.', how: '같은 루틴 가능.' },
    { a: 'bha', b: 'ha', level: 'ok', title: 'BHA + 히알루론산', why: '건조함 완화.', how: 'BHA 뒤 수분 보습.' },
    { a: 'bha', b: 'spf', level: 'ok', title: 'BHA + 선크림', why: '자극받은 피부를 자외선에서 보호합니다.', how: '아침 SPF 필수.' },
    { a: 'bpo', b: 'ceramide', level: 'ok', title: 'BPO + 세라마이드', why: 'BPO의 건조함을 장벽 성분이 완충합니다.', how: 'BPO 뒤 보습 크림 넉넉히.' },
    { a: 'bpo', b: 'panthenol', level: 'ok', title: 'BPO + 판테놀', why: '진정·보습으로 따가움을 줄입니다.', how: '같은 루틴 사용 가능.' },
    { a: 'bpo', b: 'ha', level: 'ok', title: 'BPO + 히알루론산', why: '건조함 완화.', how: '보습 단계에서.' },
    { a: 'bpo', b: 'spf', level: 'ok', title: 'BPO + 선크림', why: 'BPO는 광민감성을 높일 수 있습니다.', how: '아침 SPF 필수.' },
    { a: 'vitc', b: 'spf', level: 'ok', title: '비타민C + 선크림', why: '항산화 + 자외선 차단은 낮 루틴의 표준 조합입니다.', how: '비타민C → 선크림 순서.' },
    { a: 'vitc', b: 'ha', level: 'ok', title: '비타민C + 히알루론산', why: '산성 비타민C의 건조함을 수분으로 보완합니다.', how: '비타민C 뒤 히알루론산.' },
    { a: 'vitc', b: 'panthenol', level: 'ok', title: '비타민C + 판테놀', why: '자극 완충·보습.', how: '같은 루틴 가능.' },
    { a: 'azelaic', b: 'niacinamide', level: 'ok', title: '아젤라산 + 나이아신아마이드', why: '홍조·색소에 함께 작용합니다.', how: '아침·저녁으로 나눠 사용.' },
    { a: 'azelaic', b: 'ceramide', level: 'ok', title: '아젤라산 + 세라마이드', why: '자극을 완충하고 장벽을 회복합니다.', how: '아젤라산 뒤 보습.' },
    { a: 'azelaic', b: 'panthenol', level: 'ok', title: '아젤라산 + 판테놀', why: '진정 완충.', how: '같은 루틴 가능.' },
    { a: 'azelaic', b: 'ha', level: 'ok', title: '아젤라산 + 히알루론산', why: '건조함 완화.', how: '보습 단계에서.' },
    { a: 'azelaic', b: 'spf', level: 'ok', title: '아젤라산 + 선크림', why: '색소 치료에는 자차가 필수입니다.', how: '아침 SPF.' },
    { a: 'niacinamide', b: 'ceramide', level: 'ok', title: '나이아신아마이드 + 세라마이드', why: '장벽 지질과 색소를 함께 관리합니다.', how: '같은 루틴 사용 가능.' },
    { a: 'niacinamide', b: 'panthenol', level: 'ok', title: '나이아신아마이드 + 판테놀', why: '진정·보습 시너지.', how: '같은 루틴 사용 가능.' },
    { a: 'niacinamide', b: 'ha', level: 'ok', title: '나이아신아마이드 + 히알루론산', why: '수분·색소를 함께.', how: '같은 루틴 사용 가능.' },
    { a: 'iso', b: 'ceramide', level: 'ok', title: '이소트레티노인 + 세라마이드', why: '복용 중 건조해진 피부에 필수적인 보습입니다.', how: '하루 2~3회 보습, 립밤도 함께.' },
    { a: 'iso', b: 'panthenol', level: 'ok', title: '이소트레티노인 + 판테놀', why: '진정·보습으로 건조함을 완화합니다.', how: '수시로 덧바르세요.' },
    { a: 'iso', b: 'ha', level: 'ok', title: '이소트레티노인 + 히알루론산', why: '수분 보충.', how: '보습 단계에서.' },
    { a: 'iso', b: 'spf', level: 'ok', title: '이소트레티노인 + 선크림', why: '복용 중 광민감성이 커져 자차가 필수입니다.', how: '매일 SPF 30 이상.' }
  ];

  var PRESETS = {
    acne: ['bpo', 'bha', 'niacinamide', 'ceramide', 'spf'],
    aging: ['retinol', 'vitc', 'niacinamide', 'ceramide', 'spf'],
    sensitive: ['azelaic', 'panthenol', 'ceramide', 'ha', 'spf']
  };

  var STORE = 'fchl-skin-v1';
  var state = { selected: [] };

  var $ = function (id) { return document.getElementById(id); };
  var resultEl = $('result');

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify({ selected: state.selected })); } catch (e) {}
  }
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(STORE); } catch (e) {}
    if (!raw) return;
    try {
      var d = JSON.parse(raw);
      if (d && Array.isArray(d.selected)) {
        state.selected = d.selected.filter(function (id) { return INGS.some(function (g) { return g.id === id; }); });
      }
    } catch (e) {}
  }
  function has(id) { return state.selected.indexOf(id) >= 0; }
  function ing(id) { return INGS.filter(function (g) { return g.id === id; })[0]; }
  function toggleIng(id, force) {
    var on = has(id);
    if (force === true && on) return;
    if (force === false && !on) return;
    if (on) state.selected = state.selected.filter(function (x) { return x !== id; });
    else state.selected.push(id);
    save();
    renderGrid();
    render(false);
  }

  /* ---------- 그리드 ---------- */
  function renderGrid() {
    var grid = $('ingGrid');
    grid.innerHTML = INGS.map(function (g) {
      var on = has(g.id);
      return '<button class="ing' + (on ? ' is-on' : '') + '" type="button" data-ing="' + g.id + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        '<span class="ing__check" aria-hidden="true">✓</span>' +
        '<span class="ing__name">' + g.name + '</span>' +
        '<span class="ing__sub">' + g.sub + '</span>' +
      '</button>';
    }).join('');
    grid.querySelectorAll('.ing').forEach(function (b) {
      b.addEventListener('click', function () { toggleIng(b.getAttribute('data-ing')); });
    });
    $('ingCount').textContent = state.selected.length + ' / ' + INGS.length;
  }

  function renderLegend() {
    var box = $('ingLegend');
    if (!box) return;
    box.innerHTML = INGS.map(function (g) {
      return '<div class="kv__row"><span class="kv__k"><b>' + g.name + '</b> <span class="small muted">' + g.sub + '</span></span></div>' +
        '<p class="field__hint" style="margin:-4px 0 6px">' + g.legend + '</p>';
    }).join('');
  }

  /* ---------- 계산 ---------- */
  function matched() {
    var out = { bad: [], warn: [], ok: [] };
    RULES.forEach(function (r) {
      if (has(r.a) && has(r.b)) out[r.level].push(r);
    });
    return out;
  }

  var lastText = '';

  function render(scroll) {
    if (!state.selected.length) {
      resultEl.innerHTML = '<div class="result__empty">' +
        '<span class="result__empty-icon" aria-hidden="true">🧴</span>' +
        '<strong>성분을 체크하면 궁합이 나옵니다</strong>' +
        '<span>지금 쓰는 제품의 성분을 2개 이상 체크해 보세요. 충돌·분리·시너지와 아침·저녁 루틴을 정리해 드립니다.</span>' +
        '</div>';
      lastText = '';
      return;
    }

    var m = matched();
    var total = state.selected.length;

    var vCls, vIcon, vTitle, vDesc;
    if (m.bad.length) {
      vCls = 'verdict--bad'; vIcon = '🔴';
      vTitle = '같이 쓰면 안 되는 조합 ' + m.bad.length + '쌍';
      vDesc = m.bad.map(function (r) { return ing(r.a).name + '×' + ing(r.b).name; }).join(' · ') + ' — 같은 날 사용을 멈추고 아래 루틴으로 바꾸세요.';
    } else if (m.warn.length) {
      vCls = 'verdict--warn'; vIcon = '🟡';
      vTitle = '시간을 나눠야 하는 조합 ' + m.warn.length + '쌍';
      vDesc = m.warn.map(function (r) { return ing(r.a).name + '×' + ing(r.b).name; }).join(' · ') + ' — 아침·저녁 또는 격일로 분리하면 함께 쓸 수 있습니다.';
    } else {
      vCls = 'verdict--ok'; vIcon = '🟢';
      vTitle = '충돌 조합 없음';
      vDesc = '체크한 ' + total + '개 성분에서 같은 날 피해야 할 조합이 없습니다. 아래 루틴대로 쓰면 됩니다.';
    }

    var html = '<div class="result reveal">' +
      '<div class="verdict ' + vCls + '">' +
        '<span class="verdict__icon" aria-hidden="true">' + vIcon + '</span>' +
        '<div class="verdict__body">' +
          '<p class="verdict__kicker">성분 ' + total + '개 체크 · 🔴 ' + m.bad.length + ' · 🟡 ' + m.warn.length + ' · 🟢 ' + m.ok.length + '</p>' +
          '<p class="verdict__title">' + vTitle + '</p>' +
          '<p class="verdict__desc">' + vDesc + '</p>' +
        '</div>' +
      '</div>';

    if (m.bad.length) {
      html += '<div class="card">' +
        '<div class="card__head"><span class="card__icon" aria-hidden="true">🔴</span><span class="card__title">같이 쓰지 마세요</span><span class="card__note">' + m.bad.length + '쌍</span></div>' +
        m.bad.map(function (r) {
          return '<div class="combo combo--bad">' +
            '<div class="combo__head"><span class="combo__name">' + ing(r.a).name + ' × ' + ing(r.b).name + '</span><span class="badge badge--bad">' + r.title + '</span></div>' +
            '<p class="combo__why">' + r.why + '</p>' +
            '<p class="combo__how"><b>이렇게:</b> ' + r.how + '</p>' +
          '</div>';
        }).join('') +
      '</div>';
    }

    if (m.warn.length) {
      html += '<div class="card">' +
        '<div class="card__head"><span class="card__icon" aria-hidden="true">🟡</span><span class="card__title">아침·저녁로 나누세요</span><span class="card__note">' + m.warn.length + '쌍</span></div>' +
        m.warn.map(function (r) {
          return '<div class="combo combo--warn">' +
            '<div class="combo__head"><span class="combo__name">' + ing(r.a).name + ' × ' + ing(r.b).name + '</span><span class="badge badge--warn">' + r.title + '</span></div>' +
            '<p class="combo__why">' + r.why + '</p>' +
            '<p class="combo__how"><b>이렇게:</b> ' + r.how + '</p>' +
          '</div>';
        }).join('') +
      '</div>';
    }

    if (m.ok.length) {
      var shown = m.ok.slice(0, 6);
      html += '<div class="card">' +
        '<div class="card__head"><span class="card__icon" aria-hidden="true">🟢</span><span class="card__title">같이 쓰면 좋은 조합</span><span class="card__note">' + m.ok.length + '쌍</span></div>' +
        shown.map(function (r) {
          return '<div class="combo combo--ok">' +
            '<div class="combo__head"><span class="combo__name">' + ing(r.a).name + ' + ' + ing(r.b).name + '</span><span class="badge badge--ok">시너지</span></div>' +
            '<p class="combo__why">' + r.why + '</p>' +
            '<p class="combo__how"><b>이렇게:</b> ' + r.how + '</p>' +
          '</div>';
        }).join('') +
        (m.ok.length > shown.length ? '<p class="field__hint mt-8">외 ' + (m.ok.length - shown.length) + '쌍도 문제없이 함께 쓸 수 있습니다.</p>' : '') +
      '</div>';
    }

    // 루틴
    html += routineHTML(m);

    // 장벽 체크
    var actives = ['retinol', 'tretinoin', 'adapalene', 'aha', 'bha', 'bpo'].filter(has);
    var barrier = ['ceramide', 'panthenol', 'ha'].filter(has);
    if (actives.length && !barrier.length) {
      html += '<div class="card" style="background:var(--amber-soft);border-color:color-mix(in srgb,var(--amber) 34%,var(--line))">' +
        '<div class="card__head"><span class="card__icon" aria-hidden="true">🧱</span><span class="card__title">장벽 보습이 비어 있어요</span></div>' +
        '<p class="field__hint" style="margin:0">자극 성분(' + actives.map(function (id) { return ing(id).name; }).join(', ') + ')을 쓰면서 <b>세라마이드·판테놀·히알루론산</b>이 없습니다. 보습 크림 하나만 추가해도 따가움과 각질이 크게 줄어듭니다.</p>' +
      '</div>';
    }

    var tips = [];
    if (has('spf')) tips.push('선크림은 아침 마지막 단계에 <b>500원 동전 크기(얼굴 기준)</b>로 충분히. 실내에서도 창가라면 발라 주세요.');
    else tips.push('선크림이 체크되어 있지 않습니다. 레티노이드·AHA를 쓴다면 <b>SPF 30 이상</b>이 사실상 필수입니다.');
    tips.push('새 제품은 한 번에 하나씩, <b>2주 간격</b>으로 추가하세요. 동시에 바꾸면 무엇이 문제인지 알 수 없습니다.');
    if (has('bpo')) tips.push('BPO는 수건·베개·옷을 표백합니다. 흰색 수건을 쓰고, 바른 뒤 손을 씻으세요.');
    if (has('vitc')) tips.push('고농도 비타민C는 빛·공기에 약합니다. 갈색 병에 담아 서늘한 곳에 두고, 색이 진해지면 교체하세요.');
    if (has('iso')) tips.push('경구 이소트레티노인 복용 중에는 <b>왁싱·필링·레이저 시술을 피하고</b>, 입술·눈가 건조에 립밤·보습을 수시로 바르세요.');

    html += '<div class="card">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">💡</span><span class="card__title">사용 팁</span></div>' +
      '<div class="tips">' + tips.map(function (t, i) {
        return '<div class="tip"><span class="tip__n">' + (i + 1) + '</span><span class="tip__text">' + t + '</span></div>';
      }).join('') + '</div>' +
      '<button class="btn btn--sm btn--block mt-12" type="button" id="copyBtn">루틴 복사</button>' +
    '</div>' +
    '<p class="disclaimer"><b>참고용 안내</b> — 성분 병용 정보를 정리한 참고 도구이며 진단·치료가 아닙니다. 같은 성분도 농도·제형·피부 상태에 따라 반응이 다르고, 처방약 사용 중에는 의사 지시가 우선입니다. 심한 자극·발진이 생기면 사용을 중단하고 피부과 진료를 받으세요.</p>' +
    '</div>';

    resultEl.innerHTML = html;

    var copyBtn = $('copyBtn');
    if (copyBtn) copyBtn.addEventListener('click', function () { copy(m); });

    lastText = buildText(m);

    if (scroll && window.innerWidth < 980) {
      var top = resultEl.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: top, behavior: 'smooth' });
    }
  }

  /* ---------- 루틴 생성 ---------- */
  var NIGHT_ORDER = ['tretinoin', 'adapalene', 'retinol', 'aha', 'bha', 'azelaic'];

  function routineHTML(m) {
    var iso = has('iso');
    var nightActives = NIGHT_ORDER.filter(has);
    var bpo = has('bpo');
    var vitc = has('vitc');
    var nia = has('niacinamide');
    var moisturizers = ['ceramide', 'panthenol', 'ha'].filter(has).map(function (id) { return ing(id).name; });
    var moRow = moisturizers.length ? moisturizers.join(' · ') : '보습 크림(세라마이드 권장)';

    var am = [];
    am.push('순한 세안 (미지근한 물)');
    if (vitc) am.push('고농도 비타민C (물기 살짝 남은 상태)');
    if (nia) am.push('나이아신아마이드');
    if (bpo && !vitc) am.push('벤조일퍼옥사이드 (BPO) — 해당 부위만 얇게');
    am.push('보습 — ' + moRow);
    am.push('선크림 SPF 30~50 (필수)');

    var pm = [];
    pm.push('세안 (저녁은 이중세안 가능)');
    if (bpo && vitc) pm.push('벤조일퍼옥사이드 (BPO) — 비타민C와 시간 분리');
    if (!iso) {
      if (nightActives.length === 1) pm.push(ing(nightActives[0]).name + ' — 매일 밤, 적응기 2~4주');
      else if (nightActives.length > 1) pm.push(ing(nightActives[0]).name + ' 등 — 아래 교대 스케줄 참고');
    } else {
      pm.push('보습만 (외용 각질제거·레티노이드 중단)');
    }
    pm.push('보습 — ' + moRow + (has('ceramide') ? ' (충분히)' : ''));
    if (has('iso')) pm.push('립밤 · 손·눈가 보습');

    var stepsAM = am.map(function (s, i) {
      return '<tr><td class="rtable__step">' + (i + 1) + '</td><td>' + s + '</td></tr>';
    }).join('');
    var stepsPM = pm.map(function (s, i) {
      return '<tr><td class="rtable__step">' + (i + 1) + '</td><td>' + s + '</td></tr>';
    }).join('');

    var html = '<div class="card">' +
      '<div class="card__head"><span class="card__icon" aria-hidden="true">🗓️</span><span class="card__title">추천 루틴</span><span class="card__note">체크한 성분 기준</span></div>' +
      '<p class="field__label">아침</p>' +
      '<table class="rtable"><tbody>' + stepsAM + '</tbody></table>' +
      '<p class="field__label mt-12">저녁</p>' +
      '<table class="rtable"><tbody>' + stepsPM + '</tbody></table>';

    if (!iso && nightActives.length > 1) {
      var days = ['월', '화', '수', '목', '금', '토', '일'];
      var slots = nightActives.slice(0, 3);
      var rows = days.map(function (d, i) {
        var pick = slots[i % slots.length];
        var restDay = i >= 5 && slots.length >= 2;
        return '<tr><td class="rtable__step">' + d + '</td><td>' + (restDay ? '보습 휴식 (자극 성분 쉼)' : ing(pick).name) + '</td></tr>';
      }).join('');
      html += '<p class="field__label mt-12">교대 스케줄 (밤)</p>' +
        '<table class="rtable"><thead><tr><th>요일</th><th>밤 자극 성분</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<p class="field__hint mt-8">자극 성분이 여러 개면 <b>하루에 하나만</b> 쓰는 게 원칙입니다. 주 2일은 보습만 바르는 휴식일로 두세요.</p>';
    }

    html += '</div>';
    return html;
  }

  /* ---------- 텍스트 ---------- */
  function buildText(m) {
    var lines = ['[피부 성분 궁합] ' + state.selected.length + '개 체크'];
    if (m.bad.length) {
      lines.push('🔴 같이 쓰지 마세요: ' + m.bad.map(function (r) { return ing(r.a).name + '×' + ing(r.b).name; }).join(', '));
    }
    if (m.warn.length) {
      lines.push('🟡 시간 분리: ' + m.warn.map(function (r) { return ing(r.a).name + '×' + ing(r.b).name; }).join(', '));
    }
    if (!m.bad.length && !m.warn.length) lines.push('🟢 충돌 조합 없음');
    var nightActives = NIGHT_ORDER.filter(has).map(function (id) { return ing(id).name; });
    if (nightActives.length) lines.push('밤 자극 성분: ' + nightActives.join(' / ') + (nightActives.length > 1 ? ' → 하루 하나씩 교대' : ''));
    lines.push('', '팩트체크 건강연구소 피부 성분 체크기 https://hjh7085-bit.github.io/skin-lab/');
    return lines.join('\n');
  }

  function copy(m) {
    var text = lastText || buildText(m);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('루틴을 복사했어요'); }, fb);
    } else fb();
    function fb() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('루틴을 복사했어요'); } catch (e) { toast('복사가 막혀 있어요'); }
      document.body.removeChild(ta);
    }
  }

  /* ---------- 프리셋 ---------- */
  document.querySelectorAll('#presetRow [data-preset]').forEach(function (b) {
    b.addEventListener('click', function () {
      var key = b.getAttribute('data-preset');
      if (key === 'clear') {
        state.selected = [];
      } else {
        state.selected = PRESETS[key].slice();
      }
      save();
      document.querySelectorAll('#presetRow .preset').forEach(function (p) {
        p.classList.toggle('is-on', p === b && key !== 'clear');
      });
      renderGrid();
      render(false);
      toast(key === 'clear' ? '선택을 비웠어요' : '프리셋을 적용했어요');
    });
  });

  var calcBar = $('calcBar');
  if (calcBar) calcBar.addEventListener('click', function () {
    if (!state.selected.length) {
      toast('성분을 하나 이상 체크해 주세요');
      $('tool').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    render(true);
  });

  /* ---------- 초기화 ---------- */
  load();
  renderGrid();
  renderLegend();
  render(false);
})();
