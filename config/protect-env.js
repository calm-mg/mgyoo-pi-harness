// Both extension APIs emit tool_call with toolName/input and accept { block, reason }.
// A guardrail for direct write calls, not a sandbox for shells or other tools.
export default function protectEnv(api) {
  api.on('tool_call', (event) => {
    if (event.toolName !== 'write' || typeof event.input?.path !== 'string') return;
    // OMP also accepts a read snapshot header such as [src/.env#ABCD].
    const target = event.input.path.replace(/^\[(.*)#[\da-f]{4}\]$/i, '$1');
    if (/(?:^|[\\/])\.env(?:\.[^\\/]*)?$/i.test(target)) {
      return { block: true, reason: '하네스: write 도구로 .env 파일을 덮어쓸 수 없습니다.' };
    }
  });
}
