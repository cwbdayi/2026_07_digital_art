// Teaching model for the 2024-04-03 Hualien earthquake.
// Travel times are homogeneous-crust arithmetic, not CWA operational tables.
// Alert times are the county-level national (PWS) issuances in the CWA press release.

export const QUAKE = {
  name: "2024-04-03 花蓮地震",
  dateLabel: "2024-04-03",
  timeLabel: "07:58:09.9",
  lat: 23.77,
  lon: 121.67,
  depthKm: 15.5,
  magnitude: "ML 7.2",
  originSeconds: 7 * 3600 + 58 * 60 + 9.9,
};

export const MODEL = {
  vp: 6.2,
  vs: 3.5,
  // Lead shorter than this is called a blind zone on this page.
  blindSeconds: 5,
};

// Seconds after origin. 09.9 + 8.1 = 18.0, 09.9 + 14.1 = 24.0.
const ALERT_AT = {
  花蓮縣: 8.1,
  宜蘭縣: 8.1,
  南投縣: 8.1,
  彰化縣: 8.1,
  臺中市: 14.1,
  苗栗縣: 14.1,
  新竹縣: 14.1,
  雲林縣: 14.1,
  嘉義市: 14.1,
  臺南市: 14.1,
  臺東縣: 14.1,
};

const RAW_CITIES = [
  {
    id: "hualien",
    name: "花蓮市",
    county: "花蓮縣",
    lon: 121.601,
    lat: 23.987,
    note: "NCREE 摘要寫花蓮市測站震度約 6弱、和平約 6強。計時不使用這個震度。",
  },
  {
    id: "yilan",
    name: "宜蘭市",
    county: "宜蘭縣",
    lon: 121.753,
    lat: 24.752,
    note: "第一報有發到宜蘭。距離夠遠，警報會早於本地的 P 波。",
  },
  {
    id: "nantou",
    name: "南投市",
    county: "南投縣",
    lon: 120.685,
    lat: 23.91,
  },
  {
    id: "changhua",
    name: "彰化市",
    county: "彰化縣",
    lon: 120.542,
    lat: 24.081,
  },
  {
    id: "taitung",
    name: "臺東市",
    county: "臺東縣",
    lon: 121.145,
    lat: 22.756,
  },
  {
    id: "taichung",
    name: "臺中市",
    county: "臺中市",
    lon: 120.674,
    lat: 24.147,
  },
  {
    id: "miaoli",
    name: "苗栗市",
    county: "苗栗縣",
    lon: 120.821,
    lat: 24.56,
  },
  {
    id: "hsinchu-county",
    name: "竹北",
    county: "新竹縣",
    lon: 121.004,
    lat: 24.83,
    note: "第二報有發到新竹縣。隔壁的新竹市沒有國家級警報，可以對照。",
  },
  {
    id: "yunlin",
    name: "斗六",
    county: "雲林縣",
    lon: 120.543,
    lat: 23.71,
  },
  {
    id: "chiayi",
    name: "嘉義市",
    county: "嘉義市",
    lon: 120.449,
    lat: 23.48,
  },
  {
    id: "tainan",
    name: "臺南市",
    county: "臺南市",
    lon: 120.213,
    lat: 22.999,
  },
  {
    id: "taipei",
    name: "臺北市",
    county: "臺北市",
    lon: 121.565,
    lat: 25.033,
    note: "新聞稿：初報規模只有 6.2 與 6.8，預估震度未達 4 級，臺北因此沒有國家級警報。NCREE 摘要寫雙北實測約 5弱。",
  },
  {
    id: "newtaipei",
    name: "新北市",
    county: "新北市",
    lon: 121.463,
    lat: 25.014,
    note: "與臺北同在新聞稿的未發送名單。",
  },
  {
    id: "keelung",
    name: "基隆市",
    county: "基隆市",
    lon: 121.739,
    lat: 25.128,
  },
  {
    id: "taoyuan",
    name: "桃園市",
    county: "桃園市",
    lon: 121.301,
    lat: 24.994,
  },
  {
    id: "hsinchu-city",
    name: "新竹市",
    county: "新竹市",
    lon: 120.969,
    lat: 24.804,
    note: "新竹市在未發送名單，新竹縣在第二報。行政區只隔一條邊界，警報結果不同。",
  },
  {
    id: "kaohsiung",
    name: "高雄市",
    county: "高雄市",
    lon: 120.302,
    lat: 22.627,
    note: "新聞稿把高雄市列在未發國家級警報的縣市。NCREE 彙整另記山區三個區；本頁以新聞稿的縣市層級、以市中心為觀察點。",
  },
  {
    id: "pingtung",
    name: "屏東市",
    county: "屏東縣",
    lon: 120.488,
    lat: 22.669,
    note: "新聞稿列為未發國家級警報。",
  },
];

export const STORIES = [
  { cityId: "yilan", kicker: "有預警", title: "宜蘭", hint: "還有二十幾秒" },
  { cityId: "hualien", kicker: "盲區", title: "花蓮", hint: "幾乎同時到達" },
  { cityId: "taipei", kicker: "未發警報", title: "臺北", hint: "手機沒有響" },
];

