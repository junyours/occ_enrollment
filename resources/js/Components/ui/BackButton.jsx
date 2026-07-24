import React from 'react'
import { Card, CardContent } from '@/Components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/Lib/Utils'

export default function BackButton({ className }) {
    return (
        <Card
            className='cursor-pointer'
            onClick={() => window.history.back()}
        >
            <CardContent className={cn('h-full flex items-center gap-2 px-4 py-2 text-center justify-center w-36', className)}>
                <ArrowLeft className='w-5 h-5' />
                <span>Back</span>
            </CardContent>
        </Card>
    )
}
