<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use App\Models\User;

class PasswordResetMail extends Mailable
{
    use Queueable, SerializesModels;

    public $user;
    public $resetUrl;
    public $token;

    public function __construct(User $user, string $resetUrl, string $token)
    {
        $this->user = $user;
        $this->resetUrl = $resetUrl;
        $this->token = $token;
    }

    public function build()
    {
        return $this->subject('Reset Your Password - ' . config('app.name'))
            ->view('emails.password-reset')
            ->with([
                'user' => $this->user,
                'resetUrl' => $this->resetUrl,
                'token' => $this->token,
            ]);
    }
}
