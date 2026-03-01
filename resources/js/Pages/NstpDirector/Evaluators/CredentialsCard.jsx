import CopyButton from '@/Components/ui/CopyButton';
import { formatName } from '@/Lib/InfoUtils';
import React from 'react';

export default function CredentialsCard({ data, credentials }) {
    const formattedRole = data.user_role
        .replace(/_/g, ' ') // replace all underscores
        .replace(/\b\w/g, char => char.toUpperCase()); // capitalize each word

    return (
        <div className="px-6">
            {/* Header */}
            <div className="text-center mb-4">
                <h3 className="text-xl font-bold">Evaluator Credentials</h3>
                <p className="text-sm text-gray-500">{formatName(data)} • {formattedRole}</p>
            </div>

            {/* Rows */}
            <div className="space-y-4 mb-4">
                <CredentialRow label="User ID" value={credentials.user_id_no} />
                <CredentialRow label="Password" value={credentials.password} />
            </div>
        </div>
    );
}

function CredentialRow({ label, value }) {
    return (
        <div className="flex items-center justify-between p-3 rounded-xl border">
            <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</p>
                <p className="text-sm font-mono font-semibold">{value}</p>
            </div>
            <CopyButton text={value} />
        </div>
    );
}