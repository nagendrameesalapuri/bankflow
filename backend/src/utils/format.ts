export function maskAccountNumber(accountNumber: string): string {
  const last4 = accountNumber.slice(-4);
  return `••••••${last4}`;
}

export function maskCardNumber(cardNumber: string): string {
  const last4 = cardNumber.slice(-4);
  return `•••• •••• •••• ${last4}`;
}

export function generateReferenceNumber(prefix = 'TXN'): string {
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

export function generateAccountNumber(): string {
  let digits = '';
  for (let i = 0; i < 12; i++) digits += Math.floor(Math.random() * 10);
  return digits;
}

export function generateCardNumber(): string {
  let digits = '4';
  for (let i = 0; i < 15; i++) digits += Math.floor(Math.random() * 10);
  return digits;
}
