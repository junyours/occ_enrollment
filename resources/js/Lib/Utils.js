import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// turns date format to long date
export const formatDate = (dateString) => {
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleString('en-US', options);
};

// convert 24 hours to am pm
export function convertToAMPM(time) {
    if (!time || typeof time !== 'string' || !time.includes(':')) {
        return ''; // or return a default value like 'N/A'
    }

    const [hour, minute] = time.split(':').map(Number);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const convertedHour = hour % 12 || 12;

    return `${convertedHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

// convert minutes to 24 hours
export function convertMinutesTo24HourTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(remainingMinutes).padStart(2, '0');
    return `${formattedHours}:${formattedMinutes}`;
}

// convert 24 hours to minutes
export function convert24HourTimeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    return totalMinutes;
}

// convert am pm to 24 hours
export function convertAMPMTo24Hour(time) {
    let [timePart, modifier] = time.split(' ');
    let [hours, minutes] = timePart.split(':').map(Number);

    if (modifier === 'PM' && hours !== 12) {
        hours += 12;
    } else if (modifier === 'AM' && hours === 12) {
        hours = 0;
    }

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');

    return `${formattedHours}:${formattedMinutes}`;
}

// collect two schedules with start and end time (formatted in minutes), returns true if has conflict otherwise false
export function hasTimeConflict(start1, end1, start2, end2) {
    return !(end1 <= start2 || end2 <= start1);
}

// collect two schedules with start and end time (24 hours), returns true if has conflict otherwise false
export function hasTimeConflict24Hours(start1, end1, start2, end2) {
    const start1Min = convert24HourTimeToMinutes(start1);
    const end1Min = convert24HourTimeToMinutes(end1);
    const start2Min = convert24HourTimeToMinutes(start2);
    const end2Min = convert24HourTimeToMinutes(end2);

    return !(end1Min <= start2Min || end2Min <= start1Min);
}

// Capitalize the first letter of each word in a string (use for displaying names)
export function capitalizeFirstLetter(str) {
    if (!str) return '';
    return str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// return the first letter (use for middle names)
export function getFirstLetter(word) {
    if (!word) return '';
    return word.charAt(0);
}

// this adds hyphens to phone number if the length is 11 (ex. 0934-567-8901)
export function formatPhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');

    if (cleaned.length !== 11) {
        return removeHyphens(cleaned);
    }

    const formatted = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    return formatted;
}

// this remove the hyphens (use for removing the hyphens of the phone number)
export function removeHyphens(text) {
    return text.replace(/-/g, '');
}

// this return true if the email is valid otherwise false
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Convert "YYYY-MM-DD" to "MMM DD, YYYY" format (e.g., "2024-12-30" to "Dec 30, 2024")
export function formatDateShort(dateString) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleString('en-US', options);
}

// format full name into this format "Lastname, Firstname M."
export function formatFullName(userInfo) {
    const { last_name, first_name, middle_name } = userInfo;
    return `${capitalizeFirstLetter(last_name)}, ${capitalizeFirstLetter(first_name)}${middle_name ? ' ' + getFirstLetter(capitalizeFirstLetter(middle_name)) + '.' : ''}`;
};

// format full name into this format "Lastname, Firstname M."
export function formatFullNameFML(userInfo) {
    const { last_name, first_name, middle_name } = userInfo;
    return `${capitalizeFirstLetter(first_name)} ${middle_name ? ' ' + getFirstLetter(capitalizeFirstLetter(middle_name)) + '.' : ''} ${capitalizeFirstLetter(last_name)}`;
};

// format date into valid yyyy/mm/dd
export function formatBirthday(birthday) {
    if (!birthday) return '';

    let date;

    if (/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
        date = new Date(birthday);
    } else {
        date = new Date(birthday);
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

// check password complexity
export function checkPasswordComplexity(password) {
    const requirements = {
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
    };

    if (password.length >= 8) requirements.length = true; // Minimum length of 8
    if (/[A-Z]/.test(password)) requirements.uppercase = true; // At least one uppercase letter
    if (/[a-z]/.test(password)) requirements.lowercase = true; // At least one lowercase letter
    if (/\d/.test(password)) requirements.number = true; // At least one number
    if (/[^A-Za-z0-9]/.test(password)) requirements.special = true; // At least one special character

    const isValid = Object.values(requirements).every(Boolean); // Check if all requirements are met

    return {
        isValid,
        requirements: {
            length: requirements.length,
            uppercase: requirements.uppercase,
            lowercase: requirements.lowercase,
            number: requirements.number,
            special: requirements.special,
        },
    };
}

export function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text)
            .then(() => true) // Resolved if successful
            .catch((err) => {
                console.error('Clipboard write failed:', err);
                return false;
            });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed'; // Avoid scrolling
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            return Promise.resolve(true); // Resolved if successful
        } catch (err) {
            console.error('Fallback copy failed:', err);
            return Promise.resolve(false);
        } finally {
            document.body.removeChild(textArea);
        }
    }
}

export function detectOwnClassesConflict(classDetails, classes) {
    const conflictExists = classes.find(classSchedule => hasTimeConflict(
        convert24HourTimeToMinutes(classSchedule.year_section_subjects.start_time),
        convert24HourTimeToMinutes(classSchedule.year_section_subjects.end_time),
        convert24HourTimeToMinutes(classDetails.start_time),
        convert24HourTimeToMinutes(classDetails.end_time)
    ) && classSchedule.year_section_subjects.day == classDetails.day && classDetails.id != classSchedule.year_section_subjects.id);
    return !!conflictExists;
}

export function detectConflict(classDetails, classes) {
    const conflictExists = classes.find(classSchedule => hasTimeConflict(
        convert24HourTimeToMinutes(classSchedule.start_time),
        convert24HourTimeToMinutes(classSchedule.end_time),
        convert24HourTimeToMinutes(classDetails.start_time),
        convert24HourTimeToMinutes(classDetails.end_time)
    ) && classSchedule.day == classDetails.day && classDetails.id != classSchedule.id);
    return !!conflictExists;
}

export function convertToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function identifyDayType(dayString) {
    if (dayString.includes("-")) {
        return "Consecutive"
    }
    if (dayString.includes(",")) {
        return "Alternating"
    }
    return "Single"
}

const dayMapping = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function expandConsecutiveDays(input) {
    if (input.includes("-")) {
        // Handle consecutive ranges (e.g., "Mon-Thu")
        const [start, end] = input.split("-");
        const startIndex = dayMapping.findIndex(day => day.startsWith(start));
        const endIndex = dayMapping.findIndex(day => day.startsWith(end));

        if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) return [];
        return dayMapping.slice(startIndex, endIndex + 1);
    } else if (input.includes(",")) {
        // Handle alternating days (e.g., "Mon,Wed,Fri")
        return input.split(",").map(abbr => {
            const fullDay = dayMapping.find(day => day.startsWith(abbr.trim()));
            return fullDay || null;
        }).filter(Boolean); // Remove null values if an invalid day is entered
    } else {
        // Single day case (e.g., "Mon")
        return dayMapping.find(day => day.startsWith(input)) ? [dayMapping.find(day => day.startsWith(input))] : [];
    }
};

export function expandAlternatingDays(input) {
    let result = [];

    input.split(",").forEach(part => {
        part = part.trim();

        if (part.includes("-")) {
            // Handle consecutive range (e.g., "Mon-Thu")
            const [start, end] = part.split("-");
            const startIndex = dayMapping.findIndex(day => day.startsWith(start));
            const endIndex = dayMapping.findIndex(day => day.startsWith(end));

            if (startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex) {
                result.push(...dayMapping.slice(startIndex, endIndex + 1));
            }
        } else {
            // Handle single days (e.g., "Mon", "Wed")
            const fullDay = dayMapping.find(day => day.startsWith(part));
            if (fullDay) result.push(fullDay);
        }
    });

    return [...new Set(result)]; // Remove duplicates and return the final array
};

export function toTwoDecimals(number) {
    return number.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
