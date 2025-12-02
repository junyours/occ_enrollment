import { Card, CardContent } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { AlertCircle, XCircle } from 'lucide-react';
import React from 'react'

export default function Error({ error }) {
    return (
        <>
            <Head title="Grade Edit Request - Error" />
            <div className="py-12">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center text-center space-y-4">
                                {error.type === 'not_found' ? (
                                    <div className="rounded-full bg-muted p-3">
                                        <AlertCircle className="h-10 w-10 text-muted-foreground" />
                                    </div>
                                ) : (
                                    <div className="rounded-full bg-destructive/10 p-3">
                                        <XCircle className="h-10 w-10 text-destructive" />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <h3 className="text-xl font-semibold">
                                        {error.type === 'not_found' ? 'Request Not Found' : 'Access Denied'}
                                    </h3>
                                    <p className="text-muted-foreground max-w-sm">
                                        {error.message}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

Error.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
