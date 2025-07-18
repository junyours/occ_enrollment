import GuestLayout from '@/Layouts/GuestLayout';
import React from 'react'

function Announcement() {
    return (
        <div>Developing</div>
    )
}

export default Announcement
Announcement.layout = (page) => <GuestLayout>{page}</GuestLayout>;
