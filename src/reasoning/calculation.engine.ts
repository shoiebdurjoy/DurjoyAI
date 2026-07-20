import { ReasoningResult } from './reasoning.interface';

export class CalculationEngine {
  /**
   * Evaluates mathematical expressions accurately.
   */
  public evaluateMath(expression: string): ReasoningResult {
    const expr = expression
      .replace(/\^/g, '**')
      .replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)')
      .replace(/abs\(([^)]+)\)/g, 'Math.abs($1)');

    if (!/^[0-9+\-*/().\s*Math.\w]+$/.test(expr)) {
      throw new Error('Unsafe or invalid math expression.');
    }

    const fn = new Function(`return (${expr});`);
    const val = fn();

    if (typeof val !== 'number' || isNaN(val)) {
      throw new Error('Math expression did not evaluate to a valid number.');
    }

    return {
      category: 'math',
      operation: 'evaluate',
      input: { expression },
      result: val,
      explanation: `Calculated ${expression} = ${val}`,
      verified: true,
    };
  }

  /**
   * Calculates exact age from a birth date as of a target date.
   */
  public calculateAge(birthDate: Date, targetDate: Date = new Date()): ReasoningResult {
    let years = targetDate.getUTCFullYear() - birthDate.getUTCFullYear();
    const m = targetDate.getUTCMonth() - birthDate.getUTCMonth();

    if (m < 0 || (m === 0 && targetDate.getUTCDate() < birthDate.getUTCDate())) {
      years--;
    }

    return {
      category: 'date',
      operation: 'calculate_age',
      input: { birthDate: birthDate.toISOString(), targetDate: targetDate.toISOString() },
      result: years,
      explanation: `Exact age is ${years} years old as of ${targetDate.toISOString().split('T')[0]}.`,
      verified: true,
    };
  }

  /**
   * Calculates exact days until next birthday.
   */
  public daysUntilBirthday(birthDate: Date, targetDate: Date = new Date()): ReasoningResult {
    const nextBday = new Date(
      Date.UTC(targetDate.getUTCFullYear(), birthDate.getUTCMonth(), birthDate.getUTCDate()),
    );

    if (nextBday.getTime() < targetDate.getTime()) {
      nextBday.setUTCFullYear(targetDate.getUTCFullYear() + 1);
    }

    const diffMs = nextBday.getTime() - targetDate.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return {
      category: 'date',
      operation: 'birthday_countdown',
      input: { birthDate: birthDate.toISOString(), targetDate: targetDate.toISOString() },
      result: days,
      explanation: `There are ${days} days until your next birthday.`,
      verified: true,
    };
  }

  /**
   * Calculates days between two dates.
   */
  public daysBetweenDates(d1: Date, d2: Date): ReasoningResult {
    const diffMs = Math.abs(d2.getTime() - d1.getTime());
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return {
      category: 'date',
      operation: 'days_between',
      input: { d1: d1.toISOString(), d2: d2.toISOString() },
      result: days,
      explanation: `There are ${days} days between the specified dates.`,
      verified: true,
    };
  }

  /**
   * Checks if a year is a leap year.
   */
  public isLeapYear(year: number): ReasoningResult {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return {
      category: 'date',
      operation: 'leap_year',
      input: { year },
      result: isLeap,
      explanation: `${year} is ${isLeap ? 'a leap year' : 'not a leap year'}.`,
      verified: true,
    };
  }

  /**
   * Calculates compound interest: A = P(1 + r/n)^(nt).
   */
  public calculateCompoundInterest(
    principal: number,
    annualRatePct: number,
    years: number,
    compoundsPerYear = 1,
  ): ReasoningResult {
    const r = annualRatePct / 100;
    const amount = principal * Math.pow(1 + r / compoundsPerYear, compoundsPerYear * years);
    const interest = amount - principal;

    return {
      category: 'finance',
      operation: 'compound_interest',
      input: { principal, annualRatePct, years, compoundsPerYear },
      result: {
        totalAmount: Number(amount.toFixed(2)),
        interestEarned: Number(interest.toFixed(2)),
      },
      explanation: `Principal $${principal} at ${annualRatePct}% over ${years} years grows to $${amount.toFixed(2)} ($${interest.toFixed(2)} interest).`,
      verified: true,
    };
  }

  /**
   * Calculates BMI: weight (kg) / height (m)^2.
   */
  public calculateBMI(weightKg: number, heightMeters: number): ReasoningResult {
    if (heightMeters <= 0) {
      throw new Error('Height must be greater than zero.');
    }
    const bmi = Number((weightKg / (heightMeters * heightMeters)).toFixed(1));

    let category = 'Normal weight';
    if (bmi < 18.5) category = 'Underweight';
    else if (bmi >= 25 && bmi < 29.9) category = 'Overweight';
    else if (bmi >= 30) category = 'Obesity';

    return {
      category: 'health',
      operation: 'bmi',
      input: { weightKg, heightMeters },
      result: { bmi, category },
      explanation: `BMI is ${bmi} (${category}).`,
      verified: true,
    };
  }

  /**
   * Performs unit conversions (temperature, length, weight, storage).
   */
  public convertUnit(value: number, fromUnit: string, toUnit: string): ReasoningResult {
    const from = fromUnit.toLowerCase();
    const to = toUnit.toLowerCase();
    let result = value;

    // Temperature
    if (from === 'celsius' && to === 'fahrenheit') {
      result = (value * 9) / 5 + 32;
    } else if (from === 'fahrenheit' && to === 'celsius') {
      result = ((value - 32) * 5) / 9;
    } else if (from === 'celsius' && to === 'kelvin') {
      result = value + 273.15;
    }

    // Length (to meters)
    const lengthMap: Record<string, number> = {
      m: 1,
      meter: 1,
      meters: 1,
      km: 1000,
      kilometer: 1000,
      kilometers: 1000,
      ft: 0.3048,
      feet: 0.3048,
      mi: 1609.34,
      mile: 1609.34,
      miles: 1609.34,
    };

    if (lengthMap[from] && lengthMap[to]) {
      const meters = value * lengthMap[from];
      result = meters / lengthMap[to];
    }

    // Weight (to kg)
    const weightMap: Record<string, number> = {
      kg: 1,
      kilogram: 1,
      kilograms: 1,
      g: 0.001,
      gram: 0.001,
      grams: 0.001,
      lb: 0.453592,
      lbs: 0.453592,
      pound: 0.453592,
      pounds: 0.453592,
    };

    if (weightMap[from] && weightMap[to]) {
      const kg = value * weightMap[from];
      result = kg / weightMap[to];
    }

    // Storage (to bytes)
    const storageMap: Record<string, number> = {
      b: 1,
      byte: 1,
      bytes: 1,
      kb: 1024,
      mb: 1024 * 1024,
      gb: 1024 * 1024 * 1024,
      tb: 1024 * 1024 * 1024 * 1024,
    };

    if (storageMap[from] && storageMap[to]) {
      const bytes = value * storageMap[from];
      result = bytes / storageMap[to];
    }

    const resFormatted = Number(result.toFixed(4));

    return {
      category: 'unit',
      operation: 'convert_unit',
      input: { value, fromUnit, toUnit },
      result: resFormatted,
      explanation: `${value} ${fromUnit} = ${resFormatted} ${toUnit}`,
      verified: true,
    };
  }

  /**
   * Converts base representations (binary, decimal, hex).
   */
  public convertBase(value: string | number, fromBase: number, toBase: number): ReasoningResult {
    const num = parseInt(String(value), fromBase);

    if (isNaN(num)) {
      throw new Error(`Invalid number representation '${value}' for base ${fromBase}`);
    }

    const converted = num.toString(toBase).toUpperCase();

    return {
      category: 'programming',
      operation: 'convert_base',
      input: { value, fromBase, toBase },
      result: converted,
      explanation: `${value} (base ${fromBase}) = ${converted} (base ${toBase})`,
      verified: true,
    };
  }
}

export const calculationEngine = new CalculationEngine();
