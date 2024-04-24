import { DataStreamWriter, formatDataStreamPart, StreamTextResult, ToolSet } from 'ai';

export class VercelStreamWriter {
  constructor(private readonly stream?: DataStreamWriter) {}

  public getStream() {
    return this.stream;
  }

  public mergeTextResult(result: StreamTextResult<ToolSet, never>) {
    if (!this.stream) {
      return;
    }
    result.mergeIntoDataStream(this.stream, {
      sendReasoning: true,
      sendUsage: true,
      sendSources: true,
    });
  }

  public reasoning(reasoning?: unknown) {
    if (typeof reasoning === 'string') {
      this.stream?.write(formatDataStreamPart('reasoning', reasoning));
    }
  }
}
