"""터미널 분석 엔진 단위 실행 테스트 (quickjs).
terminal.js 의 분석 블록을 실제 캔들 데이터로 실행해 계산·문자열 출력을 검증한다.
"""
import json
import re
import sys
import quickjs

src = open('assets/js/terminal.js', encoding='utf-8').read()
start = src.index('  function numFmt(v) {')
end = src.index('  /* ---------- 초기화 ---------- */')
block = src[start:end]

DATA = json.load(open('data/charts-coin.json', encoding='utf-8'))
series = DATA['series']['UPBIT:BTCKRW']['bars']
bars_js = json.dumps([{'time': b[0] // 1000, 'open': b[1], 'high': b[2], 'low': b[3], 'close': b[4], 'volume': b[5]} for b in series[-200:]])

STUB = r"""
var __out = {};
function el(id) {
  return { id: id, innerHTML: '', textContent: '', className: '', title: '', style: {}, dataset: {},
    classList: { add: function(){}, remove: function(){}, toggle: function(){}, contains: function(){return false;} } };
}
var __els = {};
var MP = {
  $: function (sel) { if (!__els[sel]) __els[sel] = el(sel); if (sel === '#aiReasons' || sel === '#scenList') return __els[sel]; return __els[sel]; },
  escape: function (s) { return String(s); },
  toast: function () {},
  newsItems: [],
};
var state = { symbol: 'UPBIT:BTCKRW', tf: 'D' };
var TF_LABEL = { D: '일봉', W: '주봉', M: '월봉' };
var bars = %s;
var candleSeries = { setMarkers: function (m) { __out.markers = m; } };
var scenarioData = null;
var mainChart = null;
var drawCtx = null;
function palette() { return { up: '#E12343', down: '#1763E6', text: '#101828', muted: '#667085', bg: '#fff', border: '#E4E9F2' }; }
function nameOf() { return '비트코인'; }
function xOf() { return null; }
function yOf() { return null; }
function drawOverlay() {}
function applyScenarioSeries(sc) { __out.scen = sc; }
function renderAI_() {}
""" % bars_js

ctx = quickjs.Context()
ctx.eval(STUB)
ctx.eval(block)

report = {}
for strat in ['ma', 'rsi', 'bb', 'pull']:
    ctx.eval("strategy = '%s'; renderStrategy();" % strat)
    report[strat] = ctx.eval("""JSON.stringify({
      metrics: __els['#stratMetrics'].innerHTML,
      signal: __els['#stratSignal'].innerHTML,
      guide: __els['#stratGuide'].innerHTML,
      markers: (__out.markers || []).length,
      trades: __els['#stratTrades'].innerHTML
    })""")

ctx.eval("renderAI(); renderScenario(computeScenario());")
report['ai'] = ctx.eval("""JSON.stringify({
  sign: __els['#aiSign'].className,
  signHTML: __els['#aiSign'].innerHTML,
  headSign: __els['#shSign'].textContent,
  badge: __els['#aiBadge'].textContent,
  score: __els['#aiScore'].textContent,
  reasons: __els['#aiReasons'].innerHTML,
  sr: __els['#aiSR'].innerHTML,
  risk: __els['#aiRisk'].innerHTML
})""")
report['scen'] = ctx.eval("""JSON.stringify({
  list: __els['#scenList'].innerHTML,
  horizon: __els['#scenHorizon'].textContent
})""")
report['scenRaw'] = ctx.eval("JSON.stringify(__out.scen)")

for k, v in report.items():
    print('=== ' + k + ' ===')
    try:
        obj = json.loads(v)
        for kk, vv in obj.items():
            s = str(vv)
            print('  %s: %s' % (kk, re.sub(r'<[^>]+>', ' ', s).strip()[:400]))
    except Exception:
        print('  ', str(v)[:400])
