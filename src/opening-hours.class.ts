import { DateTime, Interval, Settings } from 'luxon';

export class OpeningHours {
    // @ts-ignore
    #openingHours: Record<string, (Interval | null)[]> = {};
    // @ts-ignore
    #timezone: string;

    constructor(timezone: string = 'utc') {
        this.setTimezone(timezone);
    }

    public create(data: Record<string, string[]>, timezone = 'utc') {
        this.setTimezone(timezone);
        this.fill(data);
    }

    public toStructuredData() {
        const res = {};
        for (const day of Object.keys(this.#openingHours)) {
            const value = this.#openingHours[day]
                .filter((i) => i)
                .map((i) => i?.toString());
            Object.defineProperty(res, day, {
                value,
                writable: true,
                enumerable: true,
                configurable: true,
            });
        }
        return res;
    }

    private merge(initial: Interval, other: Interval) {
        return initial.union(other);
    }

    private overlaps(initial: Interval, other: Interval) {
        return initial.overlaps(other);
    }

    private fill(data: Record<string, string[]>) {
        this.parseOpeningHoursAndExceptions(data);
        this.mergeOverlappingRanges();
    }

    private mergeOverlappingRanges() {
        for (const day of Object.keys(this.#openingHours)) {
            let ranges = [];
            const initialDayRanges = [...this.#openingHours[day]];
            while (initialDayRanges.length > 0) {
                const first = initialDayRanges.shift();
                // @ts-ignore
                const existingRanges = [...ranges];
                if (ranges.length === 0) {
                    ranges.push(first);
                    continue;
                }
                if (first) {
                    let overlaps = false;
                    ranges = existingRanges.map((e: Interval) => {
                        if (this.overlaps(e, first)) {
                            overlaps = true;
                            return this.merge(e, first);
                        } else {
                            return e;
                        }
                    });
                    if (!overlaps) ranges.push(first);
                }
            }
            this.#openingHours[day] = ranges;
        }
    }

    private parseOpeningHoursAndExceptions(data: Record<string, string[]>) {
        const now = DateTime.now();
        for (const [i, day] of [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'sunday',
        ].entries()) {
            if (!data[day]) continue;
            this.#openingHours[day] = data[day].map((str) => {
                if (!str) return null;
                const splitted = str.split('-');
                const start = DateTime.fromFormat(splitted[0], 'HH:mm').set({
                    weekday: i + 1,
                });
                const end = DateTime.fromFormat(splitted[1], 'HH:mm').set({
                    weekday: i + 1,
                });
                const weekNumber =
                    start.startOf('day').diff(now.startOf('day')).valueOf() < 0
                        ? now.weekNumber + 1
                        : now.weekNumber;
                return Interval.fromDateTimes(
                    start.set({ weekNumber }),
                    end.set({
                        weekNumber,
                    })
                );
            });
        }
    }

    private setTimezone(timezone = 'utc') {
        this.#timezone = timezone;
        if (this.#timezone) {
            const init = DateTime.local().setZone(timezone);
            if (!init.isValid && init.invalidReason === 'unsupported zone') {
                throw new Error(
                    'Invalid timezone passed to OpeningHours class'
                );
            }
        }
        Settings.defaultZone = 'utc';
    }
}
