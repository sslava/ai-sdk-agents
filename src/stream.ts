import { DataStreamWriter, StreamTextResult, ToolSet } from 'ai';

export class VercelStreamWriter {
  constructor(private readonly stream: DataStreamWriter) {}

  public getStream() {
    return this.stream;
  }

  public mergeTextResult(result: StreamTextResult<ToolSet, never>) {
    result.mergeIntoDataStream(this.stream, {
      sendReasoning: true,
      sendUsage: true,
      sendSources: true,
    });
  }
}
