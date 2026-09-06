import type { GameController } from './contracts';
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean };
  execute: (input: unknown) => unknown;
};
declare global {
  interface Document {
    readonly modelContext?: {
      registerTool: (
        tool: Tool,
        options?: { signal: AbortSignal },
      ) => void | Promise<void>;
    };
  }
}
export function registerGameTools(controller: GameController) {
  const context = document.modelContext;
  if (!context?.registerTool) return () => {};
  const life = new AbortController();
  const tools: Tool[] = [
    {
      name: 'read_game_state',
      description:
        'Read Little Lobster health, pearls, region, and game status.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: () => controller.snapshot(),
    },
    {
      name: 'set_game_paused',
      description: 'Pause or resume the current Little Lobster adventure.',
      inputSchema: {
        type: 'object',
        properties: { paused: { type: 'boolean' } },
        required: ['paused'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute(input) {
        if (
          typeof input !== 'object' ||
          input === null ||
          !('paused' in input) ||
          typeof input.paused !== 'boolean'
        )
          throw new Error('paused must be a boolean');
        controller.pause(input.paused);
        return controller.snapshot();
      },
    },
  ];
  for (const tool of tools) {
    try {
      void Promise.resolve(
        context.registerTool(tool, { signal: life.signal }),
      ).catch(() => {});
    } catch {}
  }
  return () => life.abort();
}
