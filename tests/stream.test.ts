import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VercelStreamWriter } from '../src/stream';
import { DataStreamWriter, StreamTextResult, ToolSet } from 'ai';

describe('VercelStreamWriter', () => {
  let mockStream: DataStreamWriter;
  let mockWrite: ReturnType<typeof vi.fn>;
  let writer: VercelStreamWriter;

  beforeEach(() => {
    mockWrite = vi.fn();
    mockStream = {
      write: mockWrite,
    } as unknown as DataStreamWriter;
  });

  describe('constructor', () => {
    it('should create instance with stream', () => {
      writer = new VercelStreamWriter(mockStream);
      expect(writer.getStream()).toBe(mockStream);
    });

    it('should create instance without stream', () => {
      writer = new VercelStreamWriter();
      expect(writer.getStream()).toBeUndefined();
    });
  });

  describe('mergeTextResult', () => {
    let mockMergeIntoDataStream: ReturnType<typeof vi.fn>;
    let mockResult: StreamTextResult<ToolSet, never>;

    beforeEach(() => {
      mockMergeIntoDataStream = vi.fn();
      mockResult = {
        mergeIntoDataStream: mockMergeIntoDataStream,
      } as unknown as StreamTextResult<ToolSet, never>;
      writer = new VercelStreamWriter(mockStream);
    });

    it('should merge result into stream with all options enabled', () => {
      writer.mergeTextResult(mockResult);

      expect(mockMergeIntoDataStream).toHaveBeenCalledWith(mockStream, {
        sendReasoning: true,
        sendUsage: true,
        sendSources: true,
      });
    });

    it('should not merge result when stream is undefined', () => {
      writer = new VercelStreamWriter();
      writer.mergeTextResult(mockResult);

      expect(mockMergeIntoDataStream).not.toHaveBeenCalled();
    });
  });

  describe('reasoning', () => {
    beforeEach(() => {
      writer = new VercelStreamWriter(mockStream);
    });

    it('should write reasoning to stream when string is provided', () => {
      const reasoning = 'Test reasoning';
      writer.reasoning(reasoning);

      expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('reasoning'));
      expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining(reasoning));
    });

    it('should not write to stream when non-string reasoning is provided', () => {
      writer.reasoning({ some: 'object' });
      expect(mockWrite).not.toHaveBeenCalled();
    });

    it('should not write to stream when stream is undefined', () => {
      writer = new VercelStreamWriter();
      writer.reasoning('Test reasoning');
      expect(mockWrite).not.toHaveBeenCalled();
    });
  });
});
