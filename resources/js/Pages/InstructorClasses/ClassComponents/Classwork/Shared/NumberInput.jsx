import React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { Input } from '@/Components/ui/input'
import { Button } from '@/Components/ui/button'

export default function NumberInput({
    value,
    onValueChange,
    min = 0,
    max,
    disabled,
    ...props
}) {
    function change(amount) {
        const next = Number(value || 0) + amount

        onValueChange(
            Math.min(
                max ?? Infinity,
                Math.max(min, next)
            )
        )
    }

    return (
        <div className="flex w-40 items-center gap-1">
            <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Decrease score"
                disabled={disabled || Number(value) <= min}
                onClick={() => change(-1)}
            >
                <ChevronDown size={14} />
            </Button>

            <Input
                {...props}
                type="number"
                step={1}
                min={min}
                max={max}
                disabled={disabled}
                value={value ?? ''}
                onChange={(event) =>
                    onValueChange(
                        event.target.value === ''
                            ? ''
                            : Number(event.target.value)
                    )
                }
                className="min-w-0 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />

            <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Increase score"
                disabled={
                    disabled ||
                    (max !== undefined && Number(value) >= max)
                }
                onClick={() => change(1)}
            >
                <ChevronUp size={14} />
            </Button>
        </div>
    )
}