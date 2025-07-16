import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import { User, Mail } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';

// Import the separated Components
import ProfileInformation from './Partials/ProfileInformation';
import ChangePassword from './Partials/ChangePassword';
import AccountSettings from './Partials/AccountSettings';

export default function Index({ user }) {
    const [activeTab, setActiveTab] = useState('profile');

    const userRole = user.user_role;

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

    const getInitials = () => {
        return `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`.toUpperCase();
    };

    return (
        <div className="container mx-auto max-w-6xl">
            <Head title="Profile" />
            <div className="space-y-6">
                {/* Profile Header */}
                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex items-center space-x-4">
                            <Avatar className="w-20 h-20">
                                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                                    {(user.user_role != 'mis' && user.user_role != 'super_admin' && user.user_role != 'president') ? getInitials() : user.user_role.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <CardTitle className="text-2xl">
                                    {(user.user_role != 'mis' && user.user_role != 'super_admin' && user.user_role != 'president') ? `${userInfo.first_name} ${userInfo.middle_name} ${userInfo.last_name}` : user.user_role.replace(/_/g, ' ').toUpperCase()}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    {userInfo.email}
                                </CardDescription>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <User className="w-4 h-4" />
                                    ID: {userInfo.user_id_no}
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Main Content */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="profile">Profile Information</TabsTrigger>
                        <TabsTrigger value="password">Change Password</TabsTrigger>
                        {/* <TabsTrigger value="settings">Account Settings</TabsTrigger> */}
                    </TabsList>

                    {/* Profile Information Tab */}
                    <TabsContent value="profile" className="space-y-6">
                        <ProfileInformation userInfo={userInfo} />
                    </TabsContent>

                    {/* Change Password Tab */}
                    <TabsContent value="password" className="space-y-6">
                        <ChangePassword />
                    </TabsContent>

                    {/* Account Settings Tab */}
                    {/* <TabsContent value="settings" className="space-y-6">
                        <AccountSettings
                            userInfo={userInfo}
                        />
                    </TabsContent> */}
                </Tabs>
            </div>
        </div>
    );
}

Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
