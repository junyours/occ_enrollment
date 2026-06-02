import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head, useForm } from '@inertiajs/react'
import React from 'react';
import { Switch } from '@/Components/ui/switch';
import { Checkbox } from '@/Components/ui/checkbox';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert';
import { Button } from '@/Components/ui/button';
import { Separator } from '@/Components/ui/separator';
import { AlertTriangle, Settings, Users, ShieldCheck, Info } from 'lucide-react';
import { userRoles } from '@/Lib/UsersUtility';
import UserRoleBadge from '@/Components/ui/UserRoleBadge'; // The component we built
import { cn } from '@/Lib/Utils';

export default function Index({ settings, errors }) {
    const { data, setData, processing } = useForm({
        maintenance_mode: !!settings.maintenance_mode,
        blocked_roles: settings.blocked_roles || [],
    })

    const updateMaintenanceMode = async (checked) => {
        setData('maintenance_mode', checked)
        await axios.patch(route('maintenance', { maintenance_mode: checked ? 1 : 0 }))
    }

    const updateBlockedRoles = async (updatedRoles) => {
        await axios.patch(route('maintenance.roles', { blocked_roles: updatedRoles }))
    }

    const handleRoleToggle = (role) => {
        const updated = data.blocked_roles.includes(role)
            ? data.blocked_roles.filter(r => r !== role)
            : [...data.blocked_roles, role]

        setData('blocked_roles', updated)
        updateBlockedRoles(updated)
    }

    const handleSelectAll = () => {
        const allAvailable = userRoles({ exclude: ['super_admin'] }).map(r => r.value)
        const isAllSelected = data.blocked_roles.length === allAvailable.length
        const nextValue = isAllSelected ? [] : allAvailable

        setData('blocked_roles', nextValue)
        updateBlockedRoles(nextValue)
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
            <Head title='Maintenance Settings' />

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <Settings className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">System Controls</h1>
                        <p className="text-muted-foreground text-sm">Manage system availability and access restrictions.</p>
                    </div>
                </div>

                {data.maintenance_mode && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full text-sm font-medium animate-pulse">
                        <AlertTriangle className="h-4 w-4" />
                        System is currently in Maintenance Mode
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Toggles */}
                <div className="space-y-6 md:col-span-1">
                    <Card className={cn("transition-all duration-300", data.maintenance_mode && "border-amber-500 shadow-md shadow-amber-500/10")}>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                Accessibility
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-start justify-between space-x-4">
                                <div className="space-y-1">
                                    <Label htmlFor="maintenance-mode" className="text-base font-semibold">
                                        Maintenance Mode
                                    </Label>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Activate this to prevent non-administrative users from performing critical actions.
                                    </p>
                                </div>
                                <Switch
                                    id="maintenance-mode"
                                    checked={data.maintenance_mode}
                                    onCheckedChange={updateMaintenanceMode}
                                    disabled={processing}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Alert variant="secondary" className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                        <Info className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-xs text-blue-700 dark:text-blue-400">
                            Super Admins are <strong>never</strong> affected by maintenance mode restrictions.
                        </AlertDescription>
                    </Alert>
                </div>

                {/* Right Column: Roles Selection */}
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                Restricted Roles
                            </CardTitle>
                            <CardDescription>
                                Mark the roles to be blocked.
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleSelectAll} className="text-xs">
                            {data.blocked_roles.length > 0 ? 'Deselect All' : 'Select All'}
                        </Button>
                    </CardHeader>
                    <Separator />
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {userRoles({ exclude: ['super_admin'] }).map(({ value, label }) => (
                                /* 1. We use Label as the wrapper so the whole area is "the toggle" */
                                <Label
                                    key={value}
                                    className={cn(
                                        "flex items-center space-x-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-accent font-normal",
                                        data.blocked_roles.includes(value)
                                            ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                                            : "border-transparent bg-muted/30"
                                    )}
                                >
                                    <Checkbox
                                        id={`role-${value}`}
                                        checked={data.blocked_roles.includes(value)}
                                        /* 2. Checkbox handles the logic; Label handles the click area */
                                        onCheckedChange={() => handleRoleToggle(value)}
                                    />
                                    {/* 3. We use a span here because we can't put a Label inside a Label */}
                                    <span className="text-sm font-medium flex-1">
                                        {label}
                                    </span>

                                    {/* 4. Optional: Show a small indicator if selected */}
                                    {data.blocked_roles.includes(value) && (
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-in zoom-in" />
                                    )}
                                </Label>
                            ))}
                        </div>
                        {errors.blocked_roles && (
                            <Alert variant="destructive" className="mt-4">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{errors.blocked_roles}</AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Bottom Summary Bar */}
            {data.maintenance_mode && (
                <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/10">
                    <CardContent className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center px-3 pb-1">
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                            </div>
                            <div className='w-44'>
                                <p className="text-sm font-semibold">Maintenance Mode Active</p>
                                <p className="text-xs text-muted-foreground">The system is restricting access to the following groups:</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {data.blocked_roles.length > 0 ? (
                                data.blocked_roles.map((role) => (
                                    <UserRoleBadge key={role} role={role} />
                                ))
                            ) : (
                                <span className="text-xs italic text-muted-foreground">No roles restricted yet.</span>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>