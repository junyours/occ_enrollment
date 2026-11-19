<?php

namespace App\Support;

use HTMLPurifier;
use HTMLPurifier_Config;
use Illuminate\Support\Facades\File;

final class ClassworkHtml
{
    /** Plain text from rich (or plain) text, for previews and notifications. */
    public static function excerpt(?string $html, int $limit = 140): string
    {
        $spaced = preg_replace('/<\/(p|li)>|<br\s*\/?>/i', ' ', (string) $html);
        $text = html_entity_decode(strip_tags($spaced), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = trim(preg_replace('/\s+/u', ' ', str_replace("\u{00A0}", ' ', $text)));

        return mb_strlen($text) > $limit ? rtrim(mb_substr($text, 0, $limit)) . '...' : $text;
    }

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
