<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ProfileEmailCode extends Mailable
{
    use Queueable, SerializesModels;

    public $code;
    public $expiresInMinutes;

    public function __construct(string $code, int $expiresInMinutes)
    {
        $this->code = $code;
        $this->expiresInMinutes = $expiresInMinutes;
    }

    public function build()
    {
        return $this->subject('Confirm Your New Email - ' . config('app.name'))
            ->view('emails.email-code')
            ->with([
                'code' => $this->code,
                'expiresInMinutes' => $this->expiresInMinutes,
            ]);
    }
}
