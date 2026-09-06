export function getLocalYYYYMMDD(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getYesterdayYYYYMMDD(): string {
  const d = new Date(Date.now() - 86400000);
  return getLocalYYYYMMDD(d);
}
