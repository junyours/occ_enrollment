import { Head } from '@inertiajs/react'
import { PageTitle } from '@/Components/ui/PageTitle'
import { Tabs, TabsContent, TabsList, TabsTrigger, } from "@/Components/ui/tabs"
import React from 'react'
import GradesIndex from './NstpTabs/Grades/Index'
import Students from './NstpTabs/Students'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Card, CardContent } from '@/Components/ui/card'

export default function OpenNstpClass({ id, componentName, sectionName, gradeSubmissionStatus, studentsList, schoolYear }) {
    const section = `${componentName.toUpperCase()}-${sectionName}`

    return (
        <div className="space-y-4">
            <Head title={section} />
            <PageTitle align='center'>{section}</PageTitle>
            <Tabs defaultValue="students" className="w-full space-y-4">
                <div className="w-full flex justify-start">
                    <TabsList className="w-96">
                        <TabsTrigger value="students" className='w-full'>Students</TabsTrigger>
                        <TabsTrigger value="grades" className='w-full'>Grades</TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="students">
                    <Card>
                        <CardContent className="pt-6">
                            <Students id={id} nameClass={section} students={studentsList} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="grades">
                    <GradesIndex id={id} allowMidtermUpload={schoolYear.allow_upload_midterm} allowFinalUpload={schoolYear.allow_upload_final} />
                </TabsContent>
            </Tabs>
        </div>
    )
}

OpenNstpClass.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>