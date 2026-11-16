<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class ClassworkDrive
{
    private const API = 'https://www.googleapis.com/drive/v3/files';

    private function client()
    {
        $key = 'classwork.google.token.' . hash(
            'sha256',
            (string) config('services.google.refresh_token')
        );

        $token = Cache::get($key);

        if (! $token) {
            $response = Http::asForm()
                ->timeout(20)
                ->post('https://oauth2.googleapis.com/token', [
                    'client_id' => config('services.google.client_id'),
                    'client_secret' => config('services.google.client_secret'),
                    'refresh_token' => config('services.google.refresh_token'),
                    'grant_type' => 'refresh_token',
                ])
                ->throw()
                ->json();

            $token = $response['access_token'];

            Cache::put(
                $key,
                $token,
                max(1, (int) $response['expires_in'] - 60)
            );
        }

        return Http::withToken($token)
            ->connectTimeout(15)
            ->timeout(120);
    }

    private function folder(string $parent, string $name): string
    {
        $escape = fn($value) => str_replace(
            ["\\", "'"],
            ["\\\\", "\\'"],
            $value
        );

        $parentLiteral = $escape($parent);
        $nameLiteral = $escape($name);

        $query = "'{$parentLiteral}' in parents "
            . "and name='{$nameLiteral}' "
            . "and mimeType='application/vnd.google-apps.folder' "
            . "and trashed=false";

        $files = $this->client()
            ->timeout(20)
            ->get(self::API, [
                'q' => $query,
                'fields' => 'files(id)',
                'pageSize' => 1,
                'supportsAllDrives' => 'true',
                'includeItemsFromAllDrives' => 'true',
            ])
            ->throw()
            ->json('files');

        if ($files) {
            return $files[0]['id'];
        }

        return $this->client()
            ->timeout(20)
            ->post(self::API . '?supportsAllDrives=true', [
                'name' => $name,
                'mimeType' => 'application/vnd.google-apps.folder',
                'parents' => [$parent],
            ])
            ->throw()
            ->json('id');
    }

    public function upload(
        int $classId,
        string $kind,
        int $ownerId,
        UploadedFile $file
    ): array {
        $root = config('services.google.folder_id');

        if (! $root) {
            throw new RuntimeException(
                'Google Drive folder is not configured.'
            );
        }

        $folder = Cache::lock(
            'classwork.folders.' . $classId,
            300
        )->block(10, function () use (
            $root,
            $classId,
            $kind,
            $ownerId
        ) {
            $classFolder = $this->folder(
                $root,
                'Class-' . $classId
            );

            $bucket = $this->folder(
                $classFolder,
                ucfirst($kind)
            );

            return $this->folder(
                $bucket,
                (string) $ownerId
            );
        });

        $mime = $file->getMimeType()
            ?: 'application/octet-stream';

        $start = $this->client()
            ->withHeaders([
                'X-Upload-Content-Type' => $mime,
                'X-Upload-Content-Length' => (string) $file->getSize(),
            ])
            ->post(
                'https://www.googleapis.com/upload/drive/v3/files'
                    . '?uploadType=resumable&supportsAllDrives=true&fields=id',
                [
                    'name' => $file->getClientOriginalName(),
                    'parents' => [$folder],
                ]
            )
            ->throw();

        $location = $start->header('Location');

        if (
            ! $location ||
            parse_url($location, PHP_URL_SCHEME) !== 'https' ||
            parse_url($location, PHP_URL_HOST) !== 'www.googleapis.com'
        ) {
            throw new RuntimeException(
                'Invalid Google upload session.'
            );
        }

        $stream = fopen($file->getRealPath(), 'rb');

        try {
            $result = $this->client()
                ->withBody($stream, $mime)
                ->withHeaders([
                    'Content-Length' => (string) $file->getSize(),
                ])
                ->put($location)
                ->throw()
                ->json();
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }

        if (empty($result['id'])) {
            throw new RuntimeException(
                'Google did not finish the upload.'
            );
        }

        return [
            'drive_file_id' => $result['id'],
            'mime_type' => $mime,
        ];
    }

    public function stream(string $fileId)
    {
        return $this->client()
            ->withOptions(['stream' => true])
            ->get(self::API . '/' . rawurlencode($fileId), [
                'alt' => 'media',
                'supportsAllDrives' => 'true',
            ])
            ->throw()
            ->toPsrResponse()
            ->getBody();
    }

    public function trash(string $fileId): void
    {
        $response = $this->client()->patch(
            self::API . '/' . rawurlencode($fileId)
                . '?supportsAllDrives=true',
            ['trashed' => true]
        );

        if ($response->status() !== 404) {
            $response->throw();
        }
    }
}
