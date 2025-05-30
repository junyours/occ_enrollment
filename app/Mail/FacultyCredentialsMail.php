<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class FacultyCredentialsMail extends Mailable
{
    use Queueable, SerializesModels;

    use Queueable, SerializesModels;

    public $faculty;
    public $password;

    public function __construct($faculty, $password)
    {
        $this->faculty = $faculty;
        $this->password = $password;
    }

    public function build()
    {
        return $this->subject('Your Faculty Account Credentials')
            ->view('emails.faculty_credentials');
    }
}
