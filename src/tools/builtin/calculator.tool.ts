import { ToolDefinition } from '../tool.interface';

export const calculatorTool: ToolDefinition = {
  id: 'calculator',
  name: 'Mathematical Calculator',
  description:
    'Evaluates basic mathematical expressions safely (addition, subtraction, multiplication, division, powers, roots).',
  parameters: {
    expression: {
      type: 'string',
      description: 'Mathematical expression string to evaluate (e.g. 15 * 8, 2^10, sqrt(144))',
      required: true,
    },
  },
  permissionLevel: 'SAFE',
  enabled: true,
  async execute(args) {
    if (!args?.expression || typeof args.expression !== 'string') {
      throw new Error('Expression parameter is required');
    }

    const expr = args.expression
      .replace(/\^/g, '**')
      .replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)')
      .replace(/abs\(([^)]+)\)/g, 'Math.abs($1)')
      .replace(/sin\(([^)]+)\)/g, 'Math.sin($1)')
      .replace(/cos\(([^)]+)\)/g, 'Math.cos($1)');

    // Sanitize string to allow only numbers, math operators, parens, and Math functions
    if (!/^[0-9+\-*/().\s*Math.\w]+$/.test(expr)) {
      throw new Error('Invalid or unsafe characters detected in mathematical expression.');
    }

    try {
      // Safe evaluation context
      const fn = new Function(`return (${expr});`);
      const result = fn();

      if (typeof result !== 'number' || isNaN(result)) {
        throw new Error('Expression did not evaluate to a valid number.');
      }

      return {
        expression: args.expression,
        result,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid syntax';
      throw new Error(`Calculation error: ${msg}`);
    }
  },
};
