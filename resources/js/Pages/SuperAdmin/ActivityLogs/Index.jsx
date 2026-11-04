import UseQueryTable from '@/Components/UseQueryTable/Index';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { FileClock, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

const RECENT_QUERY = 'super-admin-recent-activity';
const USERS_QUERY = 'super-admin-activity-users';
const USER_LOGS_QUERY = 'super-admin-user-activity';

function userName(user) {
    const givenNames = [user.first_name, user.middle_name].filter(Boolean).join(' ');
    return user.name
        || [user.last_name, givenNames].filter(Boolean).join(', ')
        || user.user_id_no
        || `User #${user.user_id ?? user.id}`;
}

function roleName(role) {
    if (!role) return '';
    if (role === 'vpaa' || role === 'mis') return role.toUpperCase();
    return role.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()).replace('Nstp', 'NSTP');
}

function timestamp(value) {
    if (!value) return 'No activity yet';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function Actor({ user, activity = false }) {
    if (activity && user.user_id == null) {
        return <span className="text-muted-foreground">System / deleted user</span>;
    }

    return (
        <div className="space-y-1">
            <p className="font-medium">{userName(user)}</p>
            <p className="text-xs text-muted-foreground">
                {[user.user_id_no, roleName(user.user_role)].filter(Boolean).join(' · ')}
            </p>
        </div>
    );
}

function entityReference(type, id) {
    return [type, id != null ? `#${id}` : null].filter(Boolean).join(' ') || '—';
}

function PropertyValues({ value }) {
    if (value == null) return <p className="text-sm text-muted-foreground">No additional properties.</p>;

    return (
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-4 text-xs leading-relaxed">
            {JSON.stringify(value, null, 2)}
        </pre>
    );
}

function ActivityDetails({ logId, onClose }) {
    const { data: log, isPending, isError, isFetching, refetch } = useQuery({
        queryKey: ['super-admin-activity-detail', logId],
        queryFn: async ({ signal }) => {
            const response = await axios.get(route('super-admin.activity-logs.show', { activityLog: logId }), { signal });
            return response.data;
        },
        enabled: logId != null,
        staleTime: 30_000,
    });

    return (
        <Dialog open={logId != null} onOpenChange={(open) => { if (!open) onClose(); }}>
            {logId != null && (
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Activity Details</DialogTitle>
                        <DialogDescription>Inspect the action and recorded changes for activity #{logId}.</DialogDescription>
                    </DialogHeader>
                    {isPending ? (
                        <p className="py-8 text-center text-sm text-muted-foreground" role="status">Loading activity details...</p>
                    ) : isError ? (
                        <div className="space-y-3 py-4" role="alert">
                            <p className="text-sm text-destructive">Unable to load this activity.</p>
                            <Button type="button" variant="outline" disabled={isFetching} onClick={() => refetch()}>
                                {isFetching ? 'Retrying...' : 'Retry'}
                            </Button>
                        </div>
                    ) : log ? (
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Badge variant="outline" className="break-all">{log.action}</Badge>
                                <p className="whitespace-pre-wrap break-words text-sm">{log.description || 'No description recorded.'}</p>
                            </div>
                            <dl className="grid gap-4 text-sm sm:grid-cols-2">
                                <div className="space-y-1">
                                    <dt className="text-muted-foreground">Performed by</dt>
                                    <dd><Actor user={log} activity /></dd>
                                </div>
                                <div className="space-y-1">
                                    <dt className="text-muted-foreground">Date and time</dt>
                                    <dd>{timestamp(log.created_at)}</dd>
                                </div>
                                <div className="space-y-1">
                                    <dt className="text-muted-foreground">IP address</dt>
                                    <dd className="break-all">{log.ip_address || '—'}</dd>
                                </div>
                                <div className="space-y-1">
                                    <dt className="text-muted-foreground">
                                        {log.action === 'grade_submissions.subjects_inspected' ? 'Faculty inspected' : 'Subject'}
                                    </dt>
                                    <dd>
                                        {log.subject_user ? (
                                            <Actor user={log.subject_user} />
                                        ) : (
                                            <span className="break-all font-mono text-xs">{entityReference(log.subject_type, log.subject_id)}</span>
                                        )}
                                    </dd>
                                </div>
                                {log.properties?.school_year?.label && (
                                    <div className="space-y-1 sm:col-span-2">
                                        <dt className="text-muted-foreground">School year and semester</dt>
                                        <dd>{log.properties.school_year.label}</dd>
                                    </div>
                                )}
                                <div className="space-y-1 sm:col-span-2">
                                    <dt className="text-muted-foreground">Target</dt>
                                    <dd className="break-all font-mono text-xs">{entityReference(log.target_type, log.target_id)}</dd>
                                </div>
                                <div className="space-y-1 sm:col-span-2">
                                    <dt className="text-muted-foreground">Browser / user agent</dt>
                                    <dd className="break-all">{log.user_agent || '—'}</dd>
                                </div>
                            </dl>
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold">Properties and recorded changes</h3>
                                <PropertyValues value={log.properties} />
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            )}
        </Dialog>
    );
}

export default function Index() {
    const [activeTab, setActiveTab] = useState('recent');
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedLogId, setSelectedLogId] = useState(null);
    const queryClient = useQueryClient();
    const activeQuery = activeTab === 'recent' ? RECENT_QUERY : USERS_QUERY;
    const isRefreshing = useIsFetching({ queryKey: [activeQuery] }) > 0;
    const isRefreshingUser = useIsFetching({ queryKey: [USER_LOGS_QUERY] }) > 0;

    const logColumns = useMemo(() => [
        { header: 'Date and Time', render: (row) => timestamp(row.created_at), className: 'min-w-40 whitespace-nowrap text-xs' },
        { header: 'User', render: (row) => <Actor user={row} activity />, className: 'min-w-48' },
        { header: 'Action', render: (row) => <Badge variant="outline" className="break-all">{row.action}</Badge>, className: 'min-w-36' },
        { header: 'Description', render: (row) => row.description || '—', className: 'min-w-60 max-w-md break-words' },
        {
            header: 'Details',
            render: (row) => (
                <Button type="button" size="sm" variant="outline" aria-label={`Inspect activity ${row.id}`} onClick={() => setSelectedLogId(row.id)}>
                    Inspect details
                </Button>
            ),
            className: 'whitespace-nowrap',
        },
    ], []);

    const userColumns = useMemo(() => [
        { header: 'ID Number', accessor: 'user_id_no', className: 'whitespace-nowrap' },
        { header: 'Name', render: (row) => <span className="font-medium">{userName(row)}</span>, className: 'min-w-48' },
        { header: 'Role', render: (row) => roleName(row.user_role), className: 'whitespace-nowrap' },
        { header: 'Activities', render: (row) => Number(row.activity_count ?? 0).toLocaleString(), className: 'text-center tabular-nums' },
        { header: 'Last Activity', render: (row) => timestamp(row.last_activity_at), className: 'min-w-40 whitespace-nowrap text-xs' },
        {
            header: 'Activity Logs',
            render: (row) => (
                <Button type="button" variant="outline" size="sm" aria-label={`Inspect logs for ${userName(row)}`} onClick={() => setSelectedUser(row)}>
                    Inspect logs
                </Button>
            ),
            className: 'whitespace-nowrap',
        },
    ], []);

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <FileClock className="size-5 text-primary" aria-hidden="true" />
                        <CardTitle>Activity Logs</CardTitle>
                    </div>
                    <CardDescription>Inspect recent user activity and recorded changes across the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <TabsList aria-label="Activity inspection views">
                                <TabsTrigger value="recent">Recent Activity</TabsTrigger>
                                <TabsTrigger value="users">Users</TabsTrigger>
                            </TabsList>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isRefreshing}
                                onClick={() => queryClient.invalidateQueries({ queryKey: [activeQuery] })}
                            >
                                <RefreshCw className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true" />
                                {isRefreshing ? 'Refreshing...' : 'Refresh'}
                            </Button>
                        </div>
                        <TabsContent value="recent">
                            {activeTab === 'recent' && (
                                <UseQueryTable
                                    key="recent-activity"
                                    queryKeyPrefix={RECENT_QUERY}
                                    routeName="super-admin.activity-logs.recent"
                                    columns={logColumns}
                                    tableName="Recent Activity"
                                    searchPlaceholder="Search users, actions, or descriptions..."
                                />
                            )}
                        </TabsContent>
                        <TabsContent value="users" className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Users appear by role priority, starting with system and academic leaders, and alphabetically within each role.
                                Accounts with no recorded activity are included.
                            </p>
                            {activeTab === 'users' && (
                                <UseQueryTable
                                    key="activity-users"
                                    queryKeyPrefix={USERS_QUERY}
                                    routeName="super-admin.activity-logs.users"
                                    columns={userColumns}
                                    tableName="Users"
                                    searchPlaceholder="Search by name, ID number, or role..."
                                />
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Dialog open={Boolean(selectedUser)} onOpenChange={(open) => { if (!open) setSelectedUser(null); }}>
                {selectedUser && (
                    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-6xl">
                        <DialogHeader>
                            <DialogTitle>Activity Logs · {userName(selectedUser)}</DialogTitle>
                            <DialogDescription>
                                {[selectedUser.user_id_no, roleName(selectedUser.user_role)].filter(Boolean).join(' · ')}
                            </DialogDescription>
                        </DialogHeader>
                        <div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isRefreshingUser}
                                onClick={() => queryClient.invalidateQueries({ queryKey: [USER_LOGS_QUERY] })}
                            >
                                <RefreshCw className={isRefreshingUser ? 'animate-spin' : ''} aria-hidden="true" />
                                {isRefreshingUser ? 'Refreshing...' : 'Refresh logs'}
                            </Button>
                        </div>
                        <UseQueryTable
                            key={selectedUser.id}
                            queryKeyPrefix={USER_LOGS_QUERY}
                            routeName="super-admin.activity-logs.user-logs"
                            routeParams={{ user: selectedUser.id }}
                            columns={logColumns}
                            tableName="User Activity"
                            searchPlaceholder="Search actions or descriptions..."
                        />
                    </DialogContent>
                )}
            </Dialog>

            <ActivityDetails logId={selectedLogId} onClose={() => setSelectedLogId(null)} />
        </div>
    );
}

Index.layout = (page) => <AuthenticatedLayout title="Activity Logs">{page}</AuthenticatedLayout>;
