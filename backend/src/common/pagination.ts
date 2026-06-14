export function paginate(page: any, limit: any): { skip: number; take: number; page: number; limit: number } {
  const p = Math.max(1, Math.floor(Number(page) || 1));
  const l = Math.min(100, Math.max(1, Math.floor(Number(limit) || 20)));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
}
