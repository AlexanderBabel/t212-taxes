export function round(num: number, placesAfterTheDot = 2): number {
  const multiplicand = Math.pow(10, placesAfterTheDot);
  return Math.round(num * multiplicand) / multiplicand;
}

export function parseNumber(input: string): number {
  if (!input || input === "Not available") {
    return 0;
  }

  try {
    return Number.parseFloat(input);
  } catch (err) {
    return 0;
  }
}
