<?php

namespace App\Http\Controllers\Announcement;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Http;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AnnouncementController extends Controller
{
    private function token()
    {
        $client_id = config('services.google.client_id');
        $client_secret = config('services.google.client_secret');
        $refresh_token = config('services.google.refresh_token');

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => $client_id,
            'client_secret' => $client_secret,
            'refresh_token' => $refresh_token,
            'grant_type' => 'refresh_token',
        ]);

        if (!$response->successful()) {
            throw new \Exception('Failed to get Google access token: ' . $response->body());
        }

        return $response->json()['access_token'];
    }

    private function getOrCreateFolder($accessToken, $folderName, $parentId)
    {
        $response = Http::withToken($accessToken)->get('https://www.googleapis.com/drive/v3/files', [
            'q' => "name='{$folderName}' and '{$parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
            'fields' => 'files(id)',
        ]);

        if ($response->successful() && count($response['files']) > 0) {
            return $response['files'][0]['id'];
        }

        $create = Http::withToken($accessToken)->post('https://www.googleapis.com/drive/v3/files', [
            'name' => $folderName,
            'mimeType' => 'application/vnd.google-apps.folder',
            'parents' => [$parentId],
        ]);

        return $create->json()['id'];
    }

    public function view()
    {
        $announcements = Announcement::select('id', 'content_body', 'image', 'image_file_id', 'created_at')
            ->latest()
            ->get();

        return Inertia::render('Guest/Announcement', [
            'announcements' => $announcements
        ]);
    }

    public function upload(Request $request)
    {
        $accessToken = $this->token();

        $user_id = $request->user()->id;

        $data = $request->validate([
            'content_body' => 'required'
        ]);

        if ($request->hasFile('image')) {
            $occ_enrollFolderId = config('services.google.folder_id');
            $announcementsFolderId = $this->getOrCreateFolder($accessToken, 'announcements', $occ_enrollFolderId);
            $imagesFolderId = $this->getOrCreateFolder($accessToken, 'images', $announcementsFolderId);

            $file = $request->file('image');
            $mimeType = $file->getMimeType();

            $metadata = [
                'name' => 'temp_' . time(),
                'parents' => [$imagesFolderId],
            ];

            $uploadRes = Http::withToken($accessToken)
                ->attach('metadata', json_encode($metadata), 'metadata.json', ['Content-Type' => 'application/json'])
                ->attach('media', file_get_contents($file), $file->getClientOriginalName(), ['Content-Type' => $mimeType])
                ->post('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');

            if ($uploadRes->successful()) {
                $imageFileId = $uploadRes->json()['id'];

                Http::withToken($accessToken)->patch("https://www.googleapis.com/drive/v3/files/{$imageFileId}", [
                    'name' => $imageFileId,
                ]);

                Http::withToken($accessToken)->post("https://www.googleapis.com/drive/v3/files/{$imageFileId}/permissions", [
                    'role' => 'reader',
                    'type' => 'anyone',
                ]);

                $imageUrl = "https://drive.google.com/thumbnail?id={$imageFileId}";
            }
        }

        Announcement::create([
            'ann_admin_id' => $user_id,
            'content_body' => $data['content_body'],
            'image' => $imageUrl ?? null,
            'image_file_id' => $imageFileId ?? null,
        ]);
    }

    public function update(Request $request)
    {
        $announcement = Announcement::findOrFail($request->id);

        $accessToken = $this->token();

        $data = $request->validate([
            'content_body' => 'required'
        ]);

        $announcement->update([
            'content_body' => $data['content_body'],
        ]);

        if ($request->hasFile('image')) {
            $request->validate([
                'image' => ['mimes:jpeg,jpg,png']
            ]);

            if ($announcement->image_file_id) {
                Http::withToken($accessToken)->delete("https://www.googleapis.com/drive/v3/files/{$announcement->image_file_id}");
            }

            $occ_enrollFolderId = config('services.google.folder_id');
            $announcementsFolderId = $this->getOrCreateFolder($accessToken, 'announcements', $occ_enrollFolderId);
            $imagesFolderId = $this->getOrCreateFolder($accessToken, 'images', $announcementsFolderId);

            $file = $request->file('image');
            $mimeType = $file->getMimeType();

            $metadata = [
                'name' => 'temp_' . time(),
                'parents' => [$imagesFolderId],
            ];

            $uploadRes = Http::withToken($accessToken)
                ->attach('metadata', json_encode($metadata), 'metadata.json', ['Content-Type' => 'application/json'])
                ->attach('media', file_get_contents($file), $file->getClientOriginalName(), ['Content-Type' => $mimeType])
                ->post('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');

            if ($uploadRes->successful()) {
                $imageFileId = $uploadRes->json()['id'];

                Http::withToken($accessToken)->patch("https://www.googleapis.com/drive/v3/files/{$imageFileId}", [
                    'name' => $imageFileId,
                ]);

                Http::withToken($accessToken)->post("https://www.googleapis.com/drive/v3/files/{$imageFileId}/permissions", [
                    'role' => 'reader',
                    'type' => 'anyone',
                ]);

                $imageUrl = "https://drive.google.com/thumbnail?id={$imageFileId}";

                $announcement->update([
                    'image' => $imageUrl,
                    'image_file_id' => $imageFileId
                ]);
            }
        }
    }

    public function delete(Request $request)
    {
        Announcement::findOrFail($request->id)
            ->delete();
    }
}
