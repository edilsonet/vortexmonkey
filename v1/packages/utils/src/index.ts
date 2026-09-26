export const stableStringify = (value: unknown): string => {
  const normalize = (input: unknown): unknown => {
    if (Array.isArray(input)) return input.map(normalize);
    if (input !== null && typeof input === 'object') {
      return Object.fromEntries(Object.entries(input).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, normalize(item)]));
    }
    return input;
  };
  return JSON.stringify(normalize(value));
};

export const onlyDigits = (value: string): string => value.replace(/\D/g, '');

const checksum = (digits: readonly number[], factors: readonly number[]): number => {
  const sum = digits.reduce((total, digit, index) => total + digit * (factors[index] ?? 0), 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
};

export const isValidCpf = (input: string): boolean => {
  const cpf = onlyDigits(input);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) return false;
  const digits = [...cpf].map(Number);
  const first = checksum(digits.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = checksum([...digits.slice(0, 9), first], [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits[9] === first && digits[10] === second;
};

export const cn = (...classes: ReadonlyArray<string | false | null | undefined>): string => classes.filter(Boolean).join(' ');
