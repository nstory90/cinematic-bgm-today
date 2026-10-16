// 추천 규칙 자동 검사 — 실행: node selfTest.js
// index.html 의 <script id="engine"> 블록만 떼어 Node 에서 실행합니다 (설치할 것 없음).
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const m = html.match(/<script id="engine">([\s\S]*?)<\/script>/);
if (!m) { console.error("index.html 에서 추천 엔진을 찾지 못했습니다"); process.exit(1); }
const ctx = {};
vm.runInNewContext(m[1] + "\nthis.BGM = BGM;", ctx);
const BGM = ctx.BGM;

let pass = 0, fail = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log("  통과  " + name); }
  else { fail++; console.log("  실패  " + name + "\n         기대: " + e + "\n         실제: " + a); }
}
const bpms = (r) => r.cards.map((c) => c.bpm);
const run = (mood, weather, schedule, target) => BGM.recommend({ mood, weather, schedule, target });

console.log("[BPM 흐름]");
check("불안→자신감, 회의 1개 = 72/95/118", bpms(run("불안", "비", "오후 회의 1개", "자신감")), [72, 95, 118]);
check("불안→자신감, 임원 보고+회의 3개 = 72/105/118", bpms(run("불안", "비", "오전 임원 보고, 오후 회의 3개", "자신감")), [72, 105, 118]);
check("지침→편안, 야근 = 68/73/78", bpms(run("지침", "맑음", "야근", "편안")), [68, 73, 78]);
check("휴가면 점심 −10", bpms(run("편안", "맑음", "연차 내고 휴식", "신남")), [78, 92, 125]);

console.log("[점심은 아침·저녁 사이에서만]");
check("집중→자신감, 빡빡 = 100/118/118", bpms(run("집중", "맑음", "보고, 회의", "자신감")), [100, 118, 118]);
check("불안→지침, 여유 = 72/68/68", bpms(run("불안", "맑음", "휴가", "지침")), [72, 68, 68]);
check("지침→불안, 빡빡 = 68/72/72", bpms(run("지침", "맑음", "보고, 회의", "불안")), [68, 72, 72]);
check("유지형은 그대로 ±10 (편안 빡빡 = 78/88/78)", bpms(run("편안", "맑음", "보고, 회의", "편안")), [78, 88, 78]);
{
  let outside = 0;
  for (const a of BGM.MOODS) for (const b of BGM.MOODS) for (const s of ["", "보고, 회의", "휴가"]) {
    if (a.id === b.id) continue;
    const [m, l, e] = bpms(run(a.id, "맑음", s, b.id));
    if (l < Math.min(m, e) || l > Math.max(m, e)) outside++;
  }
  check("모든 기분 조합에서 점심이 흐름 안에 있음", outside, 0);
}

console.log("[앱을 켠 시간대]");
check("5~10시 = 아침, 11~16시 = 점심, 17~4시 = 저녁",
  [5, 10, 11, 16, 17, 23, 0, 4].map(BGM.slotOfHour), ["아침", "아침", "점심", "점심", "저녁", "저녁", "저녁", "저녁"]);
check("시간대를 안 주면 아침으로 (예전과 같음)", run("불안", "비", "회의", "자신감").slot, "아침");
const times = (r) => r.cards.map((c) => c.time + ":" + c.kind);
check("아침에 켜면 아침(NOW)·점심·저녁 3장", times(run("불안", "비", "회의", "자신감")), ["아침:now", "점심:plan", "저녁:plan"]);

const lunchRec = BGM.recommend({ mood: "불안", weather: "비", schedule: "보고, 회의", target: "자신감", slot: "점심" });
check("점심에 켜면 점심(NOW)·저녁 2장", times(lunchRec), ["점심:now", "저녁:plan"]);
check("점심: 지금 기분 → 목표 BPM", bpms(lunchRec), [72, 118]);
check("점심: 빡빡하면 저녁은 회복용", lunchRec.cards[1].mod, "회복용 부드러운");
check("점심: 장면 제목", lunchRec.cards.map((c) => c.scene), ["Scene 1. 빗속의 점심 산책", "Scene 2. 빗속의 귀갓길"]);

const eveRec = BGM.recommend({ mood: "지침", weather: "맑음", schedule: "야근", target: "편안", slot: "저녁" });
check("저녁에 켜면 저녁(NOW)·밤 2장", times(eveRec), ["저녁:now", "밤:plan"]);
check("저녁: 68 → 78", bpms(eveRec), [68, 78]);
check("맑은 저녁은 노을, 밤은 별빛", eveRec.cards.map((c) => c.scene), ["Scene 1. 노을 진 귀갓길", "Scene 2. 별빛 아래 잠들기 전"]);
check("저녁: 목표 장르 = 편안(어쿠스틱)", eveRec.cards[1].genre, "어쿠스틱 · 로파이");

