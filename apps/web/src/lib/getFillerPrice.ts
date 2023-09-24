export async function getFillerPrice(): Promise<number> {
  const devPortalKey = process.env['1INCH_KEY']!;

  const res = await fetch(
    `https://api.1inch.dev/price/v1.1/137/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee?currency=USD`,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${devPortalKey}`,
      }
    }
  );
  const data = await res.json();
  return parseFloat(data['0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee']);
}