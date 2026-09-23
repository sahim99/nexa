import { Tool, ToolPermissionTier } from '../tool.interface';

export class CalculatorTool implements Tool {
  name = 'calculator';
  description = 'Performs basic math operations: add, subtract, multiply, divide.';
  permissionTier = ToolPermissionTier.READONLY;
  schema = {
    type: 'object',
    properties: {
      operation: { type: 'string', enum: ['add', 'subtract', 'multiply', 'divide'] },
      a: { type: 'number' },
      b: { type: 'number' }
    },
    required: ['operation', 'a', 'b']
  };

  async execute(input: { operation: string, a: number, b: number }): Promise<any> {
    switch (input.operation) {
      case 'add': return input.a + input.b;
      case 'subtract': return input.a - input.b;
      case 'multiply': return input.a * input.b;
      case 'divide': return input.b !== 0 ? input.a / input.b : 'Error: Division by zero';
      default: throw new Error(`Unknown operation: ${input.operation}`);
    }
  }
}
