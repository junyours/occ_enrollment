import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import React from 'react'

export default function StudentList() {
  return (
    <div>StudentList</div>
  )
}

StudentList.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
