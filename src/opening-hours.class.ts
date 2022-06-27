import { DateTime, Duration, DurationUnit, Interval, Settings } from 'luxon';
import { Day, daysArray } from './day.type';

type OpeningHoursCreationDTO = {
    [key in Day]?: string[];
};

type OpeningHoursDefinition = {
    [key in Day]: Interval[];
};

export class OpeningHours {
    #openingHours: OpeningHoursDefinition = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
    };
    #timezone: string;

    constructor(timezone: string = 'utc') {
        this.setTimezone(timezone);
    }

    public create(data: OpeningHoursCreationDTO, timezone = 'utc') {
        this.setTimezone(timezone);
        this.fill(data);
    }

    public currentOpenRange() {
        const range = this.getCurrentOpenRange();
        return range ? range.toISOTime().replace('/', '-') : false;
    }

    public currentOpenRangeEnd(): DateTime | boolean {
        const range = this.getCurrentOpenRange();
        return range ? range.end : false;
    }

    public currentOpenRangeStart(): DateTime | boolean {
        const range = this.getCurrentOpenRange();
        return range ? range.start : false;
    }

    public diffInClosed(start: Date, end: Date, unit: DurationUnit) {
        const s = DateTime.fromJSDate(start);
        const sPlus1 = s.plus({ days: 1 }).startOf('day');
        const e = DateTime.fromJSDate(end);
        const eMinus1 = e.minus({ days: 1 }).endOf('day');
        const fullDaysCount = Math.round(
            eMinus1.diff(sPlus1, 'days').toObject().days || 0
        );

        const fullWeeksCount = Math.floor(fullDaysCount / 7);
        const additionalDaysCount = fullDaysCount % 7;
        let totalDuration = Duration.fromMillis(0);
        totalDuration = totalDuration.plus(
            s
                .endOf('day')
                .diff(s)
                .minus(this.getRemainingOpenDurationForDate(start))
        );
        totalDuration = totalDuration.plus(
            e
                .diff(e.startOf('day'))
                .minus(this.getPreviousOpenDurationForDate(end))
        );

        for (let i = 0; i < fullWeeksCount; i++) {
            this.makeOpeningHoursStartAt(sPlus1.plus({ days: i * 7 }));
            const durationForWeek = Object.entries(this.#openingHours).reduce(
                (acc, curr) => {
                    acc = acc.plus(
                        curr[1].reduce(
                            (total, interval) =>
                                total.minus(interval.toDuration()),
                            Duration.fromMillis(86400000)
                        )
                    );
                    return acc;
                },
                Duration.fromMillis(0)
            );
            totalDuration = totalDuration.plus(durationForWeek);
        }

        for (let j = additionalDaysCount; j >= 0; j--) {
            const d = eMinus1.startOf('day').minus({ days: j });
            totalDuration = totalDuration.plus(
                Duration.fromMillis(86400000).minus(
                    this.getRemainingOpenDurationForDate(d)
                )
            );
        }
        return unit ? totalDuration.as(unit) : totalDuration;
    }

    public diffInClosedHours(start: Date, end: Date) {
        return this.diffInClosed(start, end, 'hours');
    }

    public diffInClosedMinutes(start: Date, end: Date) {
        return this.diffInClosed(start, end, 'minutes');
    }

    public diffInClosedSeconds(start: Date, end: Date) {
        return this.diffInClosed(start, end, 'seconds');
    }

    public diffInOpen(start: Date, end: Date, unit: DurationUnit) {
        const s = DateTime.fromJSDate(start);
        const sPlus1 = s.plus({ days: 1 }).startOf('day');
        const e = DateTime.fromJSDate(end);
        const eMinus1 = e.minus({ days: 1 }).endOf('day');
        const fullDaysCount = Math.round(
            eMinus1.diff(sPlus1, 'days').toObject().days || 0
        );

        const fullWeeksCount = Math.floor(fullDaysCount / 7);
        const additionalDaysCount = fullDaysCount % 7;
        let totalDuration = Duration.fromMillis(0);
        totalDuration = totalDuration.plus(
            this.getRemainingOpenDurationForDate(start)
        );
        totalDuration = totalDuration.plus(
            this.getPreviousOpenDurationForDate(end)
        );

        for (let i = 0; i < fullWeeksCount; i++) {
            this.makeOpeningHoursStartAt(sPlus1.plus({ days: i * 7 }));
            const durationForWeek = Object.entries(this.#openingHours).reduce(
                (acc, curr) => {
                    acc = acc.plus(
                        curr[1].reduce(
                            (total, interval) =>
                                total.plus(interval.toDuration()),
                            Duration.fromMillis(0)
                        )
                    );
                    return acc;
                },
                Duration.fromMillis(0)
            );
            totalDuration = totalDuration.plus(durationForWeek);
        }

        for (let j = additionalDaysCount; j >= 0; j--) {
            const d = eMinus1.startOf('day').minus({ days: j });
            totalDuration = totalDuration.plus(
                this.getRemainingOpenDurationForDate(d)
            );
        }
        return unit ? totalDuration.as(unit) : totalDuration;
    }

    public diffInOpenHours(start: Date, end: Date) {
        return this.diffInOpen(start, end, 'hours');
    }

    public diffInOpenMinutes(start: Date, end: Date) {
        return this.diffInOpen(start, end, 'minutes');
    }

    public diffInOpenSeconds(start: Date, end: Date) {
        return this.diffInOpen(start, end, 'seconds');
    }

    public forDate(d: Date | DateTime, humanize = true) {
        const date = d instanceof Date ? DateTime.fromJSDate(d) : d;
        const day = date.weekdayLong.toLowerCase() as Day;
        const ranges = this.#openingHours[day];
        if (ranges.length > 0) {
            return humanize
                ? ranges.map((r) => r.toISOTime().replace('/', '-'))
                : ranges;
        } else {
            return false;
        }
    }

    public forDay(day: Day, humanize = true) {
        const ranges = this.#openingHours[day];
        if (ranges.length > 0) {
            return humanize
                ? ranges.map((r) => r.toISOTime().replace('/', '-'))
                : ranges;
        } else {
            return false;
        }
    }

    public isClosed(): Boolean {
        return !this.isOpen();
    }

    public isClosedAt(d: Date): Boolean {
        return !this.isOpenAt(d);
    }

    public isClosedOn(day: Day) {
        return !this.isOpenOn(day);
    }

    public isOpen(): Boolean {
        const now = DateTime.now();
        const weekDay = now.weekdayLong.toLowerCase() as Day;
        const ranges = this.#openingHours[weekDay];
        return ranges.some((el) => el && el.contains(now));
    }

    public isOpenAt(d: Date): Boolean {
        const date = DateTime.fromJSDate(d);
        const weekDay = date.weekdayLong.toLowerCase() as Day;
        const weekYear = date.weekYear;
        const year = date.year;
        const ranges = this.#openingHours[weekDay].map((el) =>
            el?.set({
                start: el?.start.set({ weekYear, year }),
                end: el?.end.set({ weekYear, year }),
            })
        );
        return ranges.some((el) => el && el.contains(date));
    }

    public isOpenOn(day: Day) {
        return this.forDay(day) && this.forDay.length > 0;
    }

    /**
     * Returns the ending date time of the open interval that starts after
     * provided Date
     * @param {Date} d
     * @return {DateTime | null}
     */
    public nextClose(d: Date): DateTime | null {
        return this.getNextRangeLimit(d, 'end');
    }

    /**
     * Returns the beginning date time of the open interval that starts after
     * provided Date
     * @param {Date} d
     * @return {DateTime | null}
     */
    public nextOpen(d: Date): DateTime | null {
        return this.getNextRangeLimit(d, 'start');
    }

    public previousClose(d: Date) {
        return this.getPreviousRangeLimit(d, 'end');
    }

    public previousOpen(d: Date) {
        return this.getPreviousRangeLimit(d, 'start');
    }

    public toStructuredData() {
        const res = {};
        for (const day of Object.keys(this.#openingHours) as Day[]) {
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

    private static merge(initial: Interval, other: Interval) {
        return initial.union(other);
    }

    private static overlaps(initial: Interval, other: Interval) {
        return initial.overlaps(other);
    }

    private fill(data: OpeningHoursCreationDTO) {
        this.parseOpeningHoursAndExceptions(data);
        this.mergeOverlappingRanges();
    }

    private getCurrentOpenRange() {
        const now = DateTime.now();
        const weekDay = now.weekdayLong.toLowerCase() as Day;
        const ranges = this.#openingHours[weekDay];
        const range = ranges.find((el) => el && el.contains(now));
        return range ?? null;
    }

    private getNextRangeLimit(d: Date, type: 'start' | 'end') {
        const date = DateTime.fromJSDate(d);
        const dayIndex = this.makeOpeningHoursStartAt(date);
        const entries = Object.entries(this.#openingHours);
        const sortedEntries = [
            ...entries.slice(dayIndex),
            ...entries.slice(0, dayIndex),
        ];
        let nextLimit = null;
        for (const entry of sortedEntries) {
            const potentialRange = entry[1].find((i) =>
                type === 'end'
                    ? date < i.end && i.isAfter(date)
                    : i?.isAfter(date)
            );
            if (potentialRange) {
                nextLimit = potentialRange[type];
                break;
            }
        }
        return nextLimit;
    }

    private getPreviousRangeLimit(d: Date, type: 'start' | 'end') {
        const date = DateTime.fromJSDate(d);
        const dayIndex = this.makeOpeningHoursEndAt(date);
        const entries = Object.entries(this.#openingHours);
        const sortedEntries = [
            ...entries.slice(dayIndex),
            ...entries.slice(0, dayIndex),
        ].reverse();
        let nextLimit = null;
        for (const entry of sortedEntries) {
            const potentialRange = entry[1].find((i) =>
                type === 'end'
                    ? date > i.end && i.isBefore(date)
                    : i?.isBefore(date)
            );
            if (potentialRange) {
                nextLimit = potentialRange[type];
                break;
            }
        }
        return nextLimit;
    }

    private getPreviousOpenDurationForDate(d: Date | DateTime): Duration {
        const date = d instanceof Date ? DateTime.fromJSDate(d) : d;
        this.makeOpeningHoursEndAt(date);
        let previousOpenDuration = Duration.fromMillis(0);
        const openRangesOnDay = this.forDate(d, false);
        if (openRangesOnDay && openRangesOnDay.length > 0) {
            (openRangesOnDay as Interval[])
                .sort((a: Interval, b: Interval) =>
                    a.isAfter(b.start) ? -1 : 1
                )
                .filter((i) => i.contains(date) || i.isBefore(date))
                .forEach((i) => {
                    if (i) {
                        const toAdd = i.contains(date)
                            ? i.start.diff(date)
                            : i.toDuration();
                        previousOpenDuration = previousOpenDuration.plus(toAdd);
                    }
                });
        }
        return previousOpenDuration;
    }

    private getRemainingOpenDurationForDate(d: Date | DateTime): Duration {
        const date = d instanceof Date ? DateTime.fromJSDate(d) : d;
        this.makeOpeningHoursStartAt(date);
        let remainingOpenDuration = Duration.fromMillis(0);
        const openRangesOnDay = this.forDate(d, false);
        if (openRangesOnDay && openRangesOnDay.length > 0) {
            (openRangesOnDay as Interval[])
                .sort((a: Interval, b: Interval) =>
                    a.isAfter(b.start) ? -1 : 1
                )
                .filter((i) => i.contains(date) || i.isAfter(date))
                .forEach((i) => {
                    if (i) {
                        const toAdd = i.contains(date)
                            ? i.end.diff(date)
                            : i.toDuration();
                        remainingOpenDuration =
                            remainingOpenDuration.plus(toAdd);
                    }
                });
        }
        return remainingOpenDuration;
    }

    private makeOpeningHoursEndAt(date: DateTime): number {
        const dayIndex = daysArray.indexOf(
            date.weekdayLong.toLowerCase() as Day
        );
        const sortedDays = [
            ...daysArray.slice(dayIndex),
            ...daysArray.slice(0, dayIndex),
        ].reverse();

        for (const [i, v] of sortedDays.entries()) {
            this.#openingHours[v] = this.#openingHours[v]
                .map((r) => {
                    return Interval.fromDateTimes(
                        r.start.set({
                            ordinal: date.ordinal - i,
                            year: date.year,
                        }),
                        r.end.set({
                            ordinal: date.ordinal - i,
                            year: date.year,
                        })
                    );
                })
                .sort((a, b) => (a.isAfter(b.start) ? -1 : 1));
        }
        return dayIndex;
    }

    private makeOpeningHoursStartAt(date: DateTime): number {
        const dayIndex = daysArray.indexOf(
            date.weekdayLong.toLowerCase() as Day
        );
        const sortedDays = [
            ...daysArray.slice(dayIndex),
            ...daysArray.slice(0, dayIndex),
        ];
        for (const [i, v] of sortedDays.entries()) {
            this.#openingHours[v] = this.#openingHours[v]
                .map((r) => {
                    return Interval.fromDateTimes(
                        r.start.set({
                            ordinal: date.ordinal + i,
                            year: date.year,
                        }),
                        r.end.set({
                            ordinal: date.ordinal + i,
                            year: date.year,
                        })
                    );
                })
                .sort((a, b) => (a.isBefore(b.start) ? -1 : 1));
        }
        return dayIndex;
    }

    private mergeOverlappingRanges() {
        for (const day of Object.keys(this.#openingHours) as Day[]) {
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
                        if (OpeningHours.overlaps(e, first)) {
                            overlaps = true;
                            return OpeningHours.merge(e, first);
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

    private parseOpeningHoursAndExceptions(data: OpeningHoursCreationDTO) {
        const now = DateTime.now();
        for (const [i, day] of daysArray.entries()) {
            if (!data[day]) {
                continue;
            } else {
                const ranges =
                    data[day]
                        ?.filter((el) => el)
                        .map((str) => {
                            const splitted = str.split('-');
                            const start = DateTime.fromFormat(
                                splitted[0],
                                'HH:mm'
                            ).set({
                                weekday: i + 1,
                            });
                            const end = DateTime.fromFormat(
                                splitted[1],
                                'HH:mm'
                            ).set({
                                weekday: i + 1,
                            });
                            const weekNumber =
                                start
                                    .startOf('day')
                                    .diff(now.startOf('day'))
                                    .valueOf() < 0
                                    ? now.weekNumber + 1
                                    : now.weekNumber;
                            return Interval.fromDateTimes(
                                start.set({ weekNumber }),
                                end.set({
                                    weekNumber,
                                })
                            );
                        }) ?? [];
                this.#openingHours[day] = ranges;
            }
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
