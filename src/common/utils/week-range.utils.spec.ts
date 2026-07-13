import { getCurrentWeekRange } from './week-range.utils';

describe('getCurrentWeekRange', () => {
  it('calcula inicio y fin de semana para un lunes', () => {
    const monday = new Date('2025-06-02T10:00:00Z');
    const { startOfWeek, endOfWeek } = getCurrentWeekRange(monday);

    expect(startOfWeek.getDay()).toBe(1);
    expect(startOfWeek.getHours()).toBe(0);
    expect(endOfWeek.getTime() - startOfWeek.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('calcula inicio y fin de semana para un domingo', () => {
    const sunday = new Date('2025-06-01T10:00:00Z');
    const { startOfWeek, endOfWeek } = getCurrentWeekRange(sunday);

    expect(startOfWeek.getDay()).toBe(1);
    expect(startOfWeek.getTime()).toBeLessThan(sunday.getTime());
  });

  it('calcula inicio y fin de semana para un miercoles', () => {
    const wednesday = new Date('2025-06-04T15:30:00Z');
    const { startOfWeek, endOfWeek } = getCurrentWeekRange(wednesday);

    expect(startOfWeek.getDay()).toBe(1);
    expect(endOfWeek.getTime() - startOfWeek.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    expect(startOfWeek.getTime()).toBeLessThan(wednesday.getTime());
    expect(endOfWeek.getTime()).toBeGreaterThan(wednesday.getTime());
  });

  it('usa la fecha actual por defecto', () => {
    const { startOfWeek, endOfWeek } = getCurrentWeekRange();

    expect(startOfWeek).toBeInstanceOf(Date);
    expect(endOfWeek).toBeInstanceOf(Date);
    expect(endOfWeek.getTime()).toBeGreaterThan(startOfWeek.getTime());
  });
});
