# Introduction

This package is meant to be a tool to manage the opening hours of a business or any other place. It is heavyly inspired by the [Spatie\OpeningHours](https://github.com/spatie/opening-hours) package in the Laravel/PHP world. Most methods are implemented using the same name.

This package relies on the [Luxon](https://moment.github.io/luxon/#/) library. Some methods return Luxon DateTime/duration objects if specified.

`node-opening-hours` is written in Typescript and exports its own types for code easy code completion if your IDE supports it.

# Usage

## Installation

`npm i node-opening-hours`

## Basic usage

```js
import { OpeningHours } from 'node-opening-hours';

const myHours = new OpeningHours();

// Call then the 'create' method providing an object with days of week as keys and array of 'HH:mm-HH:mm' strings to indicate open ranges. Overlapping ranges are automatically merged (i.e ['08:00-16:00', '09:00-17:00'] becomes ['08:00-17:00']
myHours.create({
    monday: ['09:00-17:00'],
    tuesday: ['09:00-17:00'],
    wednesday: ['09:00-12:00', '14:00-18:00'],
    thursday: [],
    friday: ['09:00-12:00', '14:00-18:00'],
    saturday: ['09:00-:12:00'],
    sunday: [],
});

// You have then access to various methods on the 'myHours' instance

myHours.isOpen() // returns boolean indication whether business is currently open
myHours.isClosedAt(new Date(2022, 11, 1, 15, 0)); // returns boolean indicating whether business is closed on 01/12/2022 15:00.
    
...

```

## Full docs

Full docs to come.

### Spatie/OpeningHours methods comparison

| Spatie/OpeningHours    | node-opening-hours    | Implemented | Note |
|:-----------------------|:----------------------|------------:|------|
| create                 | create                |           ✅ |      |
| fill                   | fill                  |           ✅ |      |
| forDay                 | forDay                |           ✅ |      |
| isOpen                 | isOpen                |           ✅ |      |
| isOpenAt               | isOpenAt              |           ✅ |      |
| isOpenOn               | isOpenOn              |           ✅ |      |
| isClosed               | isClosed              |           ✅ |      |
| isClosedAt             | isClosedAt            |           ✅ |      |
| isClosedOn             | isClosedOn            |           ✅ |      |
| nextOpen               | nextOpen              |           ✅ |      |
| nextClose              | nextClose             |           ✅ |      |
| previousOpen           | previousOpen          |           ✅ |      |
| previousClose          | previousClose         |           ✅ |      |
| diffInOpenHours        | diffInOpenHours       |           ✅ |      |
| diffInOpenMinutes      | diffInOpenMinutes     |           ✅ |      |
| diffInOpenSeconds      | diffInOpenSeconds     |           ✅ |      |
| diffInClosedHours      | diffInClosedHours     |           ✅ |      |
| diffInClosedMinutes    | diffInClosedMinutes   |           ✅ |      |
| diffInClosedSeconds    | diffInClosedSeconds   |           ✅ |      |
| currentOpenRange       | currentOpenRange      |           ✅ |      |
| currentOpenRangeStart  | currentOpenRangeStart |           ✅ |      |
| currentOpenRangeEnd    | currentOpenRangeEnd   |           ✅ |      |
| forWeek                |                       |             |      |
| forWeekCombined        |                       |             |      |
| forWeekConsecutiveDays |                       |             |      |
| forDay                 | forDay                |           ✅ |      |
| forDate                | forDate               |           ✅ |      |


#To do

* Implement exceptions
* Handle schedules overflowing on the next day
* Better documentation
