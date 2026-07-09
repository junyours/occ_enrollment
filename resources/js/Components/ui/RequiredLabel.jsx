import React from 'react'
import { Label } from './label'

export default function RequiredLabel({ label, htmlFor, children, ...props }) {
    return (
        <Label htmlFor={htmlFor} {...props}>
            {label || children}

            <span className="text-red-500 ml-1">*</span>
        </Label>
    )
}