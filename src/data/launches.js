import comps from './bss_launch_comps.json' with { type: 'json' }

export const LAUNCH_COMPS = comps
export const AREA_RENT_PSF = comps.comparables.area_project_median_rent_psf // 3.75, ex-flats

function bandFor(size) {
  return comps.bands[String(size)] || null
}

export const LAUNCHES = [
  {
    id: 'nl-aviera',
    name: 'Aviera Bangsar South',
    marketing_name: 'AVIERA (Aviera Flex & Aviera Skye)',
    registered_name: 'Residensi Aviera Bangsar Selatan',
    developer: 'Tan & Tan Developments Berhad',
    developer_parent: 'IGB Berhad',
    area: 'bss',
    area_en: 'Bangsar South',
    area_zh: '孟沙南',
    address: 'Jalan Kerinchi Kiri 2, Bangsar South, Kuala Lumpur',
    lat: 3.1136042,
    lng: 101.6672122,
    geo_source: 'nominatim',
    geo_detail: 'OSM way 620160964, landuse=construction, name “AVIERA Bangsar South” (Nominatim, 2026-11-21). Bounding box 3.1130114–3.1143941, 101.6668585–101.6675657.',
    tenure: 'Freehold',
    property_type: 'Serviced Residence',
    property_type_zh: '服务式公寓',
    land_acres: 3.5,
    gdv_rm: 656000000,
    gdv_note: 'The Edge, 19–25 Oct 2026 issue, citing the developer.',
    towers: [
      { name: 'Aviera Flex', storeys: 35, units: 594, note: 'SoHo and suites. GreenRE Silver (PropLaunch).' },
      { name: 'Aviera Skye', storeys: 57, units: 439, note: 'Duplex serviced residences. GreenRE Gold (PropLaunch).' },
    ],
    total_units: 1033,
    total_units_note: 'The Edge (developer interview) and the PropLaunch project description: Flex 594 + Skye 439 = 1,033. The current sales-permit price chart covers 669 units (444 still listed as available on 25 Oct 2026) and starts at Type B 543 sqft — it does not include the 260 sqft Type A studios.',
    total_units_note_zh: '《The Edge》开发商访谈和 PropLaunch 项目介绍：Flex 594 + Skye 439 = 1,033 个单位。当前销售许可证价目表覆盖 669 个单位（截至 2026 年 10 月 25 日还剩 444 个），从 543 平方尺 Type B 起，没有列入 260 平方尺 Type A 套房。',
    units_in_current_chart: 669,
    units_left_chart: 444,
    units_left_as_of: '2026-10-25',
    launch_date: '2026-11-05',
    launch_note: 'Soft launch early October 2026; official launch 5 Nov 2026 (The Edge / PropLaunch).',
    expected_completion_year: 2031,
    handover_spa: '2029-11-05',
    handover_after_extension: '2031-05-05',
    handover_note: 'SPA handover 5 Nov 2029; after an approved 18-month extension, 5 May 2031.',
    handover_note_zh: '买卖合约交房日 2029 年 11 月 5 日；批准延期后为 2031 年 5 月 5 日（延期 18 个月）。',
    construction_progress_pct: 0,
    bumi_quota_pct: 40,
    maint_psf: 0.5,
    maint_source: 'The Edge City & Country, 19–25 Oct 2026, quoting the developer: “The maintenance fee is 50 sen psf, inclusive of the sinking fund.” PropertySifu lists RM0.55 — that third-party figure is not used.',
    maint_source_zh: '管理费采用《The Edge》2026 年 10 月 19–25 日刊对开发商的引述：50 sen psf，已含偿债基金。PropertySifu 另列 RM0.55，属于第三方数字，这里不用。',
    maint_is_published: true,
    transit: [
      { zh: '柯林奇 LRT（有盖人行天桥直达）', en: 'Kerinchi LRT (covered pedestrian bridge)', official: 'Developer / official site: direct covered-bridge access across the Federal Highway. Official site also lists Kerinchi LRT as 750 m. PropLaunch: 400–470 m straight line / about a 6-minute walk.', mid_valley: 'One LRT stop to Mid Valley City (Abdullah Hukum); official site lists Mid Valley Megamall and Mid Valley KTM as 4.0 km.' },
    ],
    mid_valley: { zh: '中谷广场（LRT 一站；官方距离 4.0 km）', en: 'Mid Valley City (one LRT stop; official road distance 4.0 km)', km: 4.0, source: 'Official site aviera.com.my (Mid Valley Megamall 4.0 km); Tan & Tan / The Edge: one stop on the LRT.' },
    kerinchi_lrt: { official_m: 750, proplaunch_m: 400, note: 'Official site 750 m; PropLaunch 400 m straight line / 470 m walk. Developer describes a covered bridge across the Federal Highway.' },
    facilities: [
      { group_zh: '6 楼设施平台（两座楼共用）', group_en: 'Level 6 podium (shared)', items_zh: ['社区餐厅与厨房', '多功能厅（含匹克球场，据 The Edge）', '烧烤与户外平台', '共用工作区、热办公桌、会议室、播客室', '健身房、瑜伽室、慢跑径', '泳池、按摩池、儿童泳池与游乐场', '攀岩墙', '都市农场与花园'], items_en: ['Community dining and kitchen', 'Multipurpose hall (pickleball courts, per The Edge)', 'BBQ and outdoor terraces', 'Co-working lounge, hot desks, meeting rooms, podcast studio', 'Gym, yoga room, jogging trail', 'Pool, jacuzzi, children’s pool and playground', 'Rock-climbing wall', 'Urban farm and sanctuary garden'] },
      { group_zh: '屋顶花园', group_en: 'Rooftop gardens', items_zh: ['Flex 35 楼与 Skye 53A 楼：空中草坪、露营区、空中烧烤'], items_en: ['Flex level 35 and Skye level 53A: sky lawn, glamping area, sky BBQ'] },
    ],
    price_conflict: {
      title_zh: '两个“起价”指的不是同一种户型',
      title_en: 'The two “from” prices refer to different unit types',
      official_from: 326000,
      official_refers_to: 'Type A studio, 260 sqft (Aviera Flex, levels 7–18). Quoted by the developer in The Edge (“selling price starts from RM326,000”) and on the official site. An agent typ table (Affirm Plus) lists Type A1–A4 at RM326,000.',
      chart_from: 666000,
      chart_refers_to: 'Type B 2-bed, 543 sqft — the cheapest typ on the PropLaunch / developer price chart of 20 Oct 2026, which covers the 669 units in the current sales set and does not list Type A prices.',
      body_zh: '官方和《The Edge》写的“起价 RM326,000”指的是 Aviera Flex 260 平方尺的 Type A 套房（7–18 楼）。PropLaunch 价目表（2026 年 10 月 20 日、当前 669 个在售单位）没有列入 Type A，表上最便宜的是 543 平方尺 Type B 两房，起价 RM666,000。两个数字都对，只是对应不同户型。本页两种户型都会列出，并分开计算回报。',
      body_en: 'The official / The Edge “from RM326,000” is the 260 sqft Type A Flex studio (levels 7–18). The PropLaunch price chart (20 Oct 2026, the current 669-unit sales set) does not list Type A; its cheapest typ is the 543 sqft Type B 2-bed from RM666,000. Both figures are right — they are different typologies. This page shows both and calculates yield separately.',
    },
    official_site: 'https://aviera.com.my/',
    source_url: 'https://proplaunch.my/projects/aviera-bangsar-south',
    sources: [
      { name: 'Official site', url: 'https://aviera.com.my/' },
      { name: 'Tan & Tan project page', url: 'https://www.tantan.com/project/aviera/' },
      { name: 'The Edge, 19–25 Oct 2026', url: 'https://theedgemalaysia.com/node/822031' },
      { name: 'PropLaunch (permit 31438-2/09-2029/0726(A)-(S))', url: 'https://proplaunch.my/projects/aviera-bangsar-south' },
    ],
    card_name: 'Aviera Bangsar South',
    card_name_zh: 'Aviera Bangsar South',
    render: { src: '/launches/aviera-edge-tantan.jpg', card: '/launches/thumbs/aviera-card.jpg', pin: '/launches/thumbs/aviera-pin.jpg', credit_zh: '开发商效果图，刊于 The Edge（Tan & Tan Developments，2026 年 10 月 15 日）', credit_en: 'Developer artist’s impression, published by The Edge (Tan & Tan Developments, 15 Oct 2026)' },
    sales_gallery: 'Aviera Sales Gallery, Level 6, The Gardens Mall, Mid Valley City',
    typologies: [
      { id: 'aviera-a', tower: 'Aviera Flex', type: 'Type A1–A4 studio', type_zh: 'Type A1–A4 套房', beds: 0, baths: 1, size: 260, carpark: 'Floating (not assigned) — Affirm Plus typ table', price_from: 326000, price_to: 326000, psf_from: 1254, price_source: 'Official / The Edge “from RM326,000”; Affirm Plus typ table lists Type A1–A4 at RM326,000. Not on the PropLaunch 20 Oct 2026 price chart.',
        price_source_zh: '官方及《The Edge》写的起价 RM326,000；Affirm Plus 户型表也列出 Type A1–A4 为 RM326,000。这条价格不在 PropLaunch 2026 年 10 月 20 日价目表上。', price_confidence: 'official_from', band_size: 260 },
      { id: 'aviera-b', tower: 'Aviera Flex', type: 'Type B1 / B2 / B3 2-bed', type_zh: 'Type B1 / B2 / B3 两房', beds: 2, baths: 1, size: 543, carpark: '1 — Affirm Plus typ table', price_from: 666000, price_to: 678000, psf_from: 1227, price_source: 'PropLaunch price chart, 20 Oct 2026. Affirm Plus typ table also lists RM666,000.',
        price_source_zh: 'PropLaunch 价目表（2026 年 10 月 20 日）。Affirm Plus 户型表同样列出 RM666,000。', price_confidence: 'chart', band_size: 543 },
      { id: 'aviera-c', tower: 'Aviera Flex', type: 'Type C1 / C2 dual-key', type_zh: 'Type C1 / C2 双钥匙', beds: 2, baths: 2, size: 807, carpark: '1 — Affirm Plus typ table', price_from: 970000, price_to: 985000, psf_from: 1202, price_source: 'PropLaunch price chart, 20 Oct 2026. Affirm Plus typ table also lists RM970,000.',
        price_source_zh: 'PropLaunch 价目表（2026 年 10 月 20 日）。Affirm Plus 户型表同样列出 RM970,000。', price_confidence: 'chart', band_size: 807 },
      { id: 'aviera-d', tower: 'Aviera Skye', type: 'Type D 3-bed duplex', type_zh: 'Type D 三房复式', beds: 3, baths: 2, size: 954, carpark: '1–3 — Affirm Plus typ table', price_from: 996000, price_to: 1190000, psf_from: 1044, price_source: 'PropLaunch price chart, 20 Oct 2026. The Edge notes duplexes start at just over RM1 million, with 954 sqft as the core offering.',
        price_source_zh: 'PropLaunch 价目表（2026 年 10 月 20 日）。《The Edge》提到复式从刚过 100 万令吉起，954 平方尺是主力户型。', price_confidence: 'chart', band_size: 954 },
      { id: 'aviera-e', tower: 'Aviera Skye', type: 'Type E 3-bed duplex', type_zh: 'Type E 三房复式', beds: 3, baths: 3, size: 1338, carpark: '2–4 — Affirm Plus typ table', price_from: 1380000, price_to: 1640000, psf_from: 1031, price_source: 'PropLaunch price chart, 20 Oct 2026 (rows from RM1.38m to RM1.64m).',
        price_source_zh: 'PropLaunch 价目表（2026 年 10 月 20 日），行价从 RM1.38m 到 RM1.64m。', price_confidence: 'chart', band_size: 1338 },
      { id: 'aviera-f', tower: 'Aviera Skye', type: 'Type 1,625 sqft 3-bed duplex', type_zh: '1,625 sqft 三房复式（少量）', beds: 3, baths: 3, size: 1625, carpark: '2–4 — Affirm Plus typ table', price_from: 1846000, price_to: 1846000, psf_from: 1136, price_source: 'Size is official (The Edge / official site). The RM1,846,000 figure is from an Affirm Plus typ table, not the PropLaunch chart (the chart’s listed max of RM1.85m is consistent with this typ, but the typ itself is not broken out there). The Edge says this layout has limited availability.',
        price_source_zh: '面积来自官方和《The Edge》。RM1,846,000 来自 Affirm Plus 户型表，不是 PropLaunch 价目表上的分列行（价目表最高价 RM1.85m 与此接近，但没有单独列出这一户型）。《The Edge》说这一户型数量有限。', price_confidence: 'agent_typ', band_size: 1625 },
    ],
  },
  {
    id: 'nl-river-park-2b',
    name: 'River Park Bangsar South (Phase 2B)',
    marketing_name: 'River Park · Tower B (Residensi Taman Hilir)',
    registered_name: 'Residensi Taman Hilir, Tower B',
    developer: 'Kumpulan Gapadu Sdn Bhd',
    developer_parent: 'Malton Berhad',
    developer_note: 'The legal developer on the advertising permit is Kumpulan Gapadu Sdn Bhd. The official site and marketing email are Malton’s; PropLaunch describes Gapadu as part of Malton Berhad. Earlier agent listings that named only “Malton” were referring to the parent.',
    area: 'bss',
    area_en: 'Bangsar South',
    area_zh: '孟沙南',
    address: 'Lot 34, Jalan Robson Heights, 50460 Kuala Lumpur',
    lat: 3.1104818,
    lng: 101.6750138,
    geo_source: 'nominatim',
    geo_detail: 'OSM way 1110933937, landuse=construction, name “River Park Bangsar South” (Nominatim, 2026-11-21). Bounding box 3.1098348–3.1120672, 101.6740289–101.6755720.',
    tenure: 'Leasehold 99 years (expires 28 July 2118)',
    tenure_short: 'Leasehold 99 yrs',
    property_type: 'Condo',
    property_type_zh: '共管公寓（住宅地契）',
    title_note: 'Official site: residential-titled condominium. Transfer, lease or mortgage needs State Authority consent.',
    total_units: 452,
    total_units_note: 'Official permit: Tower B 452 units. Type A1 & A2 812 sqft (224 units); Type A3 & A4 861 sqft (152 units); Type B 1,180 sqft (76 units).',
    units_left: 116,
    units_left_as_of: '2026-11-21',
    units_left_note: 'Official site unsold count: 116. PropLaunch listed 111 of 452 as of 15 Nov 2026.',
    launch_date: '2024-04-30',
    expected_completion_year: 2027,
    handover_spa: '2027-04-30',
    handover_after_extension: '2027-10-30',
    handover_note: 'Official site expected completion: October 2027. PropLaunch: SPA handover 30 Apr 2027; after a 6-month approved extension, 30 Oct 2027. An older brochure still said September 2026 — not used.',
    handover_note_zh: '官网预计 2027 年 10 月完工。PropLaunch：买卖合约交房日 2027 年 4 月 30 日，批准延期 6 个月后为 2027 年 10 月 30 日。旧册页曾写 2026 年 9 月，这里不采用。',
    construction_progress_pct: 93,
    construction_progress_as_of: '2026-11-15',
    bumi_quota_pct: 30,
    bumi_discount_pct: 5,
    bumi_discount_note: 'Published on the official advertising permit: Bumiputera discount 5%. This is a statutory eligibility discount, not the unpublished investor/sales discount. Shown separately from the user-entered discount box.',
    list_price_min: 783600,
    list_price_max: 1291200,
    list_price_note: 'Official Tower B permit: RM783,600–RM1,291,200. The official homepage still says “homes from RM626,000*”, which is lower than the Tower B permit minimum and may refer to earlier phases or older marketing — it is not used as the Phase 2B from-price. PropLaunch’s sidebar also showed RM808k–RM1.29m; the typ card and the permit minimum of RM783,600 are used for Type A1/A2.',
    maint_psf: 0.35,
    maint_source: 'No published maintenance fee was found on the official site, permit footer, or PropLaunch. The map’s Bangsar South assumption of RM0.35 psf/month (including sinking fund) is used and labelled as an assumption.',
    maint_source_zh: '官网、许可证和 PropLaunch 都没有公布管理费。这里采用地图上孟沙南公寓的假设值 RM0.35 psf/月（含偿债基金），并标明这是假设。',
    maint_is_published: false,
    transit: [
      { zh: '安卡莎布里 KTM：官方 300 米步行廊', en: 'Angkasapuri KTM: official 300 m pedestrian walkway', official: 'Official site: 300 m pedestrian walkway to KTM Angkasapuri. PropLaunch also quotes 150 m and 300 m straight line.' },
    ],
    mid_valley: { zh: '中谷广场 3.7 km；有穿梭巴士往 LRT / MRT / Mid Valley', en: 'Mid Valley City 3.7 km; shuttle bus to LRT / MRT / Mid Valley', km: 3.7, source: 'Official site: Mid Valley City 3.7 km; shuttle service to MRT, LRT and Mid Valley City.' },
    kerinchi_lrt: null,
    abdullah_hukum: { official_km: 3.8, proplaunch_km: 1.0, note: 'Official site: 3.8 km to Abdullah Hukum LRT & KTM. PropLaunch says 1.0 km. The official figure is shown first; the difference is flagged.' },
    mrt3: { zh: '即将开通的班底峇鲁 MRT3 车站 900 米', en: 'Upcoming Pantai Permai MRT 3 station 900 m', source: 'Official site.' },
    facilities: [
      { group_zh: '水景与户外', group_en: 'Pools and outdoor', items_zh: ['休闲泳池、无边际泳池、浅水池、儿童泳池', '日光甲板、按摩池 / 缆车凉亭', '烧烤、餐区、花园小径、中央公园'], items_en: ['Leisure pool, infinity lap pool, shallow pool, kids’ pool', 'Sun decks, jacuzzi / cabana', 'BBQ, dining lounges, garden path, central park'] },
      { group_zh: '室内', group_en: 'Indoor', items_zh: ['健身房、蒸气室、理疗室', '多功能厅、厨房', '娱乐室、游戏室、室内儿童游乐室', '图书馆 / 虚拟办公室、阅读室'], items_en: ['Gymnasium, steam room, therapy room', 'Multipurpose hall and kitchen', 'Entertainment room, games room, indoor kids’ play room', 'Library / virtual office, reading room'] },
    ],
    extras: ['Provisional GreenRE', 'EV charging bays', 'Partly furnished (official site)', 'Low-E glass, rainwater harvesting, energy-efficient common lighting'],
    official_site: 'https://riverpark.com.my/',
    source_url: 'https://proplaunch.my/projects/river-park-bangsar-south-phase-2b',
    sources: [
      { name: 'Official site (permit footer)', url: 'https://riverpark.com.my/' },
      { name: 'PropLaunch (permit 14035-5/05-2027/0245(R)-(S))', url: 'https://proplaunch.my/projects/river-park-bangsar-south-phase-2b' },
    ],
    card_name: 'River Park 2B',
    card_name_zh: 'River Park 2B',
    render: { src: '/launches/official-01-riverpark.jpg', card: '/launches/thumbs/river-park-card.jpg', pin: '/launches/thumbs/river-park-pin.jpg', credit_zh: '开发商官方效果图，来自 riverpark.com.my', credit_en: 'Official developer render, riverpark.com.my' },
    typologies: [
      { id: 'rp-a12', tower: 'Tower B', type: 'Type A1 / A2 2-bed', type_zh: 'Type A1 / A2 两房', beds: 2, baths: 2, size: 812, carpark: '2', units: 224, price_from: 783600, price_to: 955200, psf_from: 965, price_source: 'Official permit minimum RM783,600 paired with the PropLaunch Type A1 typ card (812 sqft, RM783,600–RM955,200, from RM965 psf). List prices rise with the floor.',
        price_source_zh: '官方许可证最低价 RM783,600，与 PropLaunch Type A1 户型卡一致（812 平方尺，RM783,600–RM955,200，起价约 RM965 psf）。楼层越高通常越贵。', price_confidence: 'permit_typ', band_size: 812 },
      { id: 'rp-a34', tower: 'Tower B', type: 'Type A3 / A4 2-bed', type_zh: 'Type A3 / A4 两房', beds: 2, baths: 2, size: 861, carpark: '2', units: 152, price_from: null, price_to: null, psf_from: null, price_source: 'Size and unit count are from the official permit. No typ-matched from-price was published on the official site or the PropLaunch typ card reviewed (that card covers the 812 sqft typ). Enter a sales quote to see yield.',
        price_source_zh: '面积和单位数来自官方许可证。官网和这次看到的 PropLaunch 户型卡没有对应到 861 平方尺的起价（那张卡是 812 平方尺户型）。请填销售报价后再看回报。', price_confidence: 'size_only', band_size: 861 },
      { id: 'rp-b', tower: 'Tower B', type: 'Type B 3-bed', type_zh: 'Type B 三房', beds: 3, baths: 2, size: 1180, carpark: '2–3', units: 76, price_from: null, price_to: 1291200, psf_from: null, price_source: 'Size and unit count are from the official permit. The permit maximum RM1,291,200 is almost certainly a top-floor Type B, but it is not a typ-matched from-price, so it is not used as the entry price. An agent listing in Nov 2026 advertised 1,180 sqft at RM907,000 — that is an asking figure, not used here. Enter a sales quote to see yield.',
        price_source_zh: '面积和单位数来自官方许可证。许可证最高价 RM1,291,200 很可能是 Type B 高层，但不能当作已对上户型的起价。2026 年 11 月有中介列出 1,180 平方尺 RM907,000，那是叫价，这里不用。请填销售报价后再看回报。', price_confidence: 'size_only', band_size: 1180 },
    ],
  },
]

export function launchById(id) {
  return LAUNCHES.find(p => p.id === id)
}

export function typBand(typ) {
  return bandFor(typ.band_size || typ.size)
}

/** Rent psf used for the typ: size-band median when the band is sufficient, else area project-median. */
export function typRentPsf(typ) {
  const b = typBand(typ)
  if (b?.sufficient && b.rent_psf_median) return { psf: b.rent_psf_median, source: 'band', band: b }
  return { psf: AREA_RENT_PSF, source: 'area_fallback', band: b }
}

export default LAUNCHES
