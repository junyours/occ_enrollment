import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import React from 'react'

function PromotionalReport() {
  return (
    <div>Developing</div>
  )
}

export default PromotionalReport
PromotionalReport.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
