<?php

namespace App\Http\Controllers\ApprovalSheet;

use App\Http\Controllers\Controller;
use App\Services\GoogleDriveService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ApprovalSheetController extends Controller
{
    protected $drive;

    public function __construct(GoogleDriveService $drive)
    {
        $this->drive = $drive;
    }

    public function uploadApprovalSheet(Request $request)
    {
        $accessToken = $this->drive->token();

        $request->validate([
            'pdf' => ['required', 'mimes:pdf'],
            'student_id' => ['required', 'integer'],
        ]);


        $folderId = $this->drive->getOrCreateFolder($accessToken, 'Approval Sheet', config('services.google.folder_id'));

        $file = $request->file('pdf');
        $mimeType = $file->getMimeType();

        $metadata = [
            'name' => 'temp_' . time(),
            'parents' => [$folderId],
        ];

        $uploadResponse = Http::withToken($accessToken)
            ->attach('metadata', json_encode($metadata), 'metadata.json', ['Content-Type' => 'application/json'])
            ->attach('media', file_get_contents($file), $file->getClientOriginalName(), ['Content-Type' => $mimeType])
            ->post('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');

        if ($uploadResponse->successful()) {
            $fileId = $uploadResponse->json()['id'];

            Http::withToken($accessToken)->patch("https://www.googleapis.com/drive/v3/files/{$fileId}", [
                'name' => $fileId,
            ]);

            Http::withToken($accessToken)->post("https://www.googleapis.com/drive/v3/files/{$fileId}/permissions", [
                'role' => 'reader',
                'type' => 'anyone',
            ]);

            $news = News::create([
                'image' => $fileId,
                'title' => $request->title,
                'description' => $request->description,
                'date' => Carbon::parse($request->date)
                    ->timezone('Asia/Manila')
                    ->toDateString(),
            ]);

            foreach ($request->sdg as $sdgId) {
                NewsSdg::create([
                    'news_id' => $news->id,
                    'sdg_id' => $sdgId,
                ]);
            }

            return redirect()->back()->with('success', 'News added successfully!');
        }
    }

    public function edit($id)
    {
        $news = News::with('sdg')->findOrFail($id);
        $options = Sdg::query()->select('id', 'name as label')->get();

        return view('pages.app.news.edit', compact('news', 'options'));
    }

    public function update(Request $request, $id)
    {
        $accessToken = $this->drive->token();

        $news = News::findOrFail($id);

        $request->validate([
            'sdg' => ['sometimes', 'array', 'min:1'],
            'image' => ['nullable', 'mimes:jpeg,jpg,png'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required'],
            'date' => ['required', 'date'],
        ]);

        $fileId = $news->image;

        if ($request->hasFile('image')) {
            $folderId = $this->getOrCreateFolder($accessToken, 'News', config('services.google.folder_id'));

            $file = $request->file('image');
            $mimeType = $file->getMimeType();

            $metadata = [
                'name' => 'temp_' . time(),
                'parents' => [$folderId],
            ];

            $uploadResponse = Http::withToken($accessToken)
                ->attach('metadata', json_encode($metadata), 'metadata.json', ['Content-Type' => 'application/json'])
                ->attach('media', file_get_contents($file), $file->getClientOriginalName(), ['Content-Type' => $mimeType])
                ->post('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');

            if ($uploadResponse->successful()) {
                $newFileId = $uploadResponse->json()['id'];

                Http::withToken($accessToken)->patch("https://www.googleapis.com/drive/v3/files/{$newFileId}", [
                    'name' => $newFileId,
                ]);

                Http::withToken($accessToken)->post("https://www.googleapis.com/drive/v3/files/{$newFileId}/permissions", [
                    'role' => 'reader',
                    'type' => 'anyone',
                ]);

                Http::withToken($accessToken)->delete("https://www.googleapis.com/drive/v3/files/{$fileId}");

                $fileId = $newFileId;
            }
        }

        $news->update([
            'image' => $fileId,
            'title' => $request->title,
            'description' => $request->description,
            'date' => \Carbon\Carbon::parse($request->date)
                ->timezone('Asia/Manila')
                ->toDateString(),
        ]);

        if ($request->filled('sdg')) {
            NewsSdg::where('news_id', $news->id)->delete();

            foreach ($request->sdg as $sdgId) {
                NewsSdg::create([
                    'news_id' => $news->id,
                    'sdg_id' => $sdgId,
                ]);
            }
        }

        return redirect()->back()->with('success', 'News updated successfully!');
    }

    public function delete($id)
    {
        $news = News::findOrFail($id);
        $accessToken = $this->drive->token();

        Http::withToken($accessToken)->delete("https://www.googleapis.com/drive/v3/files/{$news->image}");

        NewsSdg::where('news_id', $news->id)->delete();

        $news->delete();

        return redirect()->back()->with('success', 'News deleted successfully!');;
    }
}
