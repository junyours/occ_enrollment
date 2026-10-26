<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $code, public int $expiresInMinutes = 10) {}

    public function build(): static
    {
        return $this->subject('Your password reset code - '.config('app.name'))
            ->view('emails.password-reset');
    }
}
