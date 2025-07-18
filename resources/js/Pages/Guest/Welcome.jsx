import GuestLayout from '@/Layouts/GuestLayout';
import React from 'react'

function Welcome() {
    return (
        <div>Welcome</div>
    )
}

export default Welcome

Welcome.layout = (page) => <GuestLayout>{page}</GuestLayout>;
