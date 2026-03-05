// Characters excluding ambiguous ones: 0/O, 1/I/L
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateActivationCode(): string {
  const segments: string[] = [];
  for (let s = 0; s < 3; s++) {
    let segment = '';
    for (let i = 0; i < 4; i++) {
      const randomBytes = new Uint8Array(1);
      crypto.getRandomValues(randomBytes);
      segment += CHARSET[randomBytes[0] % CHARSET.length];
    }
    segments.push(segment);
  }
  return segments.join('-');
}
