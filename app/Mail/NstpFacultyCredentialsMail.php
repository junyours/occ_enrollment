<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NstpFacultyCredentialsMail extends Mailable
{
    use Queueable, SerializesModels;

    protected $faculty;
    protected $password;

    public function __construct(array $faculty, string $password)
    {
        $this->faculty = $faculty;
        $this->password = $password;
    }

    public function build()
    {
        return $this->subject('Your NSTP Faculty Account Credentials')
            ->view('emails.nstp_faculty_credentials')
            ->with([
                'faculty' => $this->faculty,
                'password' => $this->password,
            ]);
    }
}
