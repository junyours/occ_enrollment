import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Check, ChevronsUpDown, Calendar, AlertCircle } from 'lucide-react'

import { Button } from '@/Components/ui/button'
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/Components/ui/command'
import { Badge } from '@/Components/ui/badge'
import { Skeleton } from '@/Components/ui/skeleton'
import EnrollmentDashboard from './EnrollmentDashboard'

export default function EnrollmentDashboardSelector({ onSelect }) {
    const [open, setOpen] = useState(false)
    const [selectedId, setSelectedId] = useState(null)

    // Fetch school years
    const { data: schoolYears = [], isLoading, error } = useQuery({
        queryKey: ['schoolYears'],
        queryFn: async () => {
            try {
                const endpoint = typeof route !== 'undefined'
                    ? route('school-years')
                    : '/api/school-years'

                const response = await axios.post(endpoint)
                const data = response.data.data || response.data

                if (!Array.isArray(data)) {
                    throw new Error('Invalid response format')
                }
                return data
            } catch (err) {
                console.error('Failed to fetch school years:', err)
                throw err
            }
        },
        retry: 2,
        staleTime: 5 * 60 * 1000,
    })

    // Find default item
    const defaultItem = useMemo(() => {
        if (!schoolYears.length) return null
        return schoolYears.find((sy) => Number(sy.is_current) === 1) || schoolYears[0]
    }, [schoolYears])

    // Set default selection when data loads
    useEffect(() => {
        if (defaultItem && selectedId === null) {
            const defaultId = String(defaultItem.id)
            setSelectedId(defaultId)

            if (typeof onSelect === 'function') {
                onSelect(defaultItem)
            }
        }
    }, [defaultItem?.id])

    // Handle selection change
    const handleSelect = useCallback((sy) => {
        const id = String(sy.id)
        setSelectedId(id)

        if (typeof onSelect === 'function') {
            onSelect(sy)
        }

        setOpen(false)
    }, [onSelect])

    // Get currently selected item
    const selectedItem = useMemo(() => {
        if (selectedId === null) return null
        return schoolYears.find((sy) => String(sy.id) === selectedId)
    }, [selectedId, schoolYears])

    if (isLoading) return <div className='p-6'><Skeleton className="h-16 w-full rounded-md p-6" /></div>

    if (error) {
        return (
            <Button variant="outline" disabled className="w-[420px] h-16 px-5 shadow-sm text-lg">
                <AlertCircle className="h-6 w-6 text-destructive mr-3" />
                <span className="text-muted-foreground">Error loading years</span>
            </Button>
        )
    }

    if (!schoolYears.length) {
        return (
            <Button variant="outline" disabled className="w-[420px] h-16 px-5 shadow-sm text-lg">
                <span className="text-muted-foreground">No academic years available</span>
            </Button>
        )
    }

    return (
        <div className="space-y-6 p-6">
            <div className="w-full flex items-center justify-center">
                <Button
                    variant="ghost"
                    role="combobox"
                    aria-expanded={open}
                    onClick={() => setOpen(true)}
                    className="w-full justify-center h-auto py-3 px-4 shadow-sm hover:bg-accent border border-border/50"
                >
                    <div className="flex items-center justify-center gap-3.5">
                        {selectedItem ? (
                            <div className="flex flex-col md:flex-row items-baseline justify-center text-center gap-3">
                                <span className="font-extrabold text-3xl tracking-tight whitespace-nowrap text-foreground">
                                    {selectedItem.start_year} &ndash; {selectedItem.end_year}
                                </span>

                                <span className="text-3xl font-medium text-muted-foreground whitespace-nowrap">
                                    {selectedItem.semester_name} Semester
                                </span>
                            </div>
                        ) : (
                            <span className="text-muted-foreground text-xl font-medium">
                                Select Academic Year
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2.5 ml-4 shrink-0">
                        <ChevronsUpDown className="h-6 w-6 shrink-0 opacity-50" />
                    </div>
                </Button>

                <CommandDialog open={open} onOpenChange={setOpen} className='w-96'>
                    <CommandInput placeholder="Search school year..." className="h-12 text-base" />
                    <CommandList>
                        <CommandEmpty className="py-6 text-center text-sm">No school year found.</CommandEmpty>
                        <CommandGroup header="Academic Years">
                            {schoolYears.map((sy) => {
                                const itemId = String(sy.id)
                                const isSelected = selectedId === itemId
                                const isCurrent = Number(sy.is_current) === 1

                                return (
                                    <CommandItem
                                        key={itemId}
                                        value={`${sy.start_year}-${sy.end_year} ${sy.semester_name}`}
                                        onSelect={() => handleSelect(sy)}
                                        className="flex items-center justify-between py-3.5 px-3 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Check
                                                className={`h-5 w-5 text-primary transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'
                                                    }`}
                                            />
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-base leading-none">
                                                    {sy.start_year}–{sy.end_year}
                                                </span>
                                                <span className="text-sm text-muted-foreground mt-1.5">
                                                    {sy.semester_name}
                                                </span>
                                            </div>
                                        </div>

                                        {isCurrent && (
                                            <Badge
                                                variant="outline"
                                                className="border-emerald-500/30 text-emerald-600 bg-emerald-50 text-xs px-2 py-0.5"
                                            >
                                                Current
                                            </Badge>
                                        )}
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                    </CommandList>
                </CommandDialog>
            </div>

            <EnrollmentDashboard schoolYear={selectedItem} />
        </div>
    )
}