import { describe, expect, it } from 'vitest';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { handleToolError, SkillError, SkillsErrorCode, toMcpError } from './errors.js';

describe('skills errors', () => {
  it('maps not found skill errors to not found', () => {
    expect(() =>
      handleToolError(new SkillError('missing', 'SKILL_NOT_FOUND'), 'getSkill')
    ).toThrow(expect.objectContaining({ code: SkillsErrorCode.NotFound }));
  });

  it('maps invalid path errors to invalid params', () => {
    expect(() =>
      handleToolError(new SkillError('bad path', 'INVALID_PATH'), 'readSkillFile')
    ).toThrow(expect.objectContaining({ code: ErrorCode.InvalidParams }));
  });

  it('maps access denied errors to invalid params', () => {
    expect(() =>
      handleToolError(new SkillError('access denied', 'ACCESS_DENIED'), 'readSkillFile')
    ).toThrow(expect.objectContaining({ code: ErrorCode.InvalidParams }));
  });

  it('wraps unknown errors as internal error', () => {
    const result = toMcpError(new Error('boom'), 'listSkills');
    expect(result.code).toBe(ErrorCode.InternalError);
  });
});
