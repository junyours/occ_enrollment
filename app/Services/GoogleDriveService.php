<?php

namespace App\Services;

use GuzzleHttp\Psr7\Utils;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Psr\Http\Message\StreamInterface;

class GoogleDriveService
{
    private const API = 'https://www.googleapis.com/drive/v3';

    private const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

    private const FOLDER = 'application/vnd.google-apps.folder';

    /** Google-native types Drive can export to PDF. Other native types (forms, shortcuts, ...) are hidden. */
    private const EXPORTABLE = [
        'application/vnd.google-apps.document',
        'application/vnd.google-apps.spreadsheet',
        'application/vnd.google-apps.presentation',
        'application/vnd.google-apps.drawing',
    ];

    /** Extension for files whose name has none and for which Drive reports no fileExtension. */
    private const MIME_EXTENSIONS = [
        'application/pdf'                                                           => 'pdf',
        'application/msword'                                                        => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'   => 'docx',
        'application/vnd.ms-excel'                                                  => 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'         => 'xlsx',
        'application/vnd.ms-powerpoint'                                             => 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' => 'pptx',
        'application/zip'                                                           => 'zip',
        'text/plain'                                                                => 'txt',
        'text/csv'                                                                  => 'csv',
        'image/jpeg'                                                                => 'jpg',
        'image/png'                                                                 => 'png',
        'image/gif'                                                                 => 'gif',
        'image/webp'                                                                => 'webp',
        'video/mp4'                                                                 => 'mp4',
        'audio/mpeg'                                                                => 'mp3',
    ];

    /** File metadata already fetched during this request. */
    private array $memo = [];

    public function rootId(): string
    {
        return (string) config('services.google.folder_id');
    }

