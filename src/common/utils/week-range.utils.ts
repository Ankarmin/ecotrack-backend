export function getCurrentWeekRange(referenceDate = new Date()) {
  const currentDate = new Date(referenceDate);
  const currentDay = currentDate.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;

  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() + mondayOffset);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return {
    startOfWeek,
    endOfWeek,
  };
}
