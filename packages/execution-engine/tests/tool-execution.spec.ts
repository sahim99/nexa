import { ToolRegistry, CalculatorTool } from '@nexa/tools';
import { MemoryService } from '@nexa/memory';

async function runTest() {
  console.log('--- Nexa: Tool & Memory Integration Test ---');

  // 1. Tool execution test
  const registry = new ToolRegistry();
  const calc = new CalculatorTool();
  registry.register(calc);

  const tool = registry.getTool('calculator');
  if (!tool) throw new Error('Tool not found');

  console.log(`Executing tool: ${tool.name}...`);
  const result = await tool.execute({ operation: 'multiply', a: 6, b: 7 });
  console.log(`Result of 6 * 7: ${result}`);
  
  if (result !== 42) throw new Error(`Expected 42, got ${result}`);
  console.log('✅ Tool execution passed!');

  // 2. Memory write/read test
  console.log('\nTesting MemoryService (pgvector & HF Embeddings)...');
  const memory = new MemoryService();
  
  const testFact = 'The meaning of life, the universe, and everything is 42.';
  console.log(`Storing memory: "${testFact}"`);
  await memory.storeMemory('TEST_MEMORY', testFact, { source: 'integration_test' });

  console.log(`Searching memory for: "What is the meaning of life?"`);
  const searchResults = await memory.searchMemory('What is the meaning of life?', 1);
  
  if (searchResults.length === 0) {
    throw new Error('No memory search results returned.');
  }

  console.log('Search result found:');
  console.log(searchResults[0].content);
  console.log(`Similarity score: ${searchResults[0].similarity}`);

  console.log('✅ Memory search passed!');
  
  process.exit(0);
}

runTest().catch(e => {
  console.error('❌ Test Failed:', e);
  process.exit(1);
});
