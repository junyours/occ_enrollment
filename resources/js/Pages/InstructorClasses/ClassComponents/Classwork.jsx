import React, { useState } from 'react'
import { usePage } from '@inertiajs/react'
import { ClipboardList, FolderOpen } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs'

import Materials from './Classwork/Materials/Materials'
import Assignments from './Classwork/Assignments/Assignments'
import { ClassworkProvider } from './Classwork/Shared/api'

const TRIGGER = 'h-8 flex-1 gap-2 px-4 sm:flex-none'

// `assignmentHref` (id => URL) makes student assignments open as pages.
export default function Classwork({ classId, assignmentHref }) {
    const { auth } = usePage().props
    const [tab, setTab] = useState('assignments')

    return (
        <ClassworkProvider
            key={`${auth.user.id}:${classId}`}
            userId={auth.user.id}
            classId={classId}
            assignmentHref={assignmentHref}
        >
            <Tabs value={tab} onValueChange={setTab} className="min-w-0 space-y-4">
                <TabsList className="h-10 w-full sm:w-auto" aria-label="Classwork sections" data-tour="classwork-tabs">
                    <TabsTrigger value="assignments" className={TRIGGER}>
                        <ClipboardList className="size-4" aria-hidden="true" />
                        Assignments
                    </TabsTrigger>

                    <TabsTrigger value="materials" className={TRIGGER}>
                        <FolderOpen className="size-4" aria-hidden="true" />
                        Materials
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="assignments" className="mt-0">
                    <Assignments />
                </TabsContent>

                <TabsContent value="materials" className="mt-0">
                    <Materials />
                </TabsContent>
            </Tabs>
        </ClassworkProvider>
    )
}
