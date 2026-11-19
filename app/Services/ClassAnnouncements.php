<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\AnnouncementCommented;
use App\Notifications\AnnouncementPosted;
use App\Support\ClassworkHtml;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Throwable;

/**
 * What announcements share with the rest of the app: posting scheduled
 * ones when they are due, notifying the class, and the per-class unread
 * counts students see on their class list and class page.
 */
class ClassAnnouncements
{
    // Notifications are about one announcement each.
    public const SUBJECT = 'announcement';

    private function notifiableType(): string
    {
        return (new User())->getMorphClass();
    }

    /** User ids of the students enrolled in a class, dropped ones left out. */
    public function rosterUserIds(int $classId): array
    {
        return DB::table('student_subjects as ss')
            ->join('enrolled_students as es', 'es.id', '=', 'ss.enrolled_students_id')
            ->where('ss.year_section_subjects_id', $classId)
            ->where(fn($query) => $query->whereNull('ss.dropped')->orWhere('ss.dropped', 0))
            ->distinct()
            ->pluck('es.student_id')
            ->map(fn($id) => (int) $id)
            ->all();
    }

    /** "Maria L. Santos", from user_information fields. */
    public function personName(?object $person): string
    {
        if (! $person || (! $person->first_name && ! $person->last_name)) {
            return 'Instructor';
        }

        $title = fn(?string $value) => mb_convert_case(trim((string) $value), MB_CASE_TITLE, 'UTF-8');
        $middle = $person->middle_name ? ' ' . mb_substr($title($person->middle_name), 0, 1) . '.' : '';

        return trim($title($person->first_name) . $middle . ' ' . $title($person->last_name));
    }

    public function person(?int $userId): ?object
    {
        return $userId
            ? DB::table('user_information')->where('user_id', $userId)->first(['first_name', 'middle_name', 'last_name'])
            : null;
    }

    /** Plain text from rich text, for notification previews. */
    public function excerpt(string $html, int $limit = 140): string
    {
        return ClassworkHtml::excerpt($html, $limit);
    }

    private function classLabel(int $classId): string
    {
        $class = DB::table('year_section_subjects as ys')
            ->join('subjects as s', 's.id', '=', 'ys.subject_id')
            ->where('ys.id', $classId)
            ->first(['s.subject_code', 's.descriptive_title']);

        return $class->subject_code ?: ($class->descriptive_title ?? 'your class');
    }

    /**
     * Tells every enrolled student about a posted announcement. Runs after
     * the post is saved; a failure here is logged, never undoes the post.
     */
    public function notifyPosted(int $postId): void
    {
        try {
            $post = DB::table('class_announcements')->find($postId);

            if (! $post || ! $post->published) {
                return;
            }

            $classId = (int) $post->year_section_subject_id;
            $students = $this->rosterUserIds($classId);

            if ($students === []) {
                return;
            }

            $notification = new AnnouncementPosted(
                announcementId: (int) $post->id,
                classId: $classId,
                className: $this->classLabel($classId),
                excerpt: $this->excerpt($post->body),
                actor: $post->author_id
                    ? ['id' => (int) $post->author_id, 'name' => $this->personName($this->person((int) $post->author_id))]
                    : null,
            );

            User::whereIn('id', $students)->chunkById(200, function ($users) use ($notification) {
                Notification::send($users, $notification);
            });
        } catch (Throwable $error) {
            report($error);
        }
    }

    /** Tells the class's teacher that a student commented. */
    public function notifyComment(object $post, int $authorId, string $comment): void
    {
        try {
            $teacherId = DB::table('year_section_subjects')
                ->where('id', $post->year_section_subject_id)
                ->value('faculty_id');

            $teacher = $teacherId ? User::find($teacherId) : null;

            if (! $teacher || (int) $teacherId === $authorId) {
                return;
            }

            $teacher->notify(new AnnouncementCommented(
                announcementId: (int) $post->id,
                classId: (int) $post->year_section_subject_id,
                className: $this->classLabel((int) $post->year_section_subject_id),
                comment: Str::limit(trim(preg_replace('/\s+/u', ' ', $comment)), 140),
                actor: ['id' => $authorId, 'name' => $this->personName($this->person($authorId))],
            ));
        } catch (Throwable $error) {
            report($error);
        }
    }

