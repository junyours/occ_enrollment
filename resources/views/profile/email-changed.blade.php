<x-mail::message>
    # Your account email was changed

    The email address for your {{ config('app.name') }} account has been changed to **{{ $newEmail }}** after verification.

    If you did not make this change, contact your administrator immediately and change your password.

    Thanks,<br>
    {{ config('app.name') }}
</x-mail::message>