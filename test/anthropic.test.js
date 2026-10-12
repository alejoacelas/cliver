import test from 'node:test';
import assert from 'node:assert/strict';
import { runPrompt } from '../lib/anthropic.js';

test('preserves thinking and matches parallel tool results across Claude turns', async (t) => {
  process.env.ANTHROPIC_API_KEY = 'test-only';
  const content = [
    { type: 'thinking', thinking: '', signature: 'opaque-signature' },
    { type: 'tool_use', id: 'tool_1', name: 'unknown_tool', input: {} },
    { type: 'tool_use', id: 'tool_2', name: 'unknown_tool', input: {} },
  ];
  let turn = 0;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.anthropic.com/v1/messages');
    const request = JSON.parse(options.body);
    assert.equal(request.model, 'claude-opus-5-5');
    assert.ok(request.tools.every(tool => tool.input_schema));
    if (turn++ === 0) return Response.json({ content, stop_reason: 'tool_use' });
    assert.deepEqual(request.messages[1], { role: 'assistant', content });
    assert.deepEqual(request.messages[2].content.map(result => result.tool_use_id), ['tool_1', 'tool_2']);
    return Response.json({ content: [{type:'thinking', thinking:'private'}, {type:'text', text:'Report'}], stop_reason:'end_turn' });
  });
  assert.equal((await runPrompt('Test')).markdown, 'Report');
  assert.equal(turn, 2);
});

test('rejects a truncated report', async (t) => {
  process.env.ANTHROPIC_API_KEY = 'test-only';
  t.mock.method(globalThis, 'fetch', async () => Response.json({content:[{type:'text',text:'Partial report'}],stop_reason:'max_tokens'}));
  await assert.rejects(runPrompt('Test'), /incomplete/);
});
