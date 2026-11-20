"""JS 문법·최상위 실행 스모크 테스트 (quickjs, 개발 편의용)
실제 페이지처럼 app.js → quotes.js … 순서로 한 컨텍스트에 로드한다.
"""
import glob
import sys
import quickjs

STUB = r"""
var __docHandlers = [];
function el(){ return { classList:{add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}},
  style:{}, dataset:{}, hidden:false, textContent:'', innerHTML:'', value:'', title:'', children:[],
  appendChild:function(){}, setAttribute:function(){}, getAttribute:function(){return null;},
  addEventListener:function(){}, querySelector:function(){return null;}, querySelectorAll:function(){return [];},
  closest:function(){return null;}, focus:function(){}, blur:function(){}, click:function(){}, scrollIntoView:function(){} }; }
var document = {
  documentElement:{ getAttribute:function(){return 'dark';}, setAttribute:function(){} },
  body: el(),
  addEventListener:function(t,f){ if(t==='DOMContentLoaded') __docHandlers.push(f); },
  querySelector:function(){return null;}, querySelectorAll:function(){return [];},
  getElementById:function(){return null;}, createElement:function(){return el();}
};
var window = { matchMedia:function(){return {matches:false};}, addEventListener:function(){},
  location:{href:'https://example.com/'}, innerWidth:1200 };
var localStorage = { getItem:function(){return null;}, setItem:function(){}, removeItem:function(){} };
var location = window.location;
var history = { replaceState:function(){} };
var navigator = { userAgent:'test' };
var fetch = function(){ return Promise.reject(new Error('no network')); };
var setTimeout = function(){ return 0; };
var setInterval = function(){ return 0; };
var clearTimeout = function(){};
var clearInterval = function(){};
var WebSocket = function(){ this.send=function(){}; this.close=function(){}; this.readyState=0; };
var IntersectionObserver = function(){ this.observe=function(){}; };
var URLSearchParams = function(){ return { get:function(){return null;}, set:function(){}, }; };
var URL = { createObjectURL:function(){return 'blob:x';}, revokeObjectURL:function(){} };
var Blob = function(){};
var confirm = function(){ return false; };
var Intl = { NumberFormat:function(o){ return { format:function(n){ return String(n); } }; },
             DateTimeFormat:function(o){ return { format:function(){ return '2026-11-14'; }, formatToParts:function(){ return [{type:'weekday',value:'Sat'},{type:'hour',value:'21'},{type:'minute',value:'00'}]; } }; } };
"""

ctx = quickjs.Context()
ctx.eval(STUB)
failed = False
for f in sorted(glob.glob('assets/js/*.js')):
    src = open(f, encoding='utf-8').read()
    try:
        ctx.eval(src)
        print("OK   " + f)
    except Exception as e:
        failed = True
        print("FAIL " + f + " — " + str(e).splitlines()[0][:250])

# DOMContentLoaded 핸들러 실행 (DOM이 비어 있어 일부는 null 접근으로 멈출 수 있음)
ctx.eval("""
var __errs = [];
__docHandlers.forEach(function(h){ try { h(); } catch(e) { __errs.push(String(e)); } });
""")
err = ctx.eval("JSON.stringify(__errs)")
print("핸들러 오류:", err)
sys.exit(1 if failed else 0)
