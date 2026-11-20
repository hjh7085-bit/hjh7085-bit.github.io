/* ============================================================
   tv.js — 📺 실시간 TV 뉴스 (국내 · 미국 유튜브 라이브 임베드)
   · 임베드 가능 여부를 확인한 공식 24시간 라이브 채널만 직접 재생
   · 자막은 cc_load_policy·cc_lang_pref·hl 파라미터로 기본 ON
   · 임베드에서 한국어 자동번역이 제한되므로 유튜브 직통 링크를 함께 제공
   ============================================================ */
(function () {
  'use strict';

  const MP = window.MP;
  if (!MP) return;

  const CHANNELS = {
    kr: [
      { name: '연합뉴스TV', id: '6QZ_qc75ihU', tag: '24시간 뉴스', embed: true },
      { name: 'YTN', id: 'aZyD6EPl6KU', tag: '24시간 뉴스', embed: true },
      { name: '한국경제TV', id: 'VlaCnp1fxI8', tag: '증시·경제', embed: true },
      { name: '서울경제TV', id: 'ciA-0rInLwQ', tag: '증시 라이브', embed: true },
    ],
    us: [
      { name: 'Bloomberg TV', id: 'QB5BNdBFujE', tag: '글로벌 마켓', embed: true },
      { name: 'Yahoo Finance', url: 'https://www.youtube.com/@YahooFinance/live', tag: '마켓 라이브', embed: false },
      { name: 'CNBC', url: 'https://www.cnbc.com/live-tv/', tag: '마켓·경제', embed: false },
    ],
  };

  const EMBED_OPTS = 'autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&cc_load_policy=1&cc_lang_pref=ko&hl=ko';

  let market = 'kr';
  let current = {};
  let panel, frame, chipsEl, noteEl, tabsEl;

  function embedUrl(id) {
    return 'https://www.youtube.com/embed/' + id + '?' + EMBED_OPTS;
  }
  function watchUrl(id) {
    return 'https://www.youtube.com/watch?v=' + id + '&hl=ko&cc_lang_pref=ko&cc_load_policy=1';
  }

  function paint() {
    const list = CHANNELS[market];
    if (!current[market]) current[market] = list[0];
    const ch = current[market];
    if (chipsEl) {
      chipsEl.innerHTML = list.map((c, i) =>
        '<button type="button" class="tv-chip' + (c === ch ? ' is-active' : '') + '" data-i="' + i + '">' +
        MP.escape(c.name) + '</button>').join('');
    }
    if (!ch.embed) {
      frame.innerHTML =
        '<div class="tv-blocked"><b>' + MP.escape(ch.name) + '</b>' +
        '<span>이 채널은 외부 사이트 재생이 차단되어 있어요. 공식 페이지에서 바로 시청하세요.</span>' +
        '<a class="tv-go" href="' + MP.escape(ch.url) + '" target="_blank" rel="noopener nofollow">▶ 공식 온에어로 보기 ↗</a></div>';
    } else {
      frame.innerHTML = '<iframe title="' + MP.escape(ch.name) + ' 실시간 방송" src="' + embedUrl(ch.id) +
        '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" referrerpolicy="origin"></iframe>';
    }
    if (noteEl) {
      noteEl.innerHTML = ch.embed
        ? '<a class="tv-cc" href="' + MP.escape(watchUrl(ch.id)) + '" target="_blank" rel="noopener nofollow">유튜브에서 한국어 자동번역 자막으로 보기 ↗</a>' +
          '<span class="tv-note">임베드 화면에서는 자막(CC)이 기본 켜지지만, 유튜브 정책상 한국어 자동번역 자막은 유튜브 앱·웹에서만 제공됩니다.</span>'
        : '<span class="tv-note">차단 채널은 공식 페이지에서 시청해 주세요.</span>';
    }
    if (tabsEl) {
      MP.$$('#tvTabs .tv-tab').forEach((b) => b.classList.toggle('is-active', b.dataset.market === market));
    }
  }

  function open(force) {
    if (!panel) return;
    const show = force === undefined ? panel.hidden : force;
    panel.hidden = !show;
    document.body.classList.toggle('tv-open', show);
    const btn = MP.$('#tvBtn');
    if (btn) btn.setAttribute('aria-pressed', show ? 'true' : 'false');
    if (show) paint();
    try { localStorage.setItem('mp.tvOpen', show ? '1' : '0'); } catch (e) {}
  }

  function init() {
    panel = MP.$('#tvPanel');
    if (!panel) return;
    frame = MP.$('#tvFrame');
    chipsEl = MP.$('#tvChips');
    noteEl = MP.$('#tvNote');
    tabsEl = MP.$('#tvTabs');

    const btn = MP.$('#tvBtn');
    if (btn) btn.addEventListener('click', () => open(panel.hidden));
    const close = MP.$('#tvClose');
    if (close) close.addEventListener('click', () => open(false));

    if (tabsEl) tabsEl.addEventListener('click', (e) => {
      const b = e.target.closest('.tv-tab');
      if (!b) return;
      market = b.dataset.market;
      paint();
    });
    if (chipsEl) chipsEl.addEventListener('click', (e) => {
      const b = e.target.closest('.tv-chip');
      if (!b) return;
      current[market] = CHANNELS[market][+b.dataset.i];
      paint();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.hidden) open(false);
    });

    // 종목이 미국/국내로 바뀌면 TV 탭도 따라가기
    MP.on('symbol-changed', (sym) => {
      if (panel.hidden) return;
      const next = /^KRX:/.test(sym) || /^UPBIT:/.test(sym) ? 'kr' : 'us';
      if (next !== market) { market = next; paint(); }
    });

    let wasOpen = false;
    try { wasOpen = localStorage.getItem('mp.tvOpen') === '1'; } catch (e) {}
    open(wasOpen);
  }

  document.addEventListener('DOMContentLoaded', init);
  MP.tv = { open: open, channels: CHANNELS };
})();
