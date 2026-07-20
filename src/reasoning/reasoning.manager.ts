import { calculationEngine, CalculationEngine } from './calculation.engine';
import { ReasoningResult } from './reasoning.interface';

export class ReasoningManager {
  private readonly defaultDOB = new Date('2002-11-11T00:00:00.000Z');

  constructor(private readonly engine: CalculationEngine = calculationEngine) {}

  /**
   * Intelligently detects whether a user prompt requires exact deterministic calculation.
   *
   * @param prompt Input user query string
   * @returns True if prompt is deterministic, false if normal LLM processing is needed.
   */
  public isDeterministicQuery(prompt: string): boolean {
    if (!prompt || prompt.trim().length === 0) {
      return false;
    }

    const text = prompt.trim().toLowerCase();

    // 1. Personal age & birthday countdown queries
    if (
      /\b(how old am i|my age|what is my age|how old will i be in|age in \d{4}|days until my birthday|birthday countdown)\b/i.test(
        text,
      )
    ) {
      return true;
    }

    // 2. Math & Arithmetic
    if (
      /^(calculate|what is \d+|\d+\s*[+\-*/^])/i.test(text) ||
      /\b(compound interest|bmi for|body mass index)\b/i.test(text)
    ) {
      return true;
    }

    // 3. Leap Year & Date Math
    if (/\b(leap year|days between)\b/i.test(text)) {
      return true;
    }

    // 4. Unit Conversions & Base Conversions
    if (
      /\b(convert \d+|to fahrenheit|to celsius|to km|to miles|to gb|to mb|to hex|to binary)\b/i.test(
        text,
      )
    ) {
      return true;
    }

    return false;
  }

  /**
   * Resolves exact deterministic answers without hallucination.
   *
   * @param prompt Input prompt string
   * @param ownerDOB Optional custom date of birth override
   * @returns Resolved ReasoningResult object or null
   */
  public resolveDeterministicAnswer(prompt: string, ownerDOB?: Date): ReasoningResult | null {
    const text = prompt.trim().toLowerCase();
    const dob = ownerDOB || this.defaultDOB;

    // 1. Personal Age ("How old am I?")
    if (/\b(how old am i|my age|what is my age)\b/i.test(text)) {
      return this.engine.calculateAge(dob);
    }

    // 2. Future/Past Age ("How old will I be in 2030?")
    const futureAgeMatch =
      text.match(/age in (\d{4})/i) || text.match(/how old will i be in (\d{4})/i);
    if (futureAgeMatch) {
      const year = parseInt(futureAgeMatch[1], 10);
      const targetDate = new Date(Date.UTC(year, 0, 1));
      return this.engine.calculateAge(dob, targetDate);
    }

    // 3. Birthday Countdown ("Days until my birthday")
    if (/\b(days until my birthday|birthday countdown)\b/i.test(text)) {
      return this.engine.daysUntilBirthday(dob);
    }

    // 4. Leap Year ("Is 2028 a leap year?")
    const leapMatch = text.match(/is (\d{4}) a leap year/i) || text.match(/leap year (\d{4})/i);
    if (leapMatch) {
      return this.engine.isLeapYear(parseInt(leapMatch[1], 10));
    }

    // 5. Compound Interest ("Compound interest on 1000 at 5% for 3 years")
    const ciMatch = text.match(
      /compound interest (on|of) \$?(\d+(\.\d+)?) at (\d+(\.\d+)?)% for (\d+) years/i,
    );
    if (ciMatch) {
      const p = parseFloat(ciMatch[2]);
      const r = parseFloat(ciMatch[4]);
      const y = parseInt(ciMatch[6], 10);
      return this.engine.calculateCompoundInterest(p, r, y);
    }

    // 6. BMI ("BMI for 70 kg and 1.75 meters")
    const bmiMatch = text.match(
      /bmi for (\d+(\.\d+)?) ?(kg|kilograms) and (\d+(\.\d+)?) ?(m|meters)/i,
    );
    if (bmiMatch) {
      const weight = parseFloat(bmiMatch[1]);
      const height = parseFloat(bmiMatch[4]);
      return this.engine.calculateBMI(weight, height);
    }

    // 7. Unit Conversions ("Convert 100 celsius to fahrenheit", "Convert 50 miles to km")
    const convMatch = text.match(/convert (\d+(\.\d+)?) ([a-z]+) to ([a-z]+)/i);
    if (convMatch) {
      const val = parseFloat(convMatch[1]);
      const from = convMatch[3];
      const to = convMatch[4];

      if (['hex', 'binary', 'decimal'].includes(to)) {
        const toBase = to === 'hex' ? 16 : to === 'binary' ? 2 : 10;
        const fromBase = from === 'hex' ? 16 : from === 'binary' ? 2 : 10;
        return this.engine.convertBase(val, fromBase, toBase);
      }

      return this.engine.convertUnit(val, from, to);
    }

    // 8. Base Conversions ("Convert 255 to hex")
    const baseMatch = text.match(/convert (\w+) to (hex|binary|decimal)/i);
    if (baseMatch) {
      const val = baseMatch[1];
      const to = baseMatch[2];
      const toBase = to === 'hex' ? 16 : to === 'binary' ? 2 : 10;
      return this.engine.convertBase(val, 10, toBase);
    }

    // 9. Standard Math Calculation ("Calculate 15 * 8")
    const calcMatch =
      text.match(/calculate:?\s*(.+)/i) || text.match(/what is\s+([0-9+\-*/().\s^]+)/i);
    if (calcMatch && /[0-9]/.test(calcMatch[1])) {
      return this.engine.evaluateMath(calcMatch[1].replace(/\?/g, '').trim());
    }

    return null;
  }
}

export const reasoningManager = new ReasoningManager();
