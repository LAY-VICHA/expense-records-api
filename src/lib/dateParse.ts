export const parseDate = (dateStr: string, isEnd = false): Date => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(
    y,
    m - 1,
    d,
    isEnd ? 30 : 7,
    isEnd ? 59 : 0,
    isEnd ? 59 : 0,
    isEnd ? 999 : 0
  );
};
