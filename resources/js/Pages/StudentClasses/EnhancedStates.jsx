import { Card, CardContent } from '@/Components/ui/card';

const ErrorState = ({ error }) => (
    <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="flex items-start gap-4 pt-6">
            <div className="flex-shrink-0">
                <i className="ti ti-alert-circle text-destructive text-2xl" aria-hidden="true"></i>
            </div>
            <div className="flex-1">
                <h3 className="font-medium text-destructive mb-1">Unable to load classes</h3>
                <p className="text-sm text-muted">
                    {error?.response?.data?.error || 'An error occurred while fetching your classes. Please try again.'}
                </p>
            </div>
        </CardContent>
    </Card>
);

const EmptyState = () => (
    <Card className="border-border/50 bg-surface-1">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <div>
                <i className="ti ti-inbox text-text-muted text-5xl" aria-hidden="true"></i>
            </div>
            <div className="text-center">
                <h3 className="font-medium text-text-primary mb-1">No classes found</h3>
                <p className="text-sm text-text-secondary">
                    You don't have any classes enrolled for the selected school year yet.
                </p>
            </div>
        </CardContent>
    </Card>
);

export { ErrorState, EmptyState };