export const MAX_T = 75;

function haversineKm(lon1, lat1, lon2, lat2) {
  const R = 6371;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function prepareCities() {
  return RAW_CITIES.map((city) => {
    const epi = haversineKm(QUAKE.lon, QUAKE.lat, city.lon, city.lat);
    const hyp = Math.hypot(epi, QUAKE.depthKm);
    const p = hyp / MODEL.vp;
    const s = hyp / MODEL.vs;
    const alert = Object.prototype.hasOwnProperty.call(ALERT_AT, city.county)
      ? ALERT_AT[city.county]
      : null;
    const lead = alert == null ? null : s - alert;
    const blind = alert != null && lead < MODEL.blindSeconds;
    const batch = alert == null ? 0 : alert < 10 ? 1 : 2;
    // Visual and rumble only. Not a CWA intensity.
    const shake = Math.max(0.12, Math.min(1, (32 / hyp) ** 1.15));
    return { ...city, epi, hyp, p, s, alert, lead, blind, batch, shake };
  });
}

export function formatClock(offset) {
  let tenths = Math.round((QUAKE.originSeconds + offset) * 10);
  if (tenths < 0) tenths = 0;
  const h = Math.floor(tenths / 36000);
  const m = Math.floor((tenths % 36000) / 600);
  const sT = tenths % 600;
  const s = Math.floor(sT / 10);
  const f = sT % 10;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}.${f}`;
}

export function formatSeconds(value) {
  return Math.max(0, value).toFixed(1);
}

export function cityBrief(city) {
  const epi = city.epi.toFixed(0);
  const p = formatSeconds(city.p);
  const s = formatSeconds(city.s);
  let line;
  if (city.alert == null) {
    line = `${city.name}離震央約 ${epi} 公里。教學模型：P 波 ${p} 秒、S 波 ${s} 秒。這次沒有國家級警報。`;
  } else if (city.blind) {
    line = `${city.name}離震央約 ${epi} 公里。P 波 ${p} 秒、警報 ${formatSeconds(city.alert)} 秒、S 波 ${s} 秒。應變時間 ${formatSeconds(city.lead)} 秒，算預警盲區。`;
  } else {
    const order = city.alert < city.p ? "警報早於本地 P 波。" : "警報晚於本地 P 波。";
    line = `${city.name}離震央約 ${epi} 公里。P 波 ${p} 秒、警報 ${formatSeconds(city.alert)} 秒、S 波 ${s} 秒。${order}可應變約 ${formatSeconds(city.lead)} 秒。`;
  }
  return city.note ? `${line}${city.note}` : line;
}

export function describePhase(t, city) {
  const toS = Math.max(0, city.s - t);
  if (t >= city.s) {
    const alertStillComing = city.alert != null && t < city.alert;
    return {
      key: "shake",
      tone: "shake",
      label: "強震抵達",
      seconds: 0,
      sub: alertStillComing
        ? "S 波已經到了，國家級警報還在後面。"
        : "比較強的搖晃從 S 波開始。P 波通常只是較小的先行震動。",
    };
  }
  if (city.alert != null && t >= city.alert) {
    if (city.blind) {
      return {
        key: "blind",
        tone: "blind",
        label: "預警盲區",
        seconds: toS,
        sub: "警報與強震幾乎疊在一起。離震央太近時，算得出來也來不及反應。",
      };
    }
    const pNote =
      t < city.p
        ? `P 波還要 ${formatSeconds(city.p - t)} 秒。警報可以比 P 波更早，因為電訊比地震波快。`
        : "P 波已過。接下來等的是比較強的 S 波。";
    return {
      key: "lead",
      tone: "lead",
      label: "可應變時間",
      seconds: toS,
      sub: pNote,
    };
  }
  if (city.alert != null && t >= city.p && t < city.alert) {
    return {
      key: "wait-alert",
      tone: "wait",
      label: "警報發出前",
      seconds: city.alert - t,
      sub: "P 波已經到了，國家級警報還在計算或傳送。",
    };
  }
  if (city.alert != null && city.alert <= city.p && t < city.alert) {
    return {
      key: "wait-alert",
      tone: "wait",
      label: "警報發出前",
      seconds: city.alert - t,
      sub: "遠方有機會比 P 波更早收到警報。",
    };
  }
  if (t < city.p) {
    return {
      key: "wait-p",
      tone: city.alert == null ? "miss" : "wait",
      label: "P 波抵達前",
      seconds: city.p - t,
      sub:
        city.alert == null
          ? "此縣市這次沒有國家級警報。現在倒數的是 P 波，不是警報。"
          : "P 波較快，搖晃通常比較小。",
    };
  }
  return {
    key: "miss",
    tone: "miss",
    label: "強震前 · 未發警報",
    seconds: toS,
    sub: "P 波已到。手機國家級警報沒有發到這裡，強震仍會來。",
  };
}

export function surfaceRadiusKm(speed, t, depthKm) {
  const dist = speed * t;
  if (dist <= depthKm) return 0;
  return Math.sqrt(dist * dist - depthKm * depthKm);
}
