/* eslint-disable @typescript-eslint/no-explicit-any */
export type ReasoningCategory =
  'math' | 'date' | 'time' | 'finance' | 'unit' | 'programming' | 'health' | 'logic';

export interface ReasoningResult {
  category: ReasoningCategory;
  operation: string;
  input: Record<string, any>;
  result: any;
  explanation: string;
  verified: boolean;
}
