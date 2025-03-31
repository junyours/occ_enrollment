import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import React from 'react'

const Classroom = () => {
  return (
    <div>Classroom</div>
  )
}

export default Classroom
ViewClasses.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
