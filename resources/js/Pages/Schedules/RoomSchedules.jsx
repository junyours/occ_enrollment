import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import React from 'react'

export default function RoomSchedules() {
    return (
        <div>RoomSchedules</div>
    )
}

RoomSchedules.layout = page => <AuthenticatedLayout children={page} title={'Room Schedules'} />
