import { Card, CardContent } from '@/Components/ui/card'
import { formatName } from '@/Lib/InfoUtils'
import { usePage } from '@inertiajs/react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import React from 'react'

const SignatoryBlock = ({ actionLabel, name, title }) => (
    <div className="text-center w-full flex flex-col justify-center">
        <div className="mb-6">{actionLabel}</div>
        <div className="w-full h-6 flex justify-center">
            <div className='border-b w-max px-4'>
                <p>{name}</p>
            </div>
        </div>
        <div>{title}</div>
    </div>
)

function GradeSignatories({ yearSectionSubjectsId }) {
    const { user } = usePage().props.auth

    const {
        data: programHead,
        isLoading,
    } = useQuery({
        queryKey: ['program-head-name', yearSectionSubjectsId],
        queryFn: async () => {
            const res = await axios.post(
                route('program-head-name', yearSectionSubjectsId)
            )
            return res.data
        },
        enabled: !!yearSectionSubjectsId,
    })

    if (isLoading || !programHead) return null

    const signatories = [
        {
            id: 'instructor',
            actionLabel: 'Submitted by:',
            name: formatName(user, { casing: 'upper' }),
            title: 'Instructor',
        },
        {
            id: 'program-head',
            actionLabel: 'Checked by:',
            name: formatName(programHead, { casing: 'upper' }),
            title: 'Dean',
        },
        {
            id: 'registrar',
            actionLabel: 'Acknowledged by:',
            name: 'BERNADETH T. NACUA',
            title: 'Registrar 1',
        },
    ]

    return (
        <Card className="hidden print:block">
            <CardContent className="pt-6">
                <div className="flex justify-between gap-4">
                    {signatories.map((signatory) => (
                        <SignatoryBlock
                            key={signatory.id}
                            actionLabel={signatory.actionLabel}
                            name={signatory.name}
                            title={signatory.title}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

export default GradeSignatories