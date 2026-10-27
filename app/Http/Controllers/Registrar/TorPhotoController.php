<?php

namespace App\Http\Controllers\Registrar;

use App\Http\Controllers\Controller;
use App\Http\Services\GoogleDriveException;
use App\Http\Services\TorPhotoService;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TorPhotoController extends Controller
{
    public function __construct(private TorPhotoService $photos) {}

    public function show(string $id): JsonResponse
    {
        $studentId = $this->studentId($id);

        return $this->respond(fn () => $this->photos->show($studentId));
    }

    public function store(Request $request, string $id): JsonResponse
    {
        $studentId = $this->studentId($id);
        $request->validate([
            'photo' => ['required', 'file', 'image', 'mimetypes:image/jpeg,image/png,image/webp', 'max:2048', 'dimensions:max_width=480,max_height=480'],
        ]);

        return $this->respond(fn () => $this->photos->store($studentId, $request->file('photo')));
    }

    public function destroy(string $id): JsonResponse
    {
        $studentId = $this->studentId($id);

        return $this->respond(fn () => $this->photos->destroy($studentId));
    }

    private function studentId(string $id): int
    {
        // Match permanent-record selection, including archived/inactive student users.
        return (int) User::query()->findOrFail($id)->getKey();
    }

    private function respond(callable $work): JsonResponse
    {
        try {
            return new JsonResponse($work(), 200, ['Cache-Control' => 'private, no-store']);
        } catch (GoogleDriveException $exception) {
            return new JsonResponse([
                'message' => 'The student photo could not be loaded or saved to Google Drive. Please try again.',
            ], $exception->status, ['Cache-Control' => 'private, no-store']);
        }
    }
}
