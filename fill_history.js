/**
 * CHZZK MILESTONE - Historical Milestone Importer
 * 
 * 이 스크립트는 팬카페 공지, 방송 기록 등에서 확인한 과거 1,000시간 단위 마일스톤 달성 날짜를
 * Vercel KV 데이터베이스에 직접 삽입하기 위한 도구입니다.
 * 
 * [사용법]
 * 1. 아래 `HISTORICAL_DATA` 배열에 수집하신 정확한 데이터를 형식에 맞춰 기입합니다.
 * 2. 터미널에서 다음 명령어를 실행하여 데이터베이스에 반영합니다.
 *    (로컬에 .env.local 이 설정되어 있어야 합니다)
 *    npx dotenv-cli -- node fill_history.js
 *    또는 그냥 환경변수가 로드된 상태에서:
 *    node fill_history.js
 */

const { createClient } = require("@vercel/kv");
const dotenv = require("dotenv");
const path = require("path");

// .env.local 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
  console.error("❌ 에러: KV_REST_API_URL 또는 KV_REST_API_TOKEN 환경 변수가 설정되지 않았습니다.");
  console.error(".env.local 파일에 Vercel KV 연결 정보가 있는지 확인해주세요.");
  process.exit(1);
}

const kv = createClient({
  url: KV_REST_API_URL,
  token: KV_REST_API_TOKEN,
});

// ==========================================
// [수집한 과거 데이터 기입 구역]
// ==========================================
// 아래 예시를 참고하여, 외부 사이트에서 찾아낸 실제 일자들을 채워주시면 됩니다.
// date 형식은 "YYYY-MM-DD" 또는 "YYYY-MM-DDTHH:mm:ssZ" (ISO-8601) 형태로 작성합니다.
const HISTORICAL_DATA = [
  // {
  //   channelId: "65c3035bdc598c81f15a8fe0e958b3ce", // 초승달
  //   channelName: "초승달",
  //   milestone: 1000,
  //   date: "2024-05-15T12:00:00Z"
  // },
  // {
  //   channelId: "4de764d9dad3b25602284be6db3ac647", // 아리사
  //   channelName: "아리사",
  //   milestone: 5000,
  //   date: "2025-01-20T18:30:00Z"
  // }
];

async function main() {
  if (HISTORICAL_DATA.length === 0) {
    console.log("⚠️ 기입된 수집 데이터가 없습니다. `HISTORICAL_DATA` 배열에 데이터를 추가한 후 다시 실행해주세요.");
    return;
  }

  console.log(`🚀 총 ${HISTORICAL_DATA.length}개의 마일스톤 데이터 임포트를 시작합니다...\n`);

  for (const item of HISTORICAL_DATA) {
    const { channelId, channelName, milestone, date } = item;
    
    if (!channelId || !channelName || !milestone || !date) {
      console.warn("⚠️ 필수 필드 누락으로 건너뜁니다:", item);
      continue;
    }

    try {
      // 1. 이미 동일한 마일스톤 기록이 들어가 있는지 검증
      const existingRecords = await kv.lrange("milestones", 0, -1);
      const parsedRecords = existingRecords.map(r => typeof r === "string" ? JSON.parse(r) : r);
      
      const isDuplicate = parsedRecords.some(
        r => r.channelId === channelId && Number(r.milestone) === Number(milestone)
      );

      if (isDuplicate) {
        console.log(`ℹ️ [중복 패스] ${channelName} - ${milestone}H 기록이 이미 데이터베이스에 존재합니다.`);
        continue;
      }

      // 2. 신규 레코드 정보 구성 (명예의 전당용 구조)
      const newRecord = {
        channelId,
        channelName,
        milestone: Number(milestone),
        date: new Date(date).toISOString(),
      };

      // 3. Vercel KV milestones 리스트에 저장 (가장 최신 날짜순으로 자동 정렬되도록 순서 유지)
      await kv.lpush("milestones", JSON.stringify(newRecord));
      console.log(`✅ [임포트 성공] ${channelName}님의 ${milestone}시간 마일스톤 달성일(${date})이 저장되었습니다.`);

    } catch (err) {
      console.error(`❌ [에러 발생] ${channelName} (${milestone}H) 임포트 중 실패:`, err.message);
    }
  }

  console.log("\n🎉 모든 임포트 작업이 완료되었습니다!");
  process.exit(0);
}

main();
