<?php

namespace App\Http\Controllers\Profile;

use App\Http\Controllers\Controller;
use App\Mail\ProfileEmailChanged;
use App\Mail\ProfileEmailCode;
use App\Services\ProfileEmailChange;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Throwable;

class EmailChangeController extends Controller
{
    public function __construct(private ProfileEmailChange $changes) {}

    public function show(Request $request): JsonResponse
    {
        return $this->respond($request);
    }

    public function store(Request $request): JsonResponse
    {
        if (is_string($request->input('new_email'))) {
            $request->merge(['new_email' => strtolower(trim($request->input('new_email')))]);
        }

        $validated = $request->validate([
            'new_email' => ['bail', 'required', 'string', 'max:254', 'email:rfc'],
            'current_password' => ['required', 'string', 'max:4096'],
        ]);

        try {
            $delivery = $this->changes->start($request->user(), $validated['new_email'], $validated['current_password']);
        } catch (ValidationException $exception) {
            return $this->respond($request, ['errors' => $exception->errors()], 422);
        }

        return $this->deliver($request, $delivery);
    }

    public function resend(Request $request): JsonResponse
    {
        $validated = $request->validate(['request_id' => ['required', 'uuid']]);

        try {
            $delivery = $this->changes->resend($request->user(), $validated['request_id']);
        } catch (ValidationException $exception) {
            return $this->respond($request, ['errors' => $exception->errors()], 422);
        }

        return $this->deliver($request, $delivery);
    }

    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'request_id' => ['required', 'uuid'],
            'code' => ['required', 'string', 'regex:/\A[0-9]{6}\z/'],
        ], ['code.regex' => 'Enter the six-digit code from your email.']);

        try {
            $result = $this->changes->verify($request->user(), $validated['request_id'], $validated['code']);
        } catch (ValidationException $exception) {
            return $this->respond($request, ['errors' => $exception->errors()], 422);
        } catch (UniqueConstraintViolationException $exception) {
            return $this->respond($request, ['errors' => ['general' => ['This email address is unavailable. Choose another address.']]], 422);
        }

        if (isset($result['error'])) {
            return $this->respond($request, ['errors' => ['code' => [$result['error']]]], 422);
        }

        // The email update has committed. A notification failure must not undo it.
        if (filter_var($result['old_email'], FILTER_VALIDATE_EMAIL)) {
            try {
                Mail::to($result['old_email'])->send(new ProfileEmailChanged($result['new_email']));
            } catch (Throwable $exception) {
                Log::warning('Profile email change notification could not be sent.', [
                    'exception_type' => $exception::class,
                    'message' => $exception->getMessage(),
                ]);
            }
        }

        return $this->respond($request, ['message' => 'Your email address has been updated and verified.']);
    }

    public function destroy(Request $request): JsonResponse
    {
        $validated = $request->validate(['request_id' => ['required', 'uuid']]);
        $cancelled = $this->changes->cancel($request->user(), $validated['request_id']);
        if (! $cancelled) {
            return $this->respond($request, [
                'errors' => ['general' => ['This request has changed. Email settings have been refreshed.']],
            ], 409);
        }

        return $this->respond($request, ['message' => 'Email change cancelled. Your current email is unchanged.']);
    }

    private function deliver(Request $request, array $delivery): JsonResponse
    {
        try {
            // Synchronous delivery uses your configured SMTP mailer; no queue worker needed.
            // It happens outside the database transaction so SMTP does not hold row locks.
            Mail::to($delivery['email'])->send(new ProfileEmailCode($delivery['code'], $delivery['expires_in_minutes']));
        } catch (Throwable $exception) {
            $this->changes->invalidateDelivery($request->user(), $delivery['request_id']);
            Log::warning('Profile email verification message could not be sent.', [
                'exception_type' => $exception::class,
                'exception_message' => config('app.debug') ? $exception->getMessage() : null,
            ]);

            return $this->respond($request, [
                'errors' => ['general' => ['We could not send the email. Please try again after the cooldown.']],
            ], 503);
        }

        return $this->respond($request, ['message' => 'A verification code was sent. Check your inbox and spam folder.']);
    }

    private function respond(Request $request, array $extra = [], int $status = 200): JsonResponse
    {
        return response()->json(array_merge($this->changes->state($request->user()), $extra), $status)
            ->header('Cache-Control', 'no-store, private');
    }
}
