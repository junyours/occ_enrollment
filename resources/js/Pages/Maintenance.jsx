import React from 'react';
import { Card, CardContent } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Wrench, RefreshCw, LogOut } from 'lucide-react';
import { Head, Link } from '@inertiajs/react';

export default function Maintenance() {
    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <div className="h-svh w-screen flex flex-col items-center justify-center px-5">
            <Head title='Under Maintenance' />
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <Card>
                        <CardContent className="pt-8 pb-8 text-center space-y-6">
                            <div className="flex justify-center">
                                <div className="p-4 rounded-full">
                                    <Wrench className="h-12 w-12 text-orange-600" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold">Under Maintenance</h1>
                                <p>
                                    We're currently performing maintenance to improve your experience.
                                    Please check back shortly.
                                </p>
                            </div>

                            <div className='w-full flex justify-center'>
                                <div className='flex gap-4'>
                                    <Button onClick={handleRefresh} className="flex items-center justify-center gap-2 w-32">
                                        <RefreshCw className="h-4 w-4" />
                                        Try Again
                                    </Button>
                                    <Link
                                        className='w-full cursor-pointer'
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                    >
                                        <Button variant="outline" className="flex items-center justify-center gap-2 w-32">
                                            <LogOut className="h-4 w-4" />
                                            Log out
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
