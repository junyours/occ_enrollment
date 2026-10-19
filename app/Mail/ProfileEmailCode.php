<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class ProfileEmailCode extends Mailable
{
    public function __construct(public string $code, public int $expiresInMinutes = 10) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: config('app.name') . ' — Confirm your new email');
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.profile.email-code');
    }
}
