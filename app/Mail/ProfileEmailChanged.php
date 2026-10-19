<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class ProfileEmailChanged extends Mailable
{
    public function __construct(public string $newEmail) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: config('app.name').' — Your email was changed');
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.profile.email-changed');
    }
}
