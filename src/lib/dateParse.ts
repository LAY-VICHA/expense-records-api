export const parseDate = (dateStr: string, isEnd = false): Date => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(
    y,
    m - 1,
    d,
    isEnd ? 30 : 7,
    isEnd ? 59 : 0,
    isEnd ? 59 : 0,
    isEnd ? 999 : 0,
  );
};

export const getMonthName = (month: number): string => {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return months[month - 1] || "";
};
