import { DateTime, Settings } from 'luxon';

export class OpeningHours {
    readonly #timezone: string;

    constructor(timezone: string = 'utc') {
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
