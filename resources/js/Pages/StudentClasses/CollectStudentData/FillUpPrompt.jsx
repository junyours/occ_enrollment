import { Button } from '@/Components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { PageTitle } from '@/Components/ui/PageTitle'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import { Head } from '@inertiajs/react'
import React, { useState } from 'react'
import FillUpForm from './FillUpForm'

function FillUpPrompt() {
    const [open, setOpen] = useState(false)

    const toggleModal = () => setOpen(!open)

    // dummy blurred subjects
    const dummySubjects = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        instructor: '••••••••••',
        subject_code: '••••••',
        descriptive_title: '••••••••••••••••••••',
    }))

    return (
        <div className='space-y-4 flex items-center flex-col justify-center py-10'>
            <Head title="Enrollment Record" />
            <PageTitle align='center' className='w-full'>ENROLLMENT RECORD</PageTitle>

            <p className='text-gray-500 text-sm mb-4'>
                Complete the required information to unlock and view your official enrollment records.
            </p>
            <Button onClick={toggleModal} className="px-6">
                Complete Enrollment Details
            </Button>
            <div className='max-w-[calc(100vw-2rem)] min-w-[calc(100vw-2rem)]
                                    sm:w-auto sm:min-w-0 sm:max-w-none
                                    overflow-x-auto sm:p-0 h-min sm:h-auto'
            >
                <div
                    className='relative opacity-50 blur-sm pointer-events-none select-none'
                >
                    <Card className="md:mx-0 w-[1150px]">
                        <CardHeader>
                            <CardTitle className="text-2xl">
                                <div className='w-full flex justify-between gap-2'>
                                    <div className='flex gap-1'>
                                        <div>Year Level |</div>
                                        <div>202X-202X First Semester</div>
                                    </div>
                                    <p className='underline'>•••••••• ••••••</p>
                                </div>
                            </CardTitle>
                        </CardHeader>

                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className='w-48'>Instructor</TableHead>
                                        <TableHead className='w-32'>Subject Code</TableHead>
                                        <TableHead>Descriptive Title</TableHead>
                                        <TableHead className='w-24'>Midterm</TableHead>
                                        <TableHead className='w-24'>Final</TableHead>
                                        <TableHead className='w-24'>Final Grade</TableHead>
                                        <TableHead className='w-24'>Remarks</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {dummySubjects.map(sub => (
                                        <TableRow key={sub.id}>
                                            <TableCell>{sub.instructor}</TableCell>
                                            <TableCell>{sub.subject_code}</TableCell>
                                            <TableCell>{sub.descriptive_title}</TableCell>
                                            <TableCell>-</TableCell>
                                            <TableCell>-</TableCell>
                                            <TableCell>-</TableCell>
                                            <TableCell>-</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <FillUpForm open={open} setOpen={setOpen} />
        </div>
    )
}

export default FillUpPrompt
