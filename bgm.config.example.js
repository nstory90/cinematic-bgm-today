// Cinematic BGM Today — 감성 문구용 LLM 설정 (예시 파일)
//
// 사용법
//   1. 이 파일을 복사해서 같은 폴더에 이름을 bgm.config.js 로 바꿔 저장합니다.
//   2. 쓸 회사의 키 칸 하나에만 실제 API 키를 붙여 넣습니다. (둘 다 넣었다면 provider 로 고릅니다)
//   3. bgm.config.js 는 GitHub에 올라가지 않습니다(.gitignore). 제출·공유 링크에도 넣지 마세요.
//
// 키가 비어 있거나 파일이 없으면, 앱은 미리 넣어 둔 예시 문구로 동작합니다.
window.BGM_CONFIG = {
  provider: "",                 // "claude" 또는 "openai" — 비워 두면 키를 넣은 쪽을 씀

  // Claude (console.anthropic.com 에서 발급)
  apiKey: "",                   // 예: "sk-ant-..."
  model: "claude-sonnet-5-5",

  // OpenAI (platform.openai.com 에서 발급, 결제 수단 등록 필요)
  openaiKey: "",                // 예: "sk-..."
  openaiModel: "gpt-6-luna",    // 작고 빠른 모델

  timeoutMs: 15000              // 이 시간 안에 답이 없으면 예시 문구 유지
};
