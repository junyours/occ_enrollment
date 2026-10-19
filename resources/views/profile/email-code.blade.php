<x-mail::message>
    # Confirm your new email

    You requested to use this email address for your {{ config('app.name') }} account.

    Enter this six-digit code on the Email settings page:

    <x-mail::panel>
        <div style="font-family: Menlo, Consolas, 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; padding-left: 8px; text-align: center;">{{ $code }}</div>
    </x-mail::panel>

    This code expires in **{{ $expiresInMinutes }} minutes**. If you request another code, use the newest one.

    Your account email will change only after you confirm the code. Do not share it with anyone.

    If you did not request this, you can ignore this message. No change has been made.

    Thanks,<br>
    {{ config('app.name') }}
</x-mail::message>