    private function accessToken(): string
    {
        $refreshToken = (string) config('services.google.refresh_token');

        // Keyed by the refresh token, so swapping it in .env takes effect immediately.
        return Cache::remember('gdrive_access_token_' . sha1($refreshToken), 3000, function () use ($refreshToken) {
            return Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'client_id'     => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'refresh_token' => $refreshToken,
                'grant_type'    => 'refresh_token',
            ])->throw()->json('access_token');
        });
    }

    private function http(): PendingRequest
    {
        return Http::withToken($this->accessToken());
    }

    /**
     * Pass successful responses through. Failures become a plain-text error
     * that carries Google's own message and reason, e.g. "(insufficientPermissions)".
     */
    private function check(Response $response): Response
    {
        if ($response->successful()) {
            return $response;
        }

        $error = $response->json('error') ?? [];
        $reason = $error['errors'][0]['reason'] ?? $error['status'] ?? $response->status();

        abort(response(
            'Google Drive: ' . ($error['message'] ?? 'Request failed.') . " ({$reason})",
            in_array($response->status(), [403, 404], true) ? $response->status() : 502,
            ['Content-Type' => 'text/plain; charset=UTF-8'],
        ));
    }

    /** GET a Drive API path. */
    private function get(string $path, array $query = []): Response
    {
        return $this->check(
            $this->http()->get(self::API . $path, $query + ['supportsAllDrives' => 'true'])
        );
    }

    private function meta(string $id): array
    {
        return $this->memo[$id] ??= $this->get("/files/{$id}", [
            'fields' => 'id,name,mimeType,parents,trashed,fileExtension',
        ])->json();
    }

    /**
     * Path from the root folder down to $id: [['id' => ..., 'name' => ...], ...].
     * Aborts with 404 when $id is trashed or is not inside the root folder,
     * so every public method below is limited to that folder tree.
     */
    public function trail(string $id): array
    {
        $trail = [];

        for ($depth = 0; $depth < 30; $depth++) {
            $file = $this->meta($id);

            abort_if($file['trashed'] ?? false, 404);
            array_unshift($trail, ['id' => $file['id'], 'name' => $file['name']]);

            if ($file['id'] === $this->rootId()) {
                return $trail;
            }

            $id = $file['parents'][0] ?? abort(404);
        }

        abort(404);
    }

    /** Deny unless $id is a folder inside the root folder. */
    private function requireFolder(string $id): void
    {
        $this->trail($id);

        abort_unless($this->meta($id)['mimeType'] === self::FOLDER, 404);
    }

    /**
     * File name with its extension, even when the name in Drive was saved without one.
     * Uploads normally carry it already; Google Docs/Sheets/Slides show as .pdf because
     * that is what they open and download as here.
     */
    private function nameWithExtension(array $file): string
    {
        $name = $file['name'];
        $mime = $file['mimeType'];

        if ($mime === self::FOLDER) {
            return $name;
        }

        $extension = str_starts_with($mime, 'application/vnd.google-apps.')
            ? 'pdf'
            : ($file['fileExtension'] ?? self::MIME_EXTENSIONS[$mime] ?? null);

        if (! $extension || str_ends_with(strtolower($name), '.' . strtolower($extension))) {
            return $name;
        }

        return "{$name}.{$extension}";
    }

    /** Breadcrumb trail and contents (folders first) of a folder. */
    public function browse(string $id): array
    {
        $trail = $this->trail($id);

        abort_unless($this->meta($id)['mimeType'] === self::FOLDER, 404);

        $items = [];
        $pageToken = null;

        do {
            $page = $this->get('/files', array_filter([
                'q'                         => "'{$id}' in parents and trashed = false",
                'fields'                    => 'nextPageToken,files(id,name,mimeType,modifiedTime,size,fileExtension)',
                'orderBy'                   => 'folder,name_natural',
                'pageSize'                  => 1000,
                'pageToken'                 => $pageToken,
                'includeItemsFromAllDrives' => 'true',
            ]))->json();

            $items = array_merge($items, $page['files'] ?? []);
            $pageToken = $page['nextPageToken'] ?? null;
        } while ($pageToken);

        $items = array_values(array_filter(
            $items,
            fn($file) => $file['mimeType'] === self::FOLDER
                || in_array($file['mimeType'], self::EXPORTABLE, true)
                || ! str_starts_with($file['mimeType'], 'application/vnd.google-apps.')
        ));

        return [
            'trail' => $trail,
            'items' => array_map(fn($file) => [
                'id'           => $file['id'],
                'name'         => $this->nameWithExtension($file),
                'mimeType'     => $file['mimeType'],
                'modifiedTime' => $file['modifiedTime'],
                'size'         => $file['size'] ?? null,
            ], $items),
        ];
    }

    /**
     * Metadata and body stream of a file. Google-native files are exported to PDF,
     * and the returned name/mimeType reflect that.
     *
     * @return array{0: array, 1: StreamInterface}
     */
    public function open(string $id): array
    {
        $this->trail($id);

        $file = $this->meta($id);

        abort_if($file['mimeType'] === self::FOLDER, 404);

        $native = str_starts_with($file['mimeType'], 'application/vnd.google-apps.');

        abort_if($native && ! in_array($file['mimeType'], self::EXPORTABLE, true), 415);

        $response = $this->check(
            $this->http()
                ->withOptions(['stream' => true])
                ->get(
                    self::API . "/files/{$id}" . ($native ? '/export' : ''),
                    $native ? ['mimeType' => 'application/pdf'] : ['alt' => 'media', 'supportsAllDrives' => 'true'],
                )
        );

        $file['name'] = $this->nameWithExtension($file);

        if ($native) {
            $file['mimeType'] = 'application/pdf';
        }

        return [$file, $response->toPsrResponse()->getBody()];
    }

    /** Create a folder named $name inside $parentId. */
    public function createFolder(string $parentId, string $name): array
    {
        $this->requireFolder($parentId);

        return $this->makeFolder($parentId, $name);
    }

    /**
     * Upload files into $parentId. For folder uploads, $paths[$i] is the relative
     * path of $files[$i] ("Photos/2024/img.jpg"); missing folders are created on the way.
     *
     * @param  UploadedFile[]  $files
     * @param  string[]  $paths
     */
    public function uploadMany(string $parentId, array $files, array $paths = []): void
    {
        $this->requireFolder($parentId);

        $folders = [];

        foreach ($files as $i => $file) {
            $dirs = array_values(array_filter(explode('/', (string) ($paths[$i] ?? '')), 'strlen'));
            array_pop($dirs); // the last segment is the file name

            $target = $parentId;
            $key = '';

            foreach ($dirs as $dir) {
                $key .= '/' . $dir;
                $target = $folders[$key] ??= $this->findOrCreateFolder($target, $dir);
            }

            $this->sendFile($target, $file);
        }
    }

    /** Move a file or folder to the Drive trash (restorable from Drive for 30 days). */
    public function trash(string $id): void
    {
        abort_if($id === $this->rootId(), 403, 'The root folder cannot be deleted.');

        $this->trail($id);

        $this->http()
            ->patch(self::API . "/files/{$id}?supportsAllDrives=true", ['trashed' => true])
            ->throw();
    }
    
    /** Rename a file or folder. */
    public function rename(string $id, string $name): void
    {
        abort_if($id === $this->rootId(), 403, 'The root folder cannot be renamed.');

        $this->trail($id);

        // Google Docs/Sheets/Slides are listed as "<name>.pdf" (see nameWithExtension),
        // so drop that suffix to keep the real name in Drive clean.
        $mime = $this->meta($id)['mimeType'];

        if ($mime !== self::FOLDER && str_starts_with($mime, 'application/vnd.google-apps.')) {
            $name = preg_replace('/\.pdf$/i', '', $name) ?: $name;
        }

        $this->http()
            ->patch(self::API . "/files/{$id}?supportsAllDrives=true", ['name' => $name])
            ->throw();
    }

    private function makeFolder(string $parentId, string $name): array
    {
        return $this->http()
            ->post(self::API . '/files?supportsAllDrives=true&fields=id,name', [
                'name'     => $name,
                'mimeType' => self::FOLDER,
                'parents'  => [$parentId],
            ])
            ->throw()
            ->json();
    }

    /** ID of the folder called $name inside $parentId, creating it when it does not exist yet. */
    private function findOrCreateFolder(string $parentId, string $name): string
    {
        $escaped = str_replace(['\\', "'"], ['\\\\', "\\'"], $name);

        $existing = $this->get('/files', [
            'q'                         => "'{$parentId}' in parents and mimeType = '" . self::FOLDER . "' and name = '{$escaped}' and trashed = false",
            'fields'                    => 'files(id)',
            'pageSize'                  => 1,
            'includeItemsFromAllDrives' => 'true',
        ])->json('files.0.id');

        return $existing ?? $this->makeFolder($parentId, $name)['id'];
    }

    /** Resumable upload, streamed from disk so large files never sit in memory. */
    private function sendFile(string $parentId, UploadedFile $file): array
    {
        $mime = $file->getMimeType() ?: ($file->getClientMimeType() ?: 'application/octet-stream');
        $size = $file->getSize();
        $meta = ['name' => $file->getClientOriginalName(), 'parents' => [$parentId]];

        // Drive cannot start a resumable upload for an empty file, so create it directly.
        if ($size === 0) {
            return $this->http()
                ->post(self::API . '/files?supportsAllDrives=true&fields=id,name', $meta + ['mimeType' => $mime])
                ->throw()
                ->json();
        }

        $session = $this->http()
            ->withHeaders(['X-Upload-Content-Type' => $mime, 'X-Upload-Content-Length' => $size])
            ->post(self::UPLOAD . '?uploadType=resumable&supportsAllDrives=true&fields=id,name', $meta)
            ->throw()
            ->header('Location');

        abort_if($session === '', 502, 'Google Drive did not return an upload session.');

        return $this->http()
            ->timeout(600)
            ->withBody(Utils::streamFor(fopen($file->getRealPath(), 'rb')), $mime)
            ->put($session)
            ->throw()
            ->json();
    }

    
}
