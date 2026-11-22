#!/usr/bin/env python3
"""Import a saved apify/web-fetch response (JSON with body.html) into cache/pg/<key>.html.
Usage: import_apify.py <apify_output_file> [key]  (key defaults to the search term in the page title)"""
import json, sys
from pathlib import Path
raw = open(sys.argv[1]).read()
d, _ = json.JSONDecoder().raw_decode(raw)
try:
    body = json.loads(d["body"]) if isinstance(d.get("body"), str) else d["body"]
except json.JSONDecodeError:  # response cut at 256 KB: salvage the html prefix
    b = d["body"]; i = b.index('"html":"') + 8; h = b[i:]
    for cut in range(0, 8):
        try:
            body = {"html": json.loads('"' + (h[:len(h) - cut] if cut else h) + '"')}; break
        except json.JSONDecodeError:
            continue
    else:
        raise
import re
m = re.search(r"<title>[^<]*?-\s*(.*?),\s*\w+ \d{4}", body["html"])
from urllib.parse import unquote, urlparse, parse_qs
req = urlparse(unquote(parse_qs(urlparse(d.get("path", "")).query).get("url", [""])[0]))  # the URL we asked Apify for
q = parse_qs(req.query).get("freetext", [None])[0]
pg = re.search(r"/property-for-(?:rent|sale)/(\d+)", req.path or "")
key = sys.argv[2] if len(sys.argv) > 2 else re.sub(r"[^a-z0-9]+", "-", (q or (m.group(1) if m else "unknown")).lower()).strip("-")
if pg and pg.group(1) != "1":
    key += f"-p{pg.group(1)}"
kind = "sale" if "for-sale" in (req.path or "") else "rent"
out = Path(__file__).parent / "cache" / "pg" / f"{kind}-{key}.html"
out.write_text(body["html"])
print(out, len(body["html"]), body.get("fetch", {}).get("loadedUrl"))
