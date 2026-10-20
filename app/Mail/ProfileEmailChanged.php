<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ProfileEmailChanged extends Mailable
{
    use Queueable, SerializesModels;

    public $newEmail;

    public function __construct(string $newEmail)
    {
        $this->newEmail = $newEmail;
    }

    public function build()
    {
        return $this->subject('Your Account Email Was Changed - ' . config('app.name'))
            ->view('emails.email-changed')
            ->with([
                'newEmail' => $this->newEmail,
            ]);
    }
}
