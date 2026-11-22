#!/usr/bin/env python3
"""CLIP zero-shot + Laplacian blur + resolution screen for hero-photo candidates."""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
import cv2
import torch
import open_clip

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "scores.json"
LABS = [
    "a photograph of the exterior facade of a residential condominium or apartment tower",
    "an aerial or distant photograph of a specific apartment building or housing estate",
    "the street-facing exterior of a terrace house or landed home",
    "a clearly identifiable condominium swimming pool or lobby facility",
    "the interior of a room, bedroom, living room or empty unit",
    "a bathroom or toilet",
    "an architectural floor plan or unit layout diagram",
    "a marketing brochure or poster with lots of text and graphics",
    "a close-up of furniture, a door, a wall or a ceiling fan",
    "a blurry, heavily watermarked or very low-quality photo",
]
KIND = {
    0: "exterior", 1: "exterior", 2: "exterior", 3: "facility",
    4: "interior", 5: "interior", 6: "floorplan", 7: "brochure",
    8: "detail", 9: "bad",
}

def lap_var(im):
    g = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2GRAY)
    return float(cv2.Laplacian(g, cv2.CV_64F).var())

def watermark_score(im):
    """Rough watermark/text-heaviness: fraction of mid-contrast edges in the lower-right and center."""
    g = cv2.cvtColor(np.array(im.resize((400, 300))), cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(g, 80, 160)
    return float(edges.mean() / 255.0)

def main():
    files = []
    raw = ROOT / "raw"
    for p in sorted(raw.glob("*/*.*")):
        if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
            files.append(p)
    print("candidates", len(files), flush=True)
    if not files:
        OUT.write_text(json.dumps({}, indent=1)); return
    device = "cpu"
    model, _, preprocess = open_clip.create_model_and_transforms("ViT-B-32", pretrained="laion2b_s34b_b79k")
    tok = open_clip.get_tokenizer("ViT-B-32")
    model.eval()
    with torch.no_grad():
        text = tok(LABS)
        text_f = model.encode_text(text)
        text_f = text_f / text_f.norm(dim=-1, keepdim=True)
    prev = json.loads(OUT.read_text()) if OUT.exists() else {}
    out = dict(prev)
    for i, fp in enumerate(files):
        key = str(fp.relative_to(ROOT))
        if key in out:
            continue
        try:
            im = Image.open(fp).convert("RGB")
        except Exception as e:
            out[key] = {"error": str(e)}; continue
        w, h = im.size
        blur = lap_var(im)
        wm = watermark_score(im)
        with torch.no_grad():
            img_f = model.encode_image(preprocess(im).unsqueeze(0))
            img_f = img_f / img_f.norm(dim=-1, keepdim=True)
            logits = (100.0 * img_f @ text_f.T).softmax(dim=-1)[0].tolist()
        top = int(max(range(len(logits)), key=lambda j: logits[j]))
        rec = dict(
            w=w, h=h, min_side=min(w,h), max_side=max(w,h),
            blur=round(blur, 1), edge=round(wm, 4),
            label=LABS[top], kind=KIND[top], conf=round(logits[top], 4),
            probs={KIND[j] if KIND[j] not in {"exterior","facility"} or j==top else LABS[j][:20]: round(logits[j], 4) for j in range(len(LABS))},
            p_exterior=round(logits[0]+logits[1]+logits[2], 4),
            p_facility=round(logits[3], 4),
            p_bad=round(sum(logits[4:]), 4),
        )
        # pass rules
        rec["pass_res"] = rec["max_side"] >= 900 or (rec["max_side"] >= 800 and rec["kind"]=="exterior" and rec["conf"]>=0.45)
        rec["pass_blur"] = blur >= 40  # very blurry below this
        rec["pass_label"] = rec["kind"] in {"exterior", "facility"} and rec["p_bad"] < 0.55
        rec["accept"] = rec["pass_res"] and rec["pass_blur"] and rec["pass_label"]
        out[key] = rec
        print(f"{i+1}/{len(files)} {rec['kind']:9s} acc={rec['accept']} conf={rec['conf']:.2f} ext={rec['p_exterior']:.2f} {fp.name}", flush=True)
        if i % 10 == 0:
            OUT.write_text(json.dumps(out, indent=1))
    OUT.write_text(json.dumps(out, indent=1))
    acc = sum(1 for v in out.values() if v.get("accept"))
    print("accepted", acc, "of", len(out))

if __name__ == "__main__":
    main()
