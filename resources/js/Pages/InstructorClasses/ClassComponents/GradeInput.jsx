import { Input } from '@/Components/ui/input'
import { cn } from '@/Lib/Utils'
import React, { useRef, useEffect } from 'react'

// A grade box: 0.0 for dropped, or 1.0–5.0 with one decimal. It's a text box
// with a number keypad rather than type="number", which changes its value
// on a mouse-wheel turn or an arrow key: scrolling the page past a box you
// had clicked into would quietly change (and save) a grade.
export default function GradeInput({
    onValueChange,
    index,
    className,
    // Range is enforced below; a text box ignores these.
    min,
    max,
    ...rest
}) {
    const timeoutRef = useRef(null)

    useEffect(() => {
        return () => clearTimeout(timeoutRef.current)
    }, [])

    const handleGradeChange = (e) => {
        // 1. Digits and one decimal point only.
        let value = e.target.value.replace(/[^\d.]/g, '')
        const dot = value.indexOf('.')
        if (dot !== -1) {
            value = value.slice(0, dot + 1) + value.slice(dot + 1).replace(/\./g, '')
        }

        // 2. INSTANT BOUNDARY CHECK: Prevent < 0 and > 5 instantly
        if (value !== '' && !isNaN(value)) {
            const numericValue = parseFloat(value)
            if (numericValue > 5.0) value = '5.0'
            if (numericValue < 0) value = '0'
            if (numericValue > 0.0 && numericValue < 1) value = '0.0'
            if (hasExactlyTwoDecimals(numericValue)) return;

        }

        // 3. Immediately update state with raw typing (allows empty strings & decimals)
        onValueChange(value)

        clearTimeout(timeoutRef.current)

        timeoutRef.current = setTimeout(() => {
            // value is now guaranteed to be between 0 and 5 (or empty string)
            const trimmedValue = String(value).trim()

            if (trimmedValue !== '' && !isNaN(trimmedValue)) {
                const raw = parseFloat(trimmedValue)

                // 4. All we need to do now is round it to 1 decimal place!
                const rounded = Math.round(raw * 10) / 10

                // Send the perfectly formatted number back to the parent
                onValueChange(rounded.toFixed(1))
            }
        }, 1500)
    }

    function hasExactlyTwoDecimals(value) {
        return /^\d+\.\d{2}$/.test(value);
    }

    return (
        <Input
            {...rest}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            onChange={handleGradeChange}
            className={cn(className)}
        />
    )
}
