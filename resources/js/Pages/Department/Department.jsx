import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import React from 'react'

export default function Department() {
  return (
    <div>Department</div>
  )
}


Department.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
