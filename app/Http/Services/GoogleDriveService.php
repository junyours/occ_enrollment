<?php

namespace App\Http\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class GoogleDriveService
{
    private const API = 'https://www.googleapis.com/drive/v3/files';
    private const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
    private const FOLDER = 'application/vnd.google-apps.folder';

    public function token(): string
    {
        $credentials = [
            'client_id' => config('services.google.client_id'),
            'client_secret' => config('services.google.client_secret'),
            'refresh_token' => config('services.google.refresh_token'),
        ];
        foreach ($credentials as $value) {
            if (! is_string($value) || trim($value) === '') {
                throw new GoogleDriveException('Google Drive is not configured.', 503);
            }
        }
        $response = $this->checked(fn () => Http::asForm()->connectTimeout(5)->timeout(20)
            ->post('https://oauth2.googleapis.com/token', $credentials + ['grant_type' => 'refresh_token']));
        $token = $response->json('access_token');
        if (! is_string($token) || trim($token) === '') {
            throw new GoogleDriveException;
        }

        return $token;
    }

    /** Read-only lookup: a failed lookup never creates a replacement folder. */
    public function findFolder(string $accessToken, string $folderName, string $parentId): ?string
    {
        $this->requireId($parentId);
        $response = $this->checked(fn () => $this->http($accessToken)->get(self::API, [
            'q' => "name='" . $this->escape($folderName) . "' and '{$parentId}' in parents and mimeType='" . self::FOLDER . "' and trashed=false",
            'fields' => 'files(id)', 'pageSize' => 1, 'orderBy' => 'createdTime',
            'supportsAllDrives' => 'true', 'includeItemsFromAllDrives' => 'true',
        ]));
        $files = $response->json('files');
        if (! is_array($files)) {
            throw new GoogleDriveException;
        }

        return $files === [] ? null : $this->requireId($files[0]['id'] ?? null);
    }

    public function getOrCreateFolder(string $accessToken, string $folderName, string $parentId): string
    {
        $existing = $this->findFolder($accessToken, $folderName, $parentId);
        if ($existing !== null) {
            return $existing;
        }
        $response = $this->checked(fn () => $this->http($accessToken)->post(self::API . '?supportsAllDrives=true&fields=id', [
            'name' => $folderName, 'mimeType' => self::FOLDER, 'parents' => [$parentId],
        ]));

        return $this->requireId($response->json('id'));
    }

    /** List only private image records with the requested properties in this folder. */
    public function findImages(string $accessToken, string $parentId, array $properties): array
    {
        $this->requireId($parentId);
        $query = "'{$parentId}' in parents and trashed=false and (mimeType='image/jpeg' or mimeType='image/png' or mimeType='image/webp')";
        foreach ($properties as $key => $value) {
            $query .= " and appProperties has { key='" . $this->escape((string) $key) . "' and value='" . $this->escape((string) $value) . "' }";
        }
        $files = [];
        $pageToken = null;
        $seenTokens = [];
        do {
            $response = $this->checked(fn () => $this->http($accessToken)->get(self::API, array_filter([
                'q' => $query, 'fields' => 'nextPageToken,files(id,mimeType,size,appProperties,modifiedTime)',
                'orderBy' => 'modifiedTime desc,createdTime desc', 'pageSize' => 100,
                'pageToken' => $pageToken, 'supportsAllDrives' => 'true', 'includeItemsFromAllDrives' => 'true',
            ], fn ($value) => $value !== null)));
            $page = $response->json('files');
            if (! is_array($page)) {
                throw new GoogleDriveException;
            }
            foreach ($page as $file) {
                $this->requireId($file['id'] ?? null);
                if (! in_array($file['mimeType'] ?? '', ['image/jpeg', 'image/png', 'image/webp'], true)) {
                    throw new GoogleDriveException;
                }
                foreach ($properties as $key => $value) {
                    if (($file['appProperties'][$key] ?? null) !== (string) $value) {
                        throw new GoogleDriveException;
                    }
                }
                $files[] = $file;
            }
            $pageToken = $response->json('nextPageToken');
            if ($pageToken !== null && (! is_string($pageToken) || $pageToken === '' || isset($seenTokens[$pageToken]))) {
                throw new GoogleDriveException;
            }
            if ($pageToken !== null) {
                $seenTokens[$pageToken] = true;
            }
        } while ($pageToken !== null);

        return $files;
    }

