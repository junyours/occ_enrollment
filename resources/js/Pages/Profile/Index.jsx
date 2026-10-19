import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import { KeyRound, Mail, UserCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ProfileInformation from './Partials/ProfileInformation';
import ChangePassword from './Partials/ChangePassword';
import ChangeEmail from './Partials/ChangeEmail';

const tabs = [
    { value: 'profile', label: 'Profile', desktopLabel: 'Profile information', icon: UserCircle },
    { value: 'email', label: 'Email', desktopLabel: 'Email address', icon: Mail },
    { value: 'password', label: 'Password', desktopLabel: 'Password', icon: KeyRound },
];

export default function Index({ user = {} }) {
    const [activeTab, setActiveTab] = useState('profile');
    const [desktop, setDesktop] = useState(false);

    useEffect(() => {
        const media = window.matchMedia('(min-width: 1024px)');
        const update = () => setDesktop(media.matches);
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);

    const userInfo = {
        user_id_no: user.user_id_no ?? '',
        user_id: user.user_id ?? '',
        first_name: user.first_name ?? '',
        last_name: user.last_name ?? '',
        middle_name: user.middle_name ?? '',
        email: user.email ?? '',
        contact_number: user.contact_number ?? '',
        gender: user.gender ?? '',
        birthday: user.birthday ?? '',
        present_address: user.present_address ?? '',
        zip_code: user.zip_code ?? '',
    };

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:py-10">
            <Head title="Profile Settings" />

            <header className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">Profile settings</h1>
                <p className="text-sm text-muted-foreground">Manage your personal information and account security.</p>
            </header>

            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                orientation={desktop ? 'vertical' : 'horizontal'}
                className="flex w-full min-w-0 flex-col gap-6 lg:flex-row lg:gap-8"
            >
                <aside className="shrink-0 lg:w-52">
                    <TabsList aria-label="Profile settings" className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl bg-muted/50 p-1 lg:grid-cols-1 lg:gap-2 lg:bg-transparent lg:p-0">
                        {tabs.map(({ value, label, desktopLabel, icon: Icon }) => (
                            <TabsTrigger
                                key={value}
                                value={value}
                                className="min-h-11 min-w-0 gap-2 whitespace-normal rounded-lg px-2 py-3 text-xs data-[state=active]:bg-background data-[state=active]:text-primary sm:text-sm lg:justify-start lg:px-4 lg:data-[state=active]:bg-primary/10"
                            >
                                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                                <span className="lg:hidden">{label}</span>
                                <span className="hidden lg:inline">{desktopLabel}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </aside>

                <div className="min-w-0 flex-1">
                    <TabsContent value="profile" className="m-0">
                        <ProfileInformation userInfo={userInfo} />
                    </TabsContent>
                    <TabsContent value="email" className="m-0">
                        <ChangeEmail currentEmail={userInfo.email} />
                    </TabsContent>
                    <TabsContent value="password" className="m-0">
                        <ChangePassword />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
