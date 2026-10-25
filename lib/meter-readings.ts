import { MeterReading } from './types';

export function compareMeterReadings(a: MeterReading, b: MeterReading): number {
  const dateOrder = a.reading_date.slice(0, 10).localeCompare(b.reading_date.slice(0, 10));
  if (dateOrder !== 0) return dateOrder;

  return a.created_at.localeCompare(b.created_at);
}