console.log("[일정 점수]");
check("일정 없음 = 보통 0점", [BGM.scoreSchedule("").level, BGM.scoreSchedule("").score], ["보통", 0]);
check("키워드 없는 일정 = 보통", BGM.scoreSchedule("친구랑 저녁").level, "보통");
check("같은 단어는 한 번만 (회의 회의 회의 = 2점)", BGM.scoreSchedule("회의, 회의, 회의").score, 2);
check("보고+회의 = 4점 빡빡 +10", [BGM.scoreSchedule("보고, 회의").score, BGM.scoreSchedule("보고, 회의").adjust], [4, 10]);
check("미팅+외근+운동 = 3점 보통", BGM.scoreSchedule("미팅 후 외근, 저녁 운동").level, "보통");

console.log("[카드 내용]");
const r1 = run("불안", "비", "오전 임원 보고, 오후 회의 3개", "자신감");
check("날씨 비 → 아침 수식어", r1.cards[0].mod, "빗소리 섞인");
check("빡빡한 날 저녁 수식어", r1.cards[2].mod, "회복용 부드러운");
check("점심 장르는 두 분위기를 섞음", r1.cards[1].genre, "로파이 × 펑크");
check("장면 제목", r1.cards[0].scene, "Scene 1. 빗속의 출근길");
check("한 줄 카피", r1.copy, "빗소리가 박수로 바뀌는 날");
check("카드마다 설명 2줄", r1.cards.map((c) => c.lines.length), [2, 2, 2]);
check("눈 수식어", run("집중", "눈", "", "집중").cards[0].mod, "벨 소리가 들어간");

console.log("[유지형]");
const keep = run("편안", "흐림", "", "편안");
check("같은 기분이면 유지형", keep.keep, true);
check("유지형 BPM", bpms(keep), [78, 78, 78]);

console.log("[같은 입력 → 같은 결과]");
check("두 번 실행해도 동일", JSON.stringify(run("설렘", "맑음", "발표", "집중")), JSON.stringify(run("설렘", "맑음", "발표", "집중")));

console.log("[현재 위치 날씨 코드 → 날씨]");
check("0·1 = 맑음", [0, 1].map(BGM.weatherFromCode), ["맑음", "맑음"]);
check("2·3·45 = 흐림", [2, 3, 45].map(BGM.weatherFromCode), ["흐림", "흐림", "흐림"]);
check("51·61·81·95 = 비", [51, 61, 81, 95].map(BGM.weatherFromCode), ["비", "비", "비", "비"]);
check("71·75·85 = 눈", [71, 75, 85].map(BGM.weatherFromCode), ["눈", "눈", "눈"]);

console.log("[Claude 응답 검사]");
const good = JSON.stringify({ movieTitle: "제목", copy: "카피", cards: [1, 2, 3].map((i) => ({ scene: "Scene " + i, lines: ["a", "b"] })) });
check("정상 JSON 통과", !!BGM.parseLLM("여기 결과입니다\n" + good), true);
check("카드 2장이면 거부", BGM.parseLLM(JSON.stringify({ movieTitle: "a", copy: "b", cards: [] })), null);
check("JSON 아니면 거부", BGM.parseLLM("죄송합니다"), null);
const two = JSON.stringify({ movieTitle: "제목", copy: "카피", cards: [1, 2].map((i) => ({ scene: "Scene " + i, lines: ["a", "b"] })) });
check("카드 2장 결과는 2장 응답만 통과", [!!BGM.parseLLM(two, 2), BGM.parseLLM(two, 3)], [true, null]);