    /**
     * Posts scheduled announcements that are due, then notifies their
     * classes. Called whenever announcements or notifications are read, and
     * every minute by the scheduler when its cron runs, so a post goes out
     * on time even without one. Returns how many were posted.
     */
    public function releaseDue(?int $classId = null): int
    {
        $now = now()->utc();

        $due = DB::table('class_announcements')
            ->where('published', false)
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<=', $now)
            ->when($classId, fn($query) => $query->where('year_section_subject_id', $classId))
            ->orderBy('scheduled_at')
            ->limit(50)
            ->pluck('id');

        $released = 0;

        foreach ($due as $id) {
            $posted = DB::transaction(function () use ($id, $now) {
                $post = DB::table('class_announcements')->where('id', $id)->lockForUpdate()->first();

                // Another request may have posted or changed it meanwhile.
                if (! $post || $post->published || ! $post->scheduled_at || $post->scheduled_at > $now->format('Y-m-d H:i:s')) {
                    return false;
                }

                DB::table('class_announcements')->where('id', $id)->update([
                    'published' => true,
                    'posted_at' => $post->scheduled_at,
                    'scheduled_at' => null,
                    'updated_at' => now(),
                ]);

                return true;
            });

            if ($posted) {
                $released++;
                $this->notifyPosted((int) $id);
            }
        }

        return $released;
    }

    private function unreadQuery(int $userId)
    {
        return DB::table('notifications as n')
            ->join('class_announcements as a', 'a.id', '=', 'n.subject_id')
            ->where('n.notifiable_type', $this->notifiableType())
            ->where('n.notifiable_id', $userId)
            ->where('n.subject_type', self::SUBJECT)
            ->whereNull('n.read_at');
    }

    /** Unread announcement notifications per class, as [classId => count]. */
    public function unreadByClass(int $userId, array $classIds): array
    {
        if ($classIds === []) {
            return [];
        }

        return $this->unreadQuery($userId)
            ->whereIn('a.year_section_subject_id', $classIds)
            ->groupBy('a.year_section_subject_id')
            ->selectRaw('a.year_section_subject_id as class_id, count(*) as total')
            ->pluck('total', 'class_id')
            ->map(fn($total) => (int) $total)
            ->all();
    }

    /** Announcement ids in a class the user hasn't seen yet. */
    public function unreadPostIds(int $userId, int $classId): array
    {
        return $this->unreadQuery($userId)
            ->where('a.year_section_subject_id', $classId)
            ->distinct()
            ->pluck('a.id')
            ->map(fn($id) => (int) $id)
            ->all();
    }

    /** Marks the user's notifications about a class's announcements read. */
    public function markClassRead(int $userId, int $classId): int
    {
        return DB::table('notifications')
            ->where('notifiable_type', $this->notifiableType())
            ->where('notifiable_id', $userId)
            ->where('subject_type', self::SUBJECT)
            ->whereNull('read_at')
            ->whereIn('subject_id', DB::table('class_announcements')
                ->where('year_section_subject_id', $classId)
                ->select('id'))
            ->update(['read_at' => now(), 'updated_at' => now()]);
    }

    /**
     * How many of the students told about each post have seen it, as
     * [postId => ['seen' => int, 'total' => int]]. Only students count;
     * comment notifications to the teacher are left out.
     */
    public function seenCounts(array $postIds): array
    {
        if ($postIds === []) {
            return [];
        }

        return DB::table('notifications')
            ->where('subject_type', self::SUBJECT)
            ->whereIn('subject_id', $postIds)
            ->where('type', 'announcement.posted')
            ->groupBy('subject_id')
            ->selectRaw('subject_id, count(*) as total, count(read_at) as seen')
            ->get()
            ->mapWithKeys(fn($row) => [(int) $row->subject_id => ['seen' => (int) $row->seen, 'total' => (int) $row->total]])
            ->all();
    }

    /** Who was told about a post, and who has seen it. */
    public function seenBy(int $postId): array
    {
        $rows = DB::table('notifications as n')
            ->leftJoin('user_information as info', 'info.user_id', '=', 'n.notifiable_id')
            ->where('n.subject_type', self::SUBJECT)
            ->where('n.subject_id', $postId)
            ->where('n.type', 'announcement.posted')
            ->where('n.notifiable_type', $this->notifiableType())
            ->orderBy('info.last_name')
            ->orderBy('info.first_name')
            ->get(['n.read_at', 'info.first_name', 'info.middle_name', 'info.last_name']);

        $person = fn($row) => ['name' => $this->personName($row)];

        return [
            'seen' => $rows->whereNotNull('read_at')->map($person)->values()->all(),
            'not_seen' => $rows->whereNull('read_at')->map($person)->values()->all(),
        ];
    }

    /** Removes the notifications about deleted posts. */
    public function forget(array $postIds): void
    {
        if ($postIds !== []) {
            DB::table('notifications')
                ->where('subject_type', self::SUBJECT)
                ->whereIn('subject_id', $postIds)
                ->delete();
        }
    }
}
