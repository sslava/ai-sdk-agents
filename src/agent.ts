import { Message, DataStreamWriter, streamText, smoothStream, LanguageModel, Tool } from 'ai';
export class Agent {
  constructor(private readonly model: LanguageModel) {}

  public async run(
    system: string,
    history: Message[],
    dataStream: DataStreamWriter,
    tools: Record<string, Tool>,
    onFinish: (response: { messages: Message[] }) => Promise<void>
  ) {
    const result = streamText({
      model: this.model,
      system,
      messages: history,
      experimental_transform: smoothStream({ chunking: 'word' }),
      tools,
      toolCallStreaming: true,
      maxSteps: 5,
      onFinish: async (event) => {
        await onFinish({
          messages: event.response.messages.map((m) => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content.toString(),
            id: m.id,
          })),
        });
      },
      experimental_telemetry: {
        isEnabled: process.env.NODE_ENV === 'production',
        functionId: 'stream-text',
      },
    });
    result.consumeStream();
    result.mergeIntoDataStream(dataStream, { sendReasoning: true, sendUsage: true });
  }
}
