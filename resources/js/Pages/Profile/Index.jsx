import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { UserCircle, KeyRound } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

// Partials
import ProfileInformation from './Partials/ProfileInformation';
import ChangePassword from './Partials/ChangePassword';

export default function Index({ user }) {
    const [activeTab, setActiveTab] = useState('profile');

    // Clean userInfo object
    const userInfo = {
        user_id_no: user.user_id_no || '',
        user_id: user.user_id || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        middle_name: user.middle_name || '',
        email: user.email || '',
        contact_number: user.contact_number || '',
        gender: user.gender || '',
        birthday: user.birthday || '',
        present_address: user.present_address || '',
        zip_code: user.zip_code || '',
    };

    return (
        <div className="container mx-auto py-10 max-w-6xl px-4">
            <Head title="Profile Settings" />

            <div className="flex flex-col lg:flex-row gap-8">
                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="flex flex-col lg:flex-row w-full gap-4"
                >
                    {/* Navigation Sidebar */}
                    <aside>
                        <TabsList className="flex lg:flex-col h-auto w-full lg:w-48 justify-between lg:justify-start gap-2 bg-transparent p-0">
                            <TabsTrigger
                                value="profile"
                                className="w-full justify-start gap-2 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 transition-all"
                            >
                                <UserCircle className="w-4 h-4" />
                                <span className="font-medium">Profile Information</span>
                            </TabsTrigger>

                            <TabsTrigger
                                value="password"
                                className="w-full justify-start gap-2 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 transition-all"
                            >
                                <KeyRound className="w-4 h-4" />
                                <span className="font-medium">Password</span>
                            </TabsTrigger>
                        </TabsList>
                    </aside>

                    {/* Content Area */}
                    <div className="flex-1">
                        <TabsContent value="profile" className="m-0 focus-visible:ring-0">
                            <ProfileInformation userInfo={userInfo} />
                        </TabsContent>

                        <TabsContent value="password" className="m-0 focus-visible:ring-0">
                            <div className="">
                                <ChangePassword />
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    );
}

Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;