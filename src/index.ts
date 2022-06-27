import { OpeningHours } from './opening-hours.class';

const test = new OpeningHours();

test.create({
    monday: ['09:00-17:00', '08:00-12:00'],
    tuesday: ['06:00-11:00'],
});
const structured = test.toStructuredData();
console.log(structured);

export { OpeningHours };
