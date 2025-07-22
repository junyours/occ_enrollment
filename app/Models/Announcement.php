<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    protected $table = 'announcements';

    protected $fillable = [
        "ann_admin_id",
        "content_body",
        "image",
        "image_file_id",
    ];
}
