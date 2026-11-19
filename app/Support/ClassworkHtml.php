<?php

namespace App\Support;

use HTMLPurifier;
use HTMLPurifier_Config;
use Illuminate\Support\Facades\File;

final class ClassworkHtml
{
    public static function clean(?string $html): string
    {
        $cachePath = storage_path(
            'framework/cache/htmlpurifier'
        );

        File::ensureDirectoryExists($cachePath);

        $config = HTMLPurifier_Config::createDefault();

        $config->set(
            'HTML.Allowed',
            'p,br,strong,b,em,i,u,ul,ol,li,a[href|target|rel]'
        );

        $config->set(
            'URI.AllowedSchemes',
            [
                'http' => true,
                'https' => true,
                'mailto' => true,
            ]
        );

        $config->set('URI.DefaultScheme', null);

        $config->set(
            'Attr.AllowedFrameTargets',
            ['_blank']
        );

        $config->set('HTML.TargetBlank', true);
        $config->set('HTML.TargetNoopener', true);
        $config->set('HTML.TargetNoreferrer', true);

        $config->set(
            'Cache.SerializerPath',
            $cachePath
        );

        return (new HTMLPurifier($config))
            ->purify($html ?? '');
    }
}
