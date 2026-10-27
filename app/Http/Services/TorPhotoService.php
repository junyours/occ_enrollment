<?php

namespace App\Http\Services;

use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

class TorPhotoService
{
    private const FOLDER = 'TOR Student Photos';
    private const MAX_BYTES = 2 * 1024 * 1024;
    private const MAX_DIMENSION = 480;

    public function __construct(private GoogleDriveService $drive) {}

    public function show(int $studentId): array
    {
        $root = $this->rootId();
        $token = $this->drive->token();
        $folder = $this->drive->findFolder($token, self::FOLDER, $root);
        if ($folder === null) {
            return $this->emptyPhoto();
        }
        $files = $this->drive->findImages($token, $folder, $this->properties($studentId));
        if ($files === []) {
            return $this->emptyPhoto();
        }
        $file = $files[0];
        $bytes = $this->drive->readImage($token, $file['id'], self::MAX_BYTES);
        $mime = $this->imageMime($bytes);
        if ($mime === null || $mime !== $file['mimeType']) {
            throw new GoogleDriveException('The stored photo could not be loaded.');
        }

        return $this->photo($bytes, $mime, $file['id']);
    }

    public function store(int $studentId, UploadedFile $file): array
    {
        $bytes = is_readable($file->getRealPath()) ? file_get_contents($file->getRealPath()) : false;
        $mime = is_string($bytes) ? $this->imageMime($bytes) : null;
        if ($mime === null) {
            throw ValidationException::withMessages(['photo' => 'Choose a JPEG, PNG, or WebP image up to 480 × 480 pixels and 2 MB.']);
        }
        $root = $this->rootId();

        return $this->writeLocked($root, function () use ($studentId, $root, $bytes, $mime) {
            $token = $this->drive->token();
            $folder = $this->drive->getOrCreateFolder($token, self::FOLDER, $root);
            $properties = $this->properties($studentId);
            $files = $this->drive->findImages($token, $folder, $properties);
            $extension = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'][$mime];
            // Replace the same scoped file atomically; do not delete the old photo first.
            $fileId = $this->drive->writeImage($token, $folder, "student-{$studentId}.{$extension}", $mime, $bytes, $properties, $files[0]['id'] ?? null);

            return $this->photo($bytes, $mime, $fileId);
        });
    }

    public function destroy(int $studentId): array
    {
        $root = $this->rootId();

        return $this->writeLocked($root, function () use ($studentId, $root) {
            $token = $this->drive->token();
            $folder = $this->drive->findFolder($token, self::FOLDER, $root);
            if ($folder !== null) {
                // Clear every old duplicate, so a previous picture cannot reappear.
                foreach ($this->drive->findImages($token, $folder, $this->properties($studentId)) as $file) {
                    $this->drive->trashFile($token, $file['id']);
                }
            }

            return $this->emptyPhoto();
        });
    }

    private function properties(int $studentId): array
    {
        return ['occ_purpose' => 'tor_student_photo', 'occ_student_id' => (string) $studentId];
    }

    private function rootId(): string
    {
        $root = trim((string) config('services.google.folder_id'));
        if ($root === '' || ! preg_match('/^[A-Za-z0-9_-]+$/D', $root)) {
            throw new GoogleDriveException('The photo folder is not configured.', 503);
        }

        return $root;
    }

    private function writeLocked(string $root, callable $work): array
    {
        try {
            // The app's shared cache lock serializes folder creation and photo writes.
            return Cache::lock('tor-photo-write:' . sha1($root), 300)->block(5, $work);
        } catch (LockTimeoutException $exception) {
            throw new GoogleDriveException('Another photo update is in progress. Try again.', 503);
        }
    }

    private function imageMime(string $bytes): ?string
    {
        if ($bytes === '' || strlen($bytes) > self::MAX_BYTES) {
            return null;
        }
        $image = @getimagesizefromstring($bytes);
        if (! is_array($image) || $image[0] > self::MAX_DIMENSION || $image[1] > self::MAX_DIMENSION) {
            return null;
        }
        $mime = $image['mime'] ?? '';

        return in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true) ? $mime : null;
    }

    private function photo(string $bytes, string $mime, string $fileId): array
    {
        return ['photoUrl' => 'data:' . $mime . ';base64,' . base64_encode($bytes), 'fileId' => $fileId];
    }

    private function emptyPhoto(): array
    {
        return ['photoUrl' => '', 'fileId' => null];
    }
}
