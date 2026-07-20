import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CalculationEngine } from './calculation.engine';
import { ReasoningManager } from './reasoning.manager';
import { aiService } from '../ai/ai.service';

describe('Deterministic Reasoning & Calculation Engine Tests', () => {
  const engine = new CalculationEngine();
  const manager = new ReasoningManager(engine);
  const ownerDOB = new Date('2002-11-11T00:00:00.000Z');

  it('should evaluate mathematical expressions accurately without guessing', () => {
    const math1 = engine.evaluateMath('15 * 8');
    assert.strictEqual(math1.result, 120);

    const math2 = engine.evaluateMath('sqrt(144) + 10');
    assert.strictEqual(math2.result, 22);

    const math3 = engine.evaluateMath('-5 + 20');
    assert.strictEqual(math3.result, 15);
  });

  it('should calculate exact current and future personal age from date of birth', () => {
    const ageNow = engine.calculateAge(ownerDOB, new Date('2026-07-20T00:00:00.000Z'));
    assert.strictEqual(ageNow.result, 23);

    const ageFuture = engine.calculateAge(ownerDOB, new Date('2030-01-01T00:00:00.000Z'));
    assert.strictEqual(ageFuture.result, 27);
  });

  it('should calculate exact birthday countdown and leap years correctly', () => {
    const bday = engine.daysUntilBirthday(ownerDOB, new Date('2026-07-20T00:00:00.000Z'));
    assert.ok(bday.result > 0);

    const leap2028 = engine.isLeapYear(2028);
    assert.strictEqual(leap2028.result, true);

    const leap2027 = engine.isLeapYear(2027);
    assert.strictEqual(leap2027.result, false);
  });

  it('should calculate compound interest accurately', () => {
    const ci = engine.calculateCompoundInterest(1000, 5, 3);
    assert.strictEqual(ci.result.totalAmount, 1157.63);
    assert.strictEqual(ci.result.interestEarned, 157.63);
  });

  it('should calculate BMI accurately', () => {
    const bmi = engine.calculateBMI(70, 1.75);
    assert.strictEqual(bmi.result.bmi, 22.9);
    assert.strictEqual(bmi.result.category, 'Normal weight');
  });

  it('should convert units accurately (temperature, length, weight, storage)', () => {
    const temp = engine.convertUnit(100, 'celsius', 'fahrenheit');
    assert.strictEqual(temp.result, 212);

    const length = engine.convertUnit(1, 'km', 'm');
    assert.strictEqual(length.result, 1000);

    const storage = engine.convertUnit(1, 'gb', 'mb');
    assert.strictEqual(storage.result, 1024);
  });

  it('should convert base representations accurately (binary, hex, decimal)', () => {
    const hex = engine.convertBase(255, 10, 16);
    assert.strictEqual(hex.result, 'FF');

    const bin = engine.convertBase(15, 10, 2);
    assert.strictEqual(bin.result, '1111');
  });

  it('should detect deterministic intent and resolve via ReasoningManager', () => {
    assert.strictEqual(manager.isDeterministicQuery('How old am I?'), true);
    assert.strictEqual(manager.isDeterministicQuery('Days until my birthday'), true);

    const ageAnswer = manager.resolveDeterministicAnswer('How old am I?', ownerDOB);
    assert.notStrictEqual(ageAnswer, null);
    assert.ok(ageAnswer?.explanation.includes('23 years old'));
  });

  it('should execute end-to-end AIService completion using CalculationEngine', async () => {
    const response = await aiService.generateResponse('How old am I?', {
      userId: 'test-user-reasoning',
      sessionId: 'test-session-reasoning',
    });

    assert.ok(response.includes('23 years old'));
  });
});
