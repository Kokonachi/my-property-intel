#!/usr/bin/env python3
"""Curated PropertyGuru condo-directory URLs for non-landed projects."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
APP = ROOT.parent.parent
P = json.loads((APP / "data/real_projects.json").read_text())["projects"]

# Confirmed or high-confidence official pages (one primary; extras are disambiguation candidates)
# Landed projects are intentionally omitted.
CURATED = {
"real-pavilion-hilltop": ["https://www.propertyguru.com.my/condo/pavilion-hilltop-6554"],
"real-seni-mont-kiara": ["https://www.propertyguru.com.my/condo/seni-mont-kiara-1890"],
"real-kiara-163": ["https://www.propertyguru.com.my/condo/ooak-suites-kiara-163-9221"],
"real-residensi-allevia": ["https://www.propertyguru.com.my/condo/allevia-16375"],
"real-11-mont-kiara-mk11": ["https://www.propertyguru.com.my/condo/11-mont-kiara-mk11-1874"],
"real-28-mont-kiara": ["https://www.propertyguru.com.my/condo/28-mont-kiara-mk28-1878"],
"real-residensi-22-mont-kiara": ["https://www.propertyguru.com.my/condo/residensi-22-5891"],
"real-mont-kiara-palma": ["https://www.propertyguru.com.my/condo/mont-kiara-palma-601"],
"real-arcoris-residences": ["https://www.propertyguru.com.my/condo/arcoris-residences-5840"],
"real-trinity-pentamont-mont-kiara": ["https://www.propertyguru.com.my/condo/trinity-pentamont-9709"],
"real-pangsapuri-servis-conlay": ["https://www.propertyguru.com.my/condo/the-conlay-13408", "https://www.propertyguru.com.my/condo/conlay-23086"],
"real-the-manor-kl": ["https://www.propertyguru.com.my/condo/the-manor-8105", "https://www.propertyguru.com.my/condo/the-manor-12180"],
"real-platinum-suites-the-face-suites": ["https://www.propertyguru.com.my/condo/the-face-suites-platinum-suites-2453"],
"real-residensi-agile-delima": ["https://www.propertyguru.com.my/condo/agile-bukit-bintang-9311", "https://www.propertyguru.com.my/condo/residensi-agile-delima-23089"],
"real-quill-residence": ["https://www.propertyguru.com.my/condo/quill-residence-13427"],
"real-residensi-trx-1-tun-razak-exchange": ["https://www.propertyguru.com.my/condo/trx-residences-18014"],
"real-oxley-towers": ["https://www.propertyguru.com.my/condo/oxley-towers-13823"],
"real-sunway-velocity-two": ["https://www.propertyguru.com.my/condo/sunway-velocity-two-14103"],
"real-10-stonor": ["https://www.propertyguru.com.my/condo/10-stonor-8171"],
"real-jamnah-view": ["https://www.propertyguru.com.my/condo/jamnah-view-305"],
"real-kl-eco-city": ["https://www.propertyguru.com.my/condo/the-pillars-kl-eco-city-13039"],
"real-residensi-38-bangsar": ["https://www.propertyguru.com.my/condo/residensi-38-bangsar-15072"],
"real-bangsar-permai": ["https://www.propertyguru.com.my/condo/bangsar-permai-90"],
"real-sri-penaga": ["https://www.propertyguru.com.my/condo/sri-penaga-111", "https://www.propertyguru.com.my/condo/sri-penaga-1367"],
"real-laurel-residence": ["https://www.propertyguru.com.my/condo/laurel-residence-17871"],
"real-southlink": ["https://www.propertyguru.com.my/condo/southlink-8399"],
"real-the-park-residences-1": ["https://www.propertyguru.com.my/condo/the-park-residences-1-1561"],
"real-residensi-era-novum": ["https://www.propertyguru.com.my/condo/novum-7847"],
"real-the-goodwood-residence": ["https://www.propertyguru.com.my/condo/the-goodwood-residence-14109"],
"real-taman-bukit-angkasa-angkasapuri-flat": ["https://www.propertyguru.com.my/condo/flat-taman-bukit-angkasa-5576"],
"real-taman-bukit-angkasa-taman-angkasapuri-flat": ["https://www.propertyguru.com.my/condo/flat-taman-bukit-angkasa-5576"],
"real-pantai-panorama": ["https://www.propertyguru.com.my/condo/pantai-panorama-condominiums-105"],
"real-kl-gateway": ["https://www.propertyguru.com.my/condo/kl-gateway-residences-8093"],
"real-kuala-lumpur-gateway": ["https://www.propertyguru.com.my/condo/kl-gateway-residences-8093"],
"real-kuala-lumpur-gateway-menara-suezcap": ["https://www.propertyguru.com.my/condo/menara-suezcap-11667"],
"real-pkns-17-kampung-kerinchi": ["https://www.propertyguru.com.my/condo/pkns-17-kampung-kerinchi-16764"],
"real-residensi-kerinchi": ["https://www.propertyguru.com.my/condo/residensi-kerinchi-10150"],
"real-camellia-serviced-suites": ["https://www.propertyguru.com.my/condo/camellia-serviced-suites-1689"],
"real-rhythm-avenue": ["https://www.propertyguru.com.my/condo/rhythm-avenue-1552"],
"real-harmoni-1": ["https://www.propertyguru.com.my/condo/harmoni-1-22078", "https://www.propertyguru.com.my/condo/harmoni-2828"],
"real-subang-perdana-goodyear-court-10": ["https://www.propertyguru.com.my/condo/subang-perdana-goodyear-court-10-1530"],
"real-main-place-residence": ["https://www.propertyguru.com.my/condo/main-place-residence-6146"],
"real-casa-subang": ["https://www.propertyguru.com.my/condo/casa-subang-1523"],
"real-subang-perdana-goodyear-court-6": ["https://www.propertyguru.com.my/condo/subang-perdana-goodyear-court-6-1533"],
"real-subang-perdana-goodyear-court-8": ["https://www.propertyguru.com.my/condo/subang-perdana-goodyear-court-8-1535"],
"real-edumetro-empira-remix-2-subang-jaya": ["https://www.propertyguru.com.my/condo/edumetro-subang-jaya-16296"],
"real-impian-meridian": ["https://www.propertyguru.com.my/condo/impian-meridian-1329"],
"real-casa-tiara": ["https://www.propertyguru.com.my/condo/serviced-residence-casa-tiara-1889"],
"real-subang-perdana-goodyear-court-9": ["https://www.propertyguru.com.my/condo/subang-perdana-goodyear-court-9-1536"],
"real-subang-perdana-goodyear-court-3": ["https://www.propertyguru.com.my/condo/subang-perdana-goodyear-court-3-1532"],
"real-subang-avenue": ["https://www.propertyguru.com.my/condo/subang-avenue-1548"],
"real-sri-mutiara-putra-height": ["https://www.propertyguru.com.my/condo/sri-mutiara-1749", "https://www.propertyguru.com.my/condo/sri-mutiara-20932"],
"real-the-grand-subang-ss-13-subang-jaya": ["https://www.propertyguru.com.my/condo/the-grand-subang-jaya-ss13-14129"],
"real-subang-perdana-goodyear-court-7": ["https://www.propertyguru.com.my/condo/subang-perdana-goodyear-court-7-1534"],
"real-d-seven-lagoon-perdana": ["https://www.propertyguru.com.my/condo/d7-d-seven-lagoon-perdana-15539"],
"real-angsana": ["https://www.propertyguru.com.my/condo/angsana-22101", "https://www.propertyguru.com.my/condo/angsana-2630", "https://www.propertyguru.com.my/condo/angsana-5636"],
"real-damen-usj-service-apartment": ["https://www.propertyguru.com.my/condo/da-men-2069"],
"real-seri-tanjung": ["https://www.propertyguru.com.my/condo/seri-tanjung-21006", "https://www.propertyguru.com.my/condo/pangsapuri-seri-tanjung-16822"],
"real-jati-2": ["https://www.propertyguru.com.my/condo/pangsapuri-jati-2-1477"],
"real-e-tiara": ["https://www.propertyguru.com.my/condo/e-tiara-20972"],
"real-seri-kayan": ["https://www.propertyguru.com.my/condo/pangsapuri-seri-kayan-4880"],
"real-pangsapuri-seri-kayan-pinggiran-usj": ["https://www.propertyguru.com.my/condo/pangsapuri-seri-kayan-4880"],
"real-arcadia": ["https://www.propertyguru.com.my/condo/arcadia-1806", "https://www.propertyguru.com.my/condo/arcadia-20971", "https://www.propertyguru.com.my/condo/arcadia-790"],
"real-usj-one-avenue": ["https://www.propertyguru.com.my/condo/usj-one-avenue-condo-21138"],
"real-subang-perdana-goodyear-court-1": ["https://www.propertyguru.com.my/condo/subang-perdana-goodyear-court-1-1546"],
"real-subang-olives-residence": ["https://www.propertyguru.com.my/condo/subang-olives-residence-1911"],
"real-the-boulevard": ["https://www.propertyguru.com.my/condo/the-boulevard-1860"],
"real-subang-perdana-goodyear-court-2": ["https://www.propertyguru.com.my/condo/subang-perdana-goodyear-court-2-1531"],
"real-the-regina": ["https://www.propertyguru.com.my/condo/the-regina-2098"],
"real-union-suites": ["https://www.propertyguru.com.my/condo/union-suites-9296"],
"real-first-subang-ss-15-courtyard": ["https://www.propertyguru.com.my/condo/first-subang-ss-15-courtyard-3212"],
"real-sri-nipah": ["https://www.propertyguru.com.my/condo/sri-nipah-1641"],
"real-putra-residence": ["https://www.propertyguru.com.my/condo/putra-residence-9682"],
"real-saujana-residency": ["https://www.propertyguru.com.my/condo/saujana-residency-1540"],
"real-subang-perdana-goodyear-court-5": ["https://www.propertyguru.com.my/condo/subang-perdana-goodyear-court-5-1553"],
"real-sjcc-lot-15-ss-16-subang-jaya": ["https://www.propertyguru.com.my/condo/lot-15-9518"],
"real-grand-subang-jaya-ss15": ["https://www.propertyguru.com.my/condo/the-grand-subang-jaya-ss15-13604"],
"real-lafite-apartment": ["https://www.propertyguru.com.my/condo/subang-jaya-lafite-1529"],
"real-subang-parkhomes": ["https://www.propertyguru.com.my/condo/subang-parkhomes-1542"],
"real-permai-usj-1-coral-court": ["https://www.propertyguru.com.my/condo/permai-usj-1-coral-court-16847"],
"real-summer-villa": ["https://www.propertyguru.com.my/condo/summer-villa-2342"],
"real-ss13-flats": ["https://www.propertyguru.com.my/condo/ss-13-flat-16913"],
"real-keranji": ["https://www.propertyguru.com.my/condo/keranji-apartments-1525"],
"real-jati-1": ["https://www.propertyguru.com.my/condo/pangsapuri-jati-1-2339"],
"real-pandora-service-residence": ["https://www.propertyguru.com.my/condo/pandora-tropicana-metropark-6599"],
"real-paloma-service-residence": ["https://www.propertyguru.com.my/condo/paloma-tropicana-metropark-6596"],
"real-laman-baiduri-subang-jaya": ["https://www.propertyguru.com.my/condo/laman-baiduri-21751"],
"real-goodyear-court-4-fasa-3": ["https://www.propertyguru.com.my/condo/subang-perdana-goodyear-court-4-5744"],
"real-meranti": ["https://www.propertyguru.com.my/condo/pangsapuri-sri-meranti-1521"],
"real-usj-one-you-one": ["https://www.propertyguru.com.my/condo/usj-one-5651"],
"real-sri-bayu": ["https://www.propertyguru.com.my/condo/sri-bayu-condominium-1541"],
"real-indera-subang": ["https://www.propertyguru.com.my/condo/indera-subang-1537"],
"real-dorsett-waterfront-subang": ["https://www.propertyguru.com.my/condo/dorsett-waterfront-subang-8624", "https://www.propertyguru.com.my/condo/dorsett-waterfront-subang-19825"],
"real-fairville": ["https://www.propertyguru.com.my/condo/fairville-1524"],
"real-subang-soho-one-soho": ["https://www.propertyguru.com.my/condo/subang-soho-one-soho-1922"],
"real-spring-summer-villa": ["https://www.propertyguru.com.my/condo/spring-summer-villa-21753"],
"real-isola": ["https://www.propertyguru.com.my/condo/isola-10325", "https://www.propertyguru.com.my/condo/isola-4838"],
"real-empire-subang": ["https://www.propertyguru.com.my/condo/empire-subang-1544"],
"real-tropika-paradise": ["https://www.propertyguru.com.my/condo/tropika-paradise-condominium-1543"],
"real-menara-geno": ["https://www.propertyguru.com.my/condo/menara-geno-10472"],
"real-my-place": ["https://www.propertyguru.com.my/condo/my-place-1539"],
"real-armani-soho": ["https://www.propertyguru.com.my/condo/armani-soho-16424"],
"real-riverdale-usj-one-park": ["https://www.propertyguru.com.my/condo/riverdale-usj-one-park-4664"],
"real-subang-jaya-apartment": ["https://www.propertyguru.com.my/condo/pangsapuri-subang-jaya-1527"],
"real-starville": ["https://www.propertyguru.com.my/condo/starville-1528"],
}

# area locality keywords used later to accept/reject a candidate page
AREA_HINT = {
    "mk": ["mont kiara", "sri hartamas"],
    "klcc": ["klcc", "kuala lumpur city", "kl city", "ampang", "conlay", "stonor", "klcc"],
    "bb": ["bukit bintang", "tun razak", "trx", "cheras", "maluri", "cochrane", "velocity"],
    "bs": ["bangsar", "lucky garden"],
    "bss": ["bangsar south", "kerinchi", "pantai", "kampung kerinchi", "kl eco", "mid valley", "abdullah hukum"],
    "sj": ["subang", "usj", "putra height", "sunway", "ss13", "ss15", "ss16", "ss14", "ss12", "ss18", "ss19", "uep", "metropark"],
}

def unique_start_urls():
    seen, out = set(), []
    for urls in CURATED.values():
        for u in urls:
            if u not in seen:
                seen.add(u); out.append(u)
    return out

if __name__ == "__main__":
    urls = unique_start_urls()
    by = {p["id"]: p for p in P}
    missing = [p["id"] for p in P if p["type"] != "Landed" and p["id"] not in CURATED]
    print("curated projects", len(CURATED), "unique urls", len(urls), "non-landed missing", missing)
    (ROOT / "official_start_urls.json").write_text(json.dumps({"urls": urls, "curated": CURATED, "missing": missing}, indent=1))
