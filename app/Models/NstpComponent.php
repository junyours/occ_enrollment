<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NstpComponent extends Model
{
    protected $table = 'nstp_components';

    protected $fillable = [
        'component_name',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];
}
