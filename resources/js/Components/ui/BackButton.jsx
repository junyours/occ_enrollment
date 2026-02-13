import React from 'react'
import { Card, CardContent } from '@/Components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default function BackButton() {
    return (
        <Card
            className='cursor-pointer hover:bg-gray-100'
            onClick={() => window.history.back()}
        >
            <CardContent className='flex items-center gap-2 px-4 py-2'>
                <ArrowLeft className='w-5 h-5' />
                <span>Back</span>
            </CardContent>
        </Card>
    )
}
