#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
market-pulse 분봉·시간봉 수집기
------------------------------------------------------------
Yahoo Finance chart API 에서 종목별 1분봉(최근 5거래일)·5분봉(최근 20거래일)을 받아
data/intra/{코드}.json 으로 저장한다. 3·15·30·60·240분봉은 브라우저에서 리샘플한다.
코인은 업비트 API 를 브라우저에서 직접 호출하므로 여기서 수집하지 않는다.
"""
import json
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

from fetch_charts import SERIES, YAHOO_SERIES, http_json, round_prices

KST = timezone(timedelta(hours=9))
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "intra"


def yahoo_intraday(ticker, interval, range_, keep):
    import urllib.parse
    url = ("https://query1.finance.yahoo.com/v8/finance/chart/"
           + urllib.parse.quote(ticker) + f"?interval={interval}&range={range_}")
    d = http_json(url)
    res = d["chart"]["result"][0]
    ts = res.get("timestamp") or []
    q = res["indicators"]["quote"][0]
    bars = []
    for i, t in enumerate(ts):
        c = q["close"][i] if i < len(q["close"]) else None
        if c is None:
            continue
        o = q["open"][i] or c
        h = q["high"][i] or c
        l = q["low"][i] or c
        v = q["volume"][i] or 0
        bars.append([int(t), float(o), float(h), float(l), float(c), int(v)])
    bars.sort(key=lambda x: x[0])
    return bars[-keep:]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    targets = []
    for symbol, kind, code, name, alt in SERIES:
        targets.append((symbol, alt, name, "KRW"))
    for symbol, ticker, name, currency in YAHOO_SERIES:
        targets.append((symbol, ticker, name, currency))

    ok = 0
    for symbol, ticker, name, currency in targets:
        code = symbol.split(":")[1]
        path = OUT / (code + ".json")
        try:
            m1 = yahoo_intraday(ticker, "1m", "5d", 1200)
            time.sleep(0.12)
            m5 = yahoo_intraday(ticker, "5m", "1mo", 1200)
            if len(m1) < 60 and len(m5) < 60:
                raise ValueError(f"1분 {len(m1)} · 5분 {len(m5)}")
            obj = {
                "symbol": symbol,
                "name": name,
                "currency": currency,
                "generatedAt": datetime.now(KST).isoformat(timespec="seconds"),
                "m1": round_prices(m1, currency),
                "m5": round_prices(m5, currency),
            }
            path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            ok += 1
            print(f"  · {name:<16} 1분 {len(m1):>4} · 5분 {len(m5):>4} → {path.name} ({path.stat().st_size // 1024}KB)")
        except Exception as e:
            print(f"  ! {name} ({ticker}): {e}", file=sys.stderr)
        time.sleep(0.12)
    print(f"완료: {ok}/{len(targets)} 종목")


if __name__ == "__main__":
    main()
