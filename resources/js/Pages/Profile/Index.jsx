import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import { ChevronRight, KeyRound, Mail, UserCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ProfileInformation from './Partials/ProfileInformation';
import ChangePassword from './Partials/ChangePassword';
import ChangeEmail from './Partials/ChangeEmail';

const tabs = [
    {
        value: 'profile',
        label: 'Profile',
        title: 'Profile information',
        description: 'Name, contact & address',
        icon: UserCircle,
    },
    {
        value: 'email',
        label: 'Email',
        title: 'Email address',
        description: 'Change your sign-in email',
        icon: Mail,
    },
    {
        value: 'password',
        label: 'Password',
        title: 'Password',
        description: 'Keep your account secure',
        icon: KeyRound,
    },
];

const DESKTOP_QUERY = '(min-width: 1024px)';

export default function Index({ user = {} }) {
    const [activeTab, setActiveTab] = useState('profile');
    const [desktop, setDesktop] = useState(
        () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches
    );

    useEffect(() => {
        const media = window.matchMedia(DESKTOP_QUERY);
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
        <div className="mx-auto w-full max-w-6xl space-y-6 py-6 sm:py-10">
            <Head title="Profile Settings" />

            <header className="space-y-1 border-b pb-6">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Profile settings</h1>
                <p className="text-sm text-muted-foreground">
                    Manage your personal information and account security.
                </p>
            </header>

            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                orientation={desktop ? 'vertical' : 'horizontal'}
                className="flex w-full min-w-0 flex-col gap-6 lg:flex-row lg:items-start lg:gap-8"
            >
                {/* Nav: segmented control on mobile, sticky card on desktop */}
                <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:w-72">
                    <TabsList
                        aria-label="Profile settings"
                        className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl bg-muted/50 p-1 lg:grid-cols-1 lg:gap-1.5 lg:rounded-2xl lg:border lg:bg-card lg:p-2"
                    >
                        {tabs.map(({ value, label, title, description, icon: Icon }) => (
                            <TabsTrigger
                                key={value}
                                value={value}
                                className="group relative min-h-14 min-w-0 flex-col gap-1 whitespace-normal rounded-lg px-2 py-2.5 text-xs text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm lg:min-h-0 lg:flex-row lg:justify-start lg:gap-3 lg:px-3 lg:py-3 lg:text-left lg:hover:bg-muted/60 lg:data-[state=active]:bg-primary/10 lg:data-[state=active]:shadow-none"
                            >
                                {/* Active indicator (desktop) */}
                                <span
                                    aria-hidden="true"
                                    className="absolute inset-y-2.5 left-0 hidden w-1 rounded-full bg-primary opacity-0 transition-opacity group-data-[state=active]:opacity-100 lg:block"
                                />

                                <span className="flex shrink-0 items-center justify-center transition-colors lg:h-9 lg:w-9 lg:rounded-lg lg:bg-muted lg:group-data-[state=active]:bg-primary/15">
                                    <Icon aria-hidden="true" className="h-4 w-4" />
                                </span>

                                <span className="min-w-0 lg:flex-1">
                                    <span className="block font-medium lg:hidden">{label}</span>
                                    <span className="hidden text-sm font-medium lg:block">{title}</span>
                                    <span className="hidden truncate text-xs font-normal text-muted-foreground lg:block">
                                        {description}
                                    </span>
                                </span>

                                <ChevronRight
                                    aria-hidden="true"
                                    className="hidden h-4 w-4 shrink-0 opacity-0 transition-opacity group-data-[state=active]:opacity-100 lg:block"
                                />
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </aside>

                <div className="min-w-0 flex-1">
                    <TabsContent value="profile" className="m-0 animate-in fade-in-0 duration-200">
                        <ProfileInformation userInfo={userInfo} />
                    </TabsContent>
                    <TabsContent value="email" className="m-0 animate-in fade-in-0 duration-200">
                        <ChangeEmail currentEmail={userInfo.email} />
                    </TabsContent>
                    <TabsContent value="password" className="m-0 animate-in fade-in-0 duration-200">
                        <ChangePassword />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}

Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;