<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class EvaluatorCredentialsMail extends Mailable
{
    use Queueable, SerializesModels;

    public $userIdNo;
    public $password;
    public $info;

    public function __construct($userIdNo, $password, $info)
    {
        $this->userIdNo = $userIdNo;
        $this->password = $password;
        $this->info = $info; // This holds first_name, middle_name, and last_name
    }

    public function build()
    {
        return $this->subject('Your NSTP Evaluator Account is Ready')
            ->view('emails.evaluator_credentials');
    }
}