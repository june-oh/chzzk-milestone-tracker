import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT_PATH = path.join(root, "data/namuwiki-profiles.json");

/** User-verified birthday/debut — source: manual (scrape must not overwrite). */
const MANUAL = {
  "0f61ae00c2aef2b789dc009e51cbcc5a": {
    channelName: "온 하루",
    pageTitle: null,
    url: null,
    birthday: "02-22",
    debutDate: "2025-02-22",
    source: "manual",
  },
  "29a1ed5c0829fa620fab900dba7e011b": {
    channelName: "유리리",
    pageTitle: null,
    url: null,
    birthday: "11-13",
    debutDate: "2022-11-13",
    source: "manual",
  },
  "d5e2e0c14dcca4c4b10c7c9633022f52": {
    channelName: "치치 Planeta",
    pageTitle: null,
    url: null,
    birthday: "03-18",
    debutDate: "2026-05-31",
    source: "manual",
  },
  "59aa824e4c4a56dd51e7a5e2e9172648": {
    channelName: "쿠온 레이 Planeta",
    pageTitle: null,
    url: null,
    birthday: "04-21",
    debutDate: "2026-05-31",
    source: "manual",
  },
  "f42e97f59c3177b8686dccfbf90792dd": {
    channelName: "김아테 l Ate",
    pageTitle: null,
    url: null,
    birthday: "01-04",
    debutDate: "2025-02-23",
    source: "manual",
  },
  "abe8aa82baf3d3ef54ad8468ee73e7fc": {
    birthday: "04-13",
    debutDate: "2024-01-21",
    source: "manual",
  },
  "0a2020b09b8cc7f2285b7ae5de2ce4d3": {
    birthday: "09-06",
    debutDate: "2023-01-15",
    source: "manual",
  },
  "f1869f490ddd660c420b2f57c649e6bb": {
    birthday: "11-26",
    debutDate: "2022-11-13",
    source: "manual",
  },
  "65a53076fe1a39636082dd6dba8b8a4b": {
    debutDate: "2024-01-20",
    source: "manual",
  },
  "3e3781d3bd20dadc2f6f6d5d30091195": {
    debutDate: "2025-09-13",
    source: "manual",
  },
  "5c897b3e639045ca6e314bbaff991f73": {
    debutDate: "2025-09-13",
    source: "manual",
  },
  "dae2de8eaa005a59163f2e4c045e1aa1": {
    debutDate: "2025-09-13",
    source: "manual",
  },
  "b33c957eac9335d38e4043c3dca97675": {
    debutDate: "2025-09-14",
    source: "manual",
  },
  "f36320c432d9f06095ce2cfbbf681c26": {
    debutDate: "2025-09-14",
    source: "manual",
  },
  "65c3035bdc598c81f15a8fe0e958b3ce": {
    debutDate: "2016-07-22",
    source: "manual",
  },
};

const data = JSON.parse(fs.readFileSync(OUT_PATH, "utf8"));
const profiles = data.profiles;

for (const [id, patch] of Object.entries(MANUAL)) {
  profiles[id] = { ...profiles[id], ...patch };
}

data.meta = {
  updatedAt: new Date().toISOString(),
  count: Object.keys(profiles).length,
  withBirthday: Object.values(profiles).filter((p) => p.birthday).length,
  withDebut: Object.values(profiles).filter((p) => p.debutDate).length,
  total: 46,
};

fs.writeFileSync(OUT_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log(`Applied ${Object.keys(MANUAL).length} manual patches`);
console.log(
  `Profiles: ${data.meta.count}, birthdays: ${data.meta.withBirthday}, debuts: ${data.meta.withDebut}`,
);
