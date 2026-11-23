<?php

namespace App\Http\Controllers;

use App\Services\ClassAnnouncements;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

/**
 * The signed-in user's notifications, for the bell. The rows are the same
 * for every app; this adds the web address each one opens.
 */
class NotificationController extends Controller
{
    private const CATEGORIES = ['enrollment', 'grades', 'requests', 'classes', 'account', 'system'];

    /** Where a notification's link goes in the web app. */
    private function webUrl(?array $link): ?string
    {
        $params = $link['params'] ?? [];

        return match ($link['screen'] ?? null) {
            'class.announcements' => isset($params['class_id'])
                ? '/classes/classroom/' . hash('sha256', (string) $params['class_id']) . '?'
                . http_build_query(array_filter([
                    'tab' => 'announcements',
                    'post' => $params['announcement_id'] ?? null,
                ]))
                : null,
            // The teacher's class list, e.g. grade upload reminders.
            'classes' => '/classes',
            default => null,
        };
    }

    private function present(DatabaseNotification $notification): array
    {
        $data = $notification->data ?? [];

        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'category' => $notification->category,
            'title' => $data['title'] ?? '',
            'body' => $data['body'] ?? '',
            'actor' => $data['actor'] ?? null,
            'url' => $this->webUrl($data['link'] ?? null),
            'read' => $notification->read_at !== null,
            'created_at' => $notification->created_at?->toIso8601String(),
        ];
    }

    public function index(Request $request, ClassAnnouncements $announcements)
    {
        $data = $request->validate([
            'category' => ['nullable', 'in:' . implode(',', self::CATEGORIES)],
            'unread' => ['nullable', 'boolean'],
        ]);

        $announcements->releaseDue();

        $page = $request->user()
            ->notifications()
            ->when($data['category'] ?? null, fn($query, $category) => $query->where('category', $category))
            ->when($request->boolean('unread'), fn($query) => $query->whereNull('read_at'))
            ->simplePaginate(15);

        return response()->json([
            'items' => collect($page->items())->map(fn($notification) => $this->present($notification))->values(),
            'next_page' => $page->hasMorePages() ? $page->currentPage() + 1 : null,
        ]);
    }

    public function counts(Request $request, ClassAnnouncements $announcements)
    {
        // The bell asks every minute, so scheduled posts go out on time.
        $announcements->releaseDue();

        $byCategory = $request->user()
            ->unreadNotifications()
            ->reorder()
            ->groupBy('category')
            ->selectRaw('category, count(*) as total')
            ->pluck('total', 'category')
            ->map(fn($total) => (int) $total);

        return response()->json([
            'unread' => $byCategory->sum(),
            'by_category' => $byCategory,
        ]);
    }

    public function read(Request $request, string $id)
    {
        $updated = $request->user()
            ->notifications()
            ->whereKey($id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['read' => true, 'updated' => $updated]);
    }

    public function readAll(Request $request)
    {
        $data = $request->validate([
            'category' => ['nullable', 'in:' . implode(',', self::CATEGORIES)],
        ]);

        $updated = $request->user()
            ->unreadNotifications()
            ->when($data['category'] ?? null, fn($query, $category) => $query->where('category', $category))
            ->update(['read_at' => now()]);

        return response()->json(['updated' => $updated]);
    }
}
