import React from 'react'
import { Card, CardContent } from '@/Components/ui/card'
import { usePage } from '@inertiajs/react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { formatName } from '@/Lib/InfoUtils'

export default function NstpGradeSignatories({ faculty }) {

    const {
        data: nstpDirector,
        isLoading,
    } = useQuery({
        queryKey: ['nstp-director-name'],
        queryFn: async () => {
            const res = await axios.post(
                route('nstp-director-name')
            )
            return res.data
        },
        staleTime: 5 * 60 * 1000,
    })

    if (isLoading || !nstpDirector) return null

    return (
        <Card className="hidden print:block">
            <CardContent className="pt-6">
                <div className="flex justify-between">
                    <div className="text-center">
                        <div className="mb-6">Submitted by:</div>
                        <div className="w-52 border-b">
                            <p>
                                {faculty}
                            </p>
                        </div>
                        <div>Instructor</div>
                    </div>

                    <div className="text-center">
                        <div className="mb-6">Checked by:</div>
                        <div className="w-52 border-b h-6">
                            <p>
                                {formatName(nstpDirector, { casing: 'upper' })}
                            </p>
                        </div>
                        <div>Nstp Director</div>
                    </div>

                    <div className="text-center">
                        <div className="mb-6">Acknowledged by:</div>
                        <div className="w-52 border-b h-6">
                            BERNADETH T. NACUA
                        </div>
                        <div>Registrar 1</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