    public function readImage(string $accessToken, string $fileId, int $maxBytes): string
    {
        $this->requireId($fileId);
        $response = $this->checked(fn () => $this->http($accessToken)->withOptions(['stream' => true])
            ->get(self::API . '/' . $fileId, ['alt' => 'media', 'supportsAllDrives' => 'true']));
        $stream = $response->toPsrResponse()->getBody();
        $bytes = '';
        try {
            while (! $stream->eof() && strlen($bytes) <= $maxBytes) {
                $chunk = $stream->read(min(8192, $maxBytes + 1 - strlen($bytes)));
                if ($chunk === '' && ! $stream->eof()) {
                    throw new GoogleDriveException;
                }
                $bytes .= $chunk;
            }
        } catch (\RuntimeException $exception) {
            throw new GoogleDriveException('The stored photo could not be loaded.');
        } finally {
            $stream->close();
        }
        if ($bytes === '' || strlen($bytes) > $maxBytes) {
            throw new GoogleDriveException('The stored photo could not be loaded.');
        }

        return $bytes;
    }

    /** Google multipart uploads require multipart/related, not multipart/form-data. */
    public function writeImage(string $accessToken, string $parentId, string $name, string $mime, string $bytes, array $properties, ?string $fileId = null): string
    {
        $this->requireId($parentId);
        if ($fileId !== null) {
            $this->requireId($fileId);
        }
        $metadata = ['name' => $name, 'mimeType' => $mime, 'appProperties' => $properties];
        if ($fileId === null) {
            $metadata['parents'] = [$parentId];
        }
        $boundary = 'tor_' . bin2hex(random_bytes(16));
        $body = "--{$boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"
            . json_encode($metadata, JSON_THROW_ON_ERROR)
            . "\r\n--{$boundary}\r\nContent-Type: {$mime}\r\n\r\n{$bytes}\r\n--{$boundary}--\r\n";
        $url = self::UPLOAD . ($fileId === null ? '' : '/' . $fileId);
        $response = $this->checked(fn () => $this->http($accessToken)->withBody($body, "multipart/related; boundary={$boundary}")
            ->send($fileId === null ? 'POST' : 'PATCH', $url, [
                'query' => ['uploadType' => 'multipart', 'supportsAllDrives' => 'true', 'fields' => 'id'],
            ]));
        $savedId = $this->requireId($response->json('id'));
        if ($fileId !== null && $savedId !== $fileId) {
            throw new GoogleDriveException;
        }

        return $savedId;
    }

    public function trashFile(string $accessToken, string $fileId): void
    {
        $this->requireId($fileId);
        $this->checked(fn () => $this->http($accessToken)->patch(self::API . '/' . $fileId . '?supportsAllDrives=true', ['trashed' => true]));
    }

    private function http(string $accessToken): PendingRequest
    {
        return Http::withToken($accessToken)->connectTimeout(5)->timeout(20);
    }

    private function checked(callable $request): Response
    {
        try {
            $response = $request();
        } catch (ConnectionException $exception) {
            throw new GoogleDriveException;
        }
        if (! $response->successful()) {
            throw new GoogleDriveException;
        }

        return $response;
    }

    private function requireId(mixed $id): string
    {
        if (! is_string($id) || ! preg_match('/^[A-Za-z0-9_-]+$/D', $id)) {
            throw new GoogleDriveException;
        }

        return $id;
    }

    private function escape(string $value): string
    {
        return str_replace(['\\', "'"], ['\\\\', "\\'"], $value);
    }
}

