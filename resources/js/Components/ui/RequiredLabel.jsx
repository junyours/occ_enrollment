import React from 'react'
import { Label } from './label'

export default function RequiredLabel({ label, htmlFor, ...props }) {
    return (
        <Label htmlFor={htmlFor} {...props}>
            {label}
            <span className="text-red-500 ml-1">*</span>
        </Label>
    )
}