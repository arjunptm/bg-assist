export function secureShuffle<T>(values: readonly T[]): T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const selected = secureRandomInt(index + 1);
    [copy[index], copy[selected]] = [copy[selected]!, copy[index]!];
  }
  return copy;
}

export function secureRandomInt(maxExclusive: number): number {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError("maxExclusive must be a positive safe integer");
  }
  const range = 0x1_0000_0000;
  const limit = range - (range % maxExclusive);
  const value = new Uint32Array(1);
  do {
    crypto.getRandomValues(value);
  } while (value[0]! >= limit);
  return value[0]! % maxExclusive;
}

export function secureRandomBigInt(maxExclusive: bigint): bigint {
  if (maxExclusive <= 0n) throw new RangeError("maxExclusive must be positive");
  const bitLength = maxExclusive.toString(2).length;
  const byteLength = Math.ceil(bitLength / 8);
  const excessBits = byteLength * 8 - bitLength;
  const bytes = new Uint8Array(byteLength);
  while (true) {
    crypto.getRandomValues(bytes);
    if (excessBits > 0) bytes[0]! &= 0xff >>> excessBits;
    let value = 0n;
    for (const byte of bytes) value = (value << 8n) | BigInt(byte);
    if (value < maxExclusive) return value;
  }
}

