import { Input } from '@/Components/ui/input'
import { cn } from '@/lib/utils'
import React, { useRef, useEffect } from 'react'

export default function GradeInput({
    onValueChange,
    index,
    className,
    ...rest
}) {
    const timeoutRef = useRef(null)

    useEffect(() => {
        return () => clearTimeout(timeoutRef.current)
    }, [])

    const handleGradeChange = (e) => {
        // 1. Grab the raw string
        let value = e.target.value

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
        }, 1400)
    }

    function hasExactlyTwoDecimals(value) {
        return /^\d+\.\d{2}$/.test(value);
    }

    return (
        <Input
            {...rest}
            min={0}
            max={5}
            onChange={handleGradeChange}
            type="number"
            className={cn(
                '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                className,
            )}
        />
    )
}