console.log("[예시 문구]");
{
  const slotRun = (mood, weather, schedule, target, slot) => BGM.recommend({ mood, weather, schedule, target, slot });
  const titles = new Set();
  for (const a of BGM.MOODS) for (const b of BGM.MOODS) titles.add(slotRun(a.id, "맑음", "", b.id, "아침").movieTitle);
  check("기분 조합 49개 = 제목 49개 (출발·도착 기분이 모두 제목에)", titles.size, 49);
  check("제목에 출발·도착 기분이 드러남", slotRun("불안", "비", "", "자신감", "아침").movieTitle, "떨리는 아침, 박수받는 저녁");
  check("저녁에 켜면 맑아도 '햇살' 대신 '노을'", slotRun("지침", "맑음", "", "편안", "저녁").copy, "노을이 자장가로 바뀌는 날");
  check("첫 장면에 날씨 한마디", slotRun("불안", "비", "", "자신감", "아침").cards[0].lines[1].startsWith("창밖 빗소리를 박자 삼아"), true);
  const busy = slotRun("불안", "비", "보고, 회의", "자신감", "아침");
  check("점심에 고른 일정 이름", busy.cards[1].lines[1], "회의·보고가 몰린 한낮, 걸음에 맞춰 템포를 올립니다.");
  check("빡빡한 날 신나는 목표 = 리듬은 살린다는 말", busy.cards[2].lines[1], "회의·보고를 마친 저녁, 리듬의 힘은 살리고 소리는 부드럽게 다듬었습니다.");
  check("빡빡한 날 차분한 목표 = 몸을 풀어 준다는 말", slotRun("불안", "비", "야근, 마감", "편안", "아침").cards[2].lines[1], "마감·야근을 마친 저녁, 소리는 부드럽게 골라 몸을 풀어 줍니다.");   // 일정 이름은 키워드 표 순서
  check("받침 따라 조사 (발표가 / 야근이)", [slotRun("편안", "맑음", "발표, 회의", "신남", "아침").cards[1].lines[1].slice(0, 6), slotRun("편안", "맑음", "마감, 야근", "신남", "아침").cards[1].lines[1].slice(0, 6)], ["회의·발표가", "마감·야근이"]);
  // 모든 기분·날씨·시간대·일정 조합에서 AI 문구와 같은 길이 규칙을 지킴 (화면이 깨지지 않게)
  let bad = 0, total = 0;
  for (const a of BGM.MOODS) for (const b of BGM.MOODS) for (const w of ["맑음", "흐림", "비", "눈"])
    for (const slot of ["아침", "점심", "저녁"]) for (const s of ["", "보고, 회의, 발표", "휴가, 휴식", "미팅"]) {
      const r = slotRun(a.id, w, s, b.id, slot); total++;
      const t = { movieTitle: r.movieTitle, copy: r.copy, cards: r.cards.map((c) => ({ scene: c.scene, lines: c.lines })) };
      if (!BGM.parseLLM(JSON.stringify(t), r.cards.length) || /undefined|null/.test(JSON.stringify(t))) bad++;
    }
  check("예시 문구 " + total + "개 조합 모두 길이·형식 통과", bad, 0);
}

console.log("[표정 → 기분 %]");
{
  const rowsSum = Object.entries(BGM.EXPR_TO_MOOD).map(([k, m]) => [k, Math.round(Object.values(m).reduce((a, b) => a + b, 0) * 1000) / 1000]);
  check("표정마다 나눠 주는 몫의 합 = 1", rowsSum.every(([, s]) => s === 1), true);
  const ids = BGM.MOODS.map((m) => m.id);
  check("표정 표에 없는 기분 이름 없음", Object.values(BGM.EXPR_TO_MOOD).every((m) => Object.keys(m).every((id) => ids.includes(id))), true);
  const mixes = [{ happy: 1 }, { neutral: 0.7, happy: 0.2, sad: 0.1 }, { fearful: 0.33, surprised: 0.33, angry: 0.34 }, { disgusted: 0.01 }];
  check("퍼센트 합은 항상 100", mixes.map((e) => BGM.moodPercents(e).reduce((s, r) => s + r.pct, 0)), [100, 100, 100, 100]);
  check("얼굴이 없으면 모두 0", BGM.moodPercents({}).every((r) => r.pct === 0), true);
  const top = (e) => BGM.topMood(BGM.moodPercents(e));
  check("활짝 웃음 = 신남", top({ happy: 0.95, neutral: 0.05 }), "신남");
  check("슬픈 표정 = 지침", top({ sad: 0.9, neutral: 0.1 }), "지침");
  check("두려운 표정 = 불안", top({ fearful: 0.8, surprised: 0.2 }), "불안");
  check("무표정 = 편안", top({ neutral: 1 }), "편안");
  check("놀란 표정 = 설렘", top({ surprised: 0.9, happy: 0.1 }), "설렘");
  check("굳은 표정 = 자신감", top({ angry: 0.8, neutral: 0.2 }), "자신감");
  check("무표정 + 찡그림 = 집중", top({ neutral: 0.5, disgusted: 0.5 }), "집중");
}

console.log("[여러 명일 때 '나' 고르기]");
{
  const W = 640, H = 480;
  const near = { x: 250, y: 150, w: 160, h: 160 }, far = { x: 40, y: 60, w: 70, h: 70 }, side = { x: 470, y: 160, w: 150, h: 150 };
  check("얼굴 없음 = -1", BGM.pickMainFace([], null, W, H), -1);
  check("가장 큰(가까운) 얼굴", BGM.pickMainFace([far, near], null, W, H), 1);
  check("크기가 비슷하면 가운데 쪽", BGM.pickMainFace([side, near], null, W, H), 1);
  const meMoved = { x: 260, y: 155, w: 120, h: 120 }, other = { x: 30, y: 100, w: 140, h: 140 };   // 나보다 1.36배
  check("조금 큰 사람이 들어와도 나를 계속 따라감", BGM.pickMainFace([other, meMoved], near, W, H), 1);
  const bigOther = { x: 20, y: 20, w: 300, h: 300 };
  check("1.5배 이상 큰 사람이 앞에 오면 넘어감", BGM.pickMainFace([bigOther, meMoved], near, W, H), 0);
}

console.log(`\n결과: 통과 ${pass} / 실패 ${fail}`);
process.exit(fail ? 1 : 0);
