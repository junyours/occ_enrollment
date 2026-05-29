import { expandAlternatingDays, expandConsecutiveDays, hasTimeConflict24Hours, identifyDayType } from "@/lib/utils"


export function singleAndSingle(firstSchedule, secondSchedule) {
    if (secondSchedule.day == 'TBA' || secondSchedule.start_time == 'TBA') return

    if (firstSchedule.day == secondSchedule.day) {
        return hasTimeConflict24Hours(firstSchedule.start_time, firstSchedule.end_time, secondSchedule.start_time, secondSchedule.end_time)
    } else {
        return false
    }
}

export function singleAndConsecutive(firstSchedule, secondSchedule) {
    const secondSchedDays = expandConsecutiveDays(secondSchedule.day)

    let conflict = false

    secondSchedDays.map(day => {
        const secondSchedData = { day: day, start_time: secondSchedule.start_time, end_time: secondSchedule.end_time }
        if (singleAndSingle(firstSchedule, secondSchedData)) {
            conflict = true
            return
        }
    })

    return conflict
}

export function singleAndAlternating(firstSchedule, secondSchedule) {
    const secondSchedDays = expandAlternatingDays(secondSchedule.day)

    let conflict = false

    secondSchedDays.map(day => {
        const secondSchedData = { day: day, start_time: secondSchedule.start_time, end_time: secondSchedule.end_time }
        if (singleAndSingle(firstSchedule, secondSchedData)) {
            conflict = true
            return
        }
    })

    return conflict
}

export function consecutiveAndSingle(firstSchedule, secondSchedule) {
    const secondSchedDays = expandConsecutiveDays(firstSchedule.day)

    let conflict = false

    secondSchedDays.map(day => {
        const firstSchedData = { day: day, start_time: firstSchedule.start_time, end_time: firstSchedule.end_time }
        if (singleAndSingle(firstSchedData, secondSchedule)) {
            conflict = true
            return
        }
    })

    return conflict
}


export function consecutiveAndConsecutive(firstSchedule, secondSchedule) {
    const secondSchedDays = expandConsecutiveDays(firstSchedule.day)

    let conflict = false

    secondSchedDays.map(day => {
        const firstSchedData = { day: day, start_time: firstSchedule.start_time, end_time: firstSchedule.end_time }
        if (singleAndConsecutive(firstSchedData, secondSchedule)) {
            conflict = true
            return
        }
    })

    return conflict
}


export function consecutiveAndAlternating(firstSchedule, secondSchedule) {
    const secondSchedDays = expandConsecutiveDays(firstSchedule.day)

    let conflict = false

    secondSchedDays.map(day => {
        const firstSchedData = { day: day, start_time: firstSchedule.start_time, end_time: firstSchedule.end_time }
        if (singleAndAlternating(firstSchedData, secondSchedule)) {
            conflict = true
            return
        }
    })

    return conflict
}


export function alternatingAndSingle(firstSchedule, secondSchedule) {
    const secondSchedDays = expandAlternatingDays(firstSchedule.day)

    let conflict = false

    secondSchedDays.map(day => {
        const firstSchedData = { day: day, start_time: firstSchedule.start_time, end_time: firstSchedule.end_time }
        if (singleAndSingle(firstSchedData, secondSchedule)) {
            conflict = true
            return
        }
    })

    return conflict
}


export function alternatingAndConsecutive(firstSchedule, secondSchedule) {
    const secondSchedDays = expandAlternatingDays(firstSchedule.day)

    let conflict = false

    secondSchedDays.map(day => {
        const firstSchedData = { day: day, start_time: firstSchedule.start_time, end_time: firstSchedule.end_time }
        if (singleAndConsecutive(firstSchedData, secondSchedule)) {
            conflict = true
            return
        }
    })

    return conflict
}


export function alternatingAndAlternating(firstSchedule, secondSchedule) {
    const secondSchedDays = expandAlternatingDays(firstSchedule.day)

    let conflict = false

    secondSchedDays.map(day => {
        const firstSchedData = { day: day, start_time: firstSchedule.start_time, end_time: firstSchedule.end_time }
        if (singleAndAlternating(firstSchedData, secondSchedule)) {
            conflict = true
            return
        }
    })

    return conflict
}

export const detectTwoScheduleConflict = (firstSchedule, secondSchedule) => {
    if ((firstSchedule.day == 'TBA' || firstSchedule.start_time == 'TBA') && (secondSchedule.day == 'TBA' || secondSchedule.start_time == 'TBA')) return

    const firstType = identifyDayType(firstSchedule.day);
    const secondType = identifyDayType(secondSchedule.day);
    const scheduleKey = `${firstType}-${secondType}`;

    switch (scheduleKey) {
        case 'Single-Single':
            return singleAndSingle(firstSchedule, secondSchedule);
        case 'Single-Consecutive':
            return singleAndConsecutive(firstSchedule, secondSchedule);
        case 'Single-Alternating':
            return singleAndAlternating(firstSchedule, secondSchedule);
        case 'Consecutive-Single':
            return consecutiveAndSingle(firstSchedule, secondSchedule);
        case 'Consecutive-Consecutive':
            return consecutiveAndConsecutive(firstSchedule, secondSchedule);
        case 'Consecutive-Alternating':
            return consecutiveAndAlternating(firstSchedule, secondSchedule);
        case 'Alternating-Single':
            return alternatingAndSingle(firstSchedule, secondSchedule);
        case 'Alternating-Consecutive':
            return alternatingAndConsecutive(firstSchedule, secondSchedule);
        case 'Alternating-Alternating':
            return alternatingAndAlternating(firstSchedule, secondSchedule);
        default:
            throw new Error(`Unhandled schedule type: ${scheduleKey}`);
    }
}
