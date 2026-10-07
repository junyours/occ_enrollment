<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Services\GoogleDriveService;
use Closure;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DriveFileController extends Controller
{
    /** Only these open in the browser; everything else is sent as a download. */
    private const INLINE = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/webp',
    ];

    public function index(GoogleDriveService $drive): Response
    {
        return Inertia::render('Files/Index', $drive->browse($drive->rootId()));
    }

    public function folder(GoogleDriveService $drive, string $id): Response
    {
        return Inertia::render('Files/Index', $drive->browse($id));
    }

    public function show(Request $request, GoogleDriveService $drive, string $id): StreamedResponse
    {
        [$file, $stream] = $drive->open($id);

        $inline = ! $request->boolean('download') && in_array($file['mimeType'], self::INLINE, true);

        return response()->streamDownload(function () use ($stream) {
            while (! $stream->eof()) {
                echo $stream->read(8192);
                flush();
            }
        }, $file['name'], [
            'Content-Type'           => $file['mimeType'],
            'X-Content-Type-Options' => 'nosniff',
        ], $inline ? 'inline' : 'attachment');
    }

    public function storeFolder(Request $request, GoogleDriveService $drive): RedirectResponse
    {
        $data = $request->validate([
            'parent' => ['required', 'regex:/^[A-Za-z0-9_-]+$/'],
            'name'   => ['required', 'string', 'max:255'],
        ]);

        return $this->attempt(
            'create the folder',
            fn() => $drive->createFolder($data['parent'], trim($data['name'])),
        );
    }

    /**
     * Receives a batch of files. For folder uploads, paths[i] is the relative path
     * of files[i] (e.g. "Photos/2024/img.jpg"), which is how subfolders are rebuilt.
     */
    public function upload(Request $request, GoogleDriveService $drive): RedirectResponse
    {
        $data = $request->validate([
            'parent'  => ['required', 'regex:/^[A-Za-z0-9_-]+$/'],
            'files'   => ['required', 'array', 'max:50'],
            'files.*' => ['file', 'max:102400'], // KB, so 100 MB per file; PHP's upload_max_filesize applies first
            'paths'   => ['nullable', 'array'],
            'paths.*' => ['nullable', 'string', 'max:1000'],
        ]);

        return $this->attempt(
            'upload the files',
            fn() => $drive->uploadMany($data['parent'], $request->file('files'), $data['paths'] ?? []),
        );
    }

    public function destroy(GoogleDriveService $drive, string $id): RedirectResponse
    {
        return $this->attempt('delete the item', fn() => $drive->trash($id));
    }

    public function rename(Request $request, GoogleDriveService $drive, string $id): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:255']]);

        return $this->attempt('rename the item', fn() => $drive->rename($id, trim($data['name'])));
    }

    /** Run a Drive write. On a Google error, go back showing Google's own message. */
    private function attempt(string $action, Closure $work): RedirectResponse
    {
        try {
            $work();
        } catch (RequestException $e) {
            $reason = $e->response->json('error.message');

            return back()->withErrors([
                'drive' => $reason ? "Google refused to {$action}: {$reason}" : "Couldn't {$action}. Try again.",
            ]);
        }

        return back();
    }

    
    
}
