<?php

namespace Tests\Unit;

use App\Http\Controllers\Registrar\TorPhotoController;
use App\Http\Services\GoogleDriveException;
use App\Http\Services\GoogleDriveService;
use App\Http\Services\TorPhotoService;
use App\Models\User;
use GuzzleHttp\Psr7\FnStream;
use GuzzleHttp\Psr7\Utils;
use Illuminate\Cache\ArrayStore;
use Illuminate\Cache\Repository as CacheRepository;
use Illuminate\Config\Repository as ConfigRepository;
use Illuminate\Container\Container;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Database\Connection;
use Illuminate\Database\ConnectionResolver;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Events\Dispatcher;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Routing\Router;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Facade;
use Illuminate\Support\Facades\Http;
use Illuminate\Translation\ArrayLoader;
use Illuminate\Translation\Translator;
use Illuminate\Validation\Factory as ValidationFactory;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\TestCase;
use RuntimeException;

/** Runs without the application, .env, database, or network. */
class TorPhotoServiceTest extends TestCase
{
    private Container $app;
    private $previousContainer;
    private $previousFacadeApp;
    private $previousResolver;
    private TorPhotoService $photos;
    private GoogleDriveService $drive;
    private array $temporaryFiles = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->previousContainer = Container::getInstance();
        $this->previousFacadeApp = Facade::getFacadeApplication();
        $this->previousResolver = User::getConnectionResolver();
        $this->app = new Container;
        Container::setInstance($this->app);
        Facade::clearResolvedInstances();
        Facade::setFacadeApplication($this->app);
        $this->app->instance('config', new ConfigRepository([
            'services' => ['google' => ['folder_id' => 'root_test', 'client_id' => 'fake_client', 'client_secret' => 'fake_secret', 'refresh_token' => 'fake_refresh']],
        ]));
        $this->app->instance(Factory::class, new Factory);
        $this->app->instance('cache', new CacheRepository(new ArrayStore));
        $validator = new ValidationFactory(new Translator(new ArrayLoader, 'en'), $this->app);
        $this->app->instance('validator', $validator);
        $resolver = new ConnectionResolver(['photo_test' => new TorPhotoFakeConnection]);
        $resolver->setDefaultConnection('photo_test');
        User::setConnectionResolver($resolver);
        Http::preventStrayRequests();
        $this->drive = new GoogleDriveService;
        $this->photos = new TorPhotoService($this->drive);
    }

    protected function tearDown(): void
    {
        foreach ($this->temporaryFiles as $path) {
            if (is_file($path)) unlink($path);
        }
        if ($this->previousResolver) User::setConnectionResolver($this->previousResolver);
        else User::unsetConnectionResolver();
        Facade::clearResolvedInstances();
        Facade::setFacadeApplication($this->previousFacadeApp);
        Container::setInstance($this->previousContainer);
        parent::tearDown();
    }

    private function sequence(array $responses): void
    {
        $sequence = Http::sequence();
        foreach ($responses as $response) {
            if (is_array($response) && isset($response['__status'])) {
                $sequence->push($response['body'], $response['__status']);
            } else {
                $sequence->push($response);
            }
        }
        Http::fake(['*' => $sequence]);
    }

    private function token(): array { return ['access_token' => 'fake_access']; }
    private function folder(): array { return ['files' => [['id' => 'folder_test']]]; }
    private function properties(int $id = 42): array { return ['occ_purpose' => 'tor_student_photo', 'occ_student_id' => (string) $id]; }
    private function record(string $id = 'photo_test', string $mime = 'image/png', int $student = 42): array
    {
        return ['id' => $id, 'mimeType' => $mime, 'appProperties' => $this->properties($student)];
    }
    private function image(int $width = 80, int $height = 64, string $type = 'png'): UploadedFile
    {
        return UploadedFile::fake()->image('sample.' . $type, $width, $height);
    }
    private function bytes(UploadedFile $file): string { return file_get_contents($file->getRealPath()); }
    private function query(HttpRequest $request): array
    {
        parse_str(parse_url($request->url(), PHP_URL_QUERY) ?: '', $query);
        return $query;
    }
    private function failure(callable $work, int $status = 502): GoogleDriveException
    {
        try { $work(); }
        catch (GoogleDriveException $exception) {
            self::assertSame($status, $exception->status);
            self::assertStringNotContainsString('provider-secret', $exception->getMessage());
            return $exception;
        }
        self::fail('Expected a controlled Google Drive failure.');
    }
    private function assertNoPermissionsOrDelete(): void
    {
        Http::assertNotSent(fn (HttpRequest $request) => str_contains($request->url(), '/permissions') || $request->method() === 'DELETE');
    }
    private function assertScope(HttpRequest $request, int $student = 42): bool
    {
        $query = $this->query($request);
        return str_contains($query['q'] ?? '', "'folder_test' in parents")
            && str_contains($query['q'], "key='occ_purpose' and value='tor_student_photo'")
            && str_contains($query['q'], "key='occ_student_id' and value='{$student}'")
            && str_contains($query['q'], 'trashed=false')
            && ($query['supportsAllDrives'] ?? '') === 'true';
    }
    private function metadata(HttpRequest $request): array
    {
        $contentType = $request->header('Content-Type')[0];
        self::assertStringStartsWith('multipart/related; boundary=', $contentType);
        self::assertStringNotContainsString('multipart/form-data', $contentType);
        $boundary = substr($contentType, strlen('multipart/related; boundary='));
        $parts = explode('--' . $boundary, $request->body());
        self::assertCount(4, $parts);
        self::assertStringStartsWith("\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n", $parts[1]);
        self::assertStringContainsString("\r\nContent-Type: image/", $parts[2]);
        return json_decode(trim(explode("\r\n\r\n", $parts[1], 2)[1]), true, 512, JSON_THROW_ON_ERROR);
    }

    public function test_get_with_no_folder_is_read_only_and_returns_empty_photo(): void
    {
        $this->sequence([$this->token(), ['files' => []]]);
        self::assertSame(['photoUrl' => '', 'fileId' => null], $this->photos->show(42));
        Http::assertSentCount(2);
        Http::assertNotSent(fn (HttpRequest $request) => $request->method() !== 'GET' && ! str_contains($request->url(), 'oauth2'));
    }

    public function test_get_with_no_scoped_photo_returns_empty(): void
    {
        $this->sequence([$this->token(), $this->folder(), ['files' => []]]);
        self::assertSame(['photoUrl' => '', 'fileId' => null], $this->photos->show(42));
        Http::assertSent(fn (HttpRequest $request) => $this->assertScope($request));
        Http::assertSentCount(3);
    }

    public function test_get_loads_only_the_students_scoped_private_file_as_a_data_url(): void
    {
        $bytes = $this->bytes($this->image());
        $this->sequence([$this->token(), $this->folder(), ['files' => [$this->record()]], $bytes]);
        self::assertSame(['photoUrl' => 'data:image/png;base64,' . base64_encode($bytes), 'fileId' => 'photo_test'], $this->photos->show(42));
        Http::assertSent(fn (HttpRequest $request) => $this->assertScope($request));
        Http::assertSent(fn (HttpRequest $request) => str_contains($request->url(), '/files/photo_test?') && ($this->query($request)['alt'] ?? '') === 'media');
        $this->assertNoPermissionsOrDelete();
    }

    public function test_get_rejects_provider_metadata_for_another_student_before_downloading(): void
    {
        $this->sequence([$this->token(), $this->folder(), ['files' => [$this->record(student: 43)]]]);
        $this->failure(fn () => $this->photos->show(42));
        Http::assertSentCount(3);
    }

    public function test_get_rejects_wrong_mime_metadata_and_non_image_content(): void
    {
        $this->sequence([$this->token(), $this->folder(), ['files' => [$this->record()]], 'provider-secret not an image']);
        $this->failure(fn () => $this->photos->show(42));
    }

    public function test_media_download_is_capped_at_two_megabytes(): void
    {
        $this->sequence([str_repeat('a', 2 * 1024 * 1024 + 1)]);
        $this->failure(fn () => $this->drive->readImage('fake_access', 'photo_test', 2 * 1024 * 1024));
    }

    public function test_interrupted_media_stream_becomes_a_sanitized_drive_failure_and_closes(): void
    {
        $closed = false;
        $stream = FnStream::decorate(Utils::streamFor('not empty'), [
            'read' => function () { throw new RuntimeException('provider-secret interrupted stream'); },
            'close' => function () use (&$closed) { $closed = true; },
        ]);
        Http::fake(fn () => Http::response($stream));
        $this->failure(fn () => $this->drive->readImage('fake_access', 'photo_test', 100));
        self::assertTrue($closed);
    }

    public function test_first_upload_creates_the_fixed_child_and_correct_private_related_multipart(): void
    {
        $file = $this->image();
        $this->sequence([$this->token(), ['files' => []], ['id' => 'folder_test'], ['files' => []], ['id' => 'new_photo']]);
        $saved = $this->photos->store(42, $file);
        self::assertSame('new_photo', $saved['fileId']);
        self::assertSame('data:image/png;base64,' . base64_encode($this->bytes($file)), $saved['photoUrl']);
        Http::assertSent(fn (HttpRequest $request) => $request->method() === 'POST' && ($request['name'] ?? '') === 'TOR Student Photos'
            && ($request['parents'] ?? []) === ['root_test']);
        Http::assertSent(function (HttpRequest $request) {
            if (! str_contains($request->url(), '/upload/')) return false;
            $metadata = $this->metadata($request);
            self::assertSame(['folder_test'], $metadata['parents']);
            self::assertSame($this->properties(), $metadata['appProperties']);
            self::assertSame('student-42.png', $metadata['name']);
            self::assertSame('image/png', $metadata['mimeType']);
            self::assertSame('multipart', $this->query($request)['uploadType']);
            return $request->method() === 'POST';
        });
        $this->assertNoPermissionsOrDelete();
        Http::assertSentCount(5);
    }

    public function test_existing_folder_is_reused_for_upload(): void
    {
        $this->sequence([$this->token(), $this->folder(), ['files' => []], ['id' => 'new_photo']]);
        $this->photos->store(42, $this->image());
        Http::assertNotSent(fn (HttpRequest $request) => ($request['mimeType'] ?? '') === 'application/vnd.google-apps.folder');
        Http::assertSentCount(4);
    }

    public function test_replacement_patches_the_same_scoped_id_and_does_not_move_or_delete_it(): void
    {
        $this->sequence([$this->token(), $this->folder(), ['files' => [$this->record()]], ['id' => 'photo_test']]);
        self::assertSame('photo_test', $this->photos->store(42, $this->image())['fileId']);
        Http::assertSent(function (HttpRequest $request) {
            if ($request->method() !== 'PATCH' || ! str_contains($request->url(), '/upload/drive/v3/files/photo_test?')) return false;
            $metadata = $this->metadata($request);
            self::assertArrayNotHasKey('parents', $metadata);
            self::assertSame($this->properties(), $metadata['appProperties']);
            return true;
        });
        Http::assertNotSent(fn (HttpRequest $request) => $request->method() === 'POST' && str_contains($request->url(), '/upload/'));
        $this->assertNoPermissionsOrDelete();
    }

    public function test_failed_replacement_does_not_trash_the_existing_photo_or_create_an_orphan(): void
    {
        $this->sequence([$this->token(), $this->folder(), ['files' => [$this->record()]], ['__status' => 503, 'body' => 'provider-secret']]);
        $this->failure(fn () => $this->photos->store(42, $this->image()));
        Http::assertNotSent(fn (HttpRequest $request) => ($request['trashed'] ?? false) || ($request->method() === 'POST' && str_contains($request->url(), '/upload/')));
        $lock = Cache::lock('tor-photo-write:' . sha1('root_test'), 1);
        self::assertTrue($lock->get(), 'The write lock must release after failure.');
        $lock->release();
    }

    public function test_missing_root_configuration_fails_before_oauth(): void
    {
        config(['services.google.folder_id' => '']);
        $this->failure(fn () => $this->photos->show(42), 503);
        Http::assertNothingSent();
    }

    public function test_invalid_root_id_cannot_inject_a_drive_query(): void
    {
        config(['services.google.folder_id' => "root' or trashed=true"]);
        $this->failure(fn () => $this->photos->show(42), 503);
        Http::assertNothingSent();
    }

    public function test_missing_oauth_configuration_fails_without_a_request(): void
    {
        config(['services.google.refresh_token' => null]);
        $this->failure(fn () => $this->photos->show(42), 503);
        Http::assertNothingSent();
    }

    public function test_failed_oauth_response_is_sanitized(): void
    {
        $this->sequence([['__status' => 401, 'body' => 'provider-secret invalid grant']]);
        $this->failure(fn () => $this->photos->show(42));
        Http::assertSentCount(1);
    }

    public function test_malformed_successful_token_response_is_rejected(): void
    {
        $this->sequence([['expires_in' => 3600]]);
        $this->failure(fn () => $this->photos->show(42));
        Http::assertSentCount(1);
    }

    public function test_failed_folder_lookup_never_creates_another_folder(): void
    {
        $this->sequence([['__status' => 403, 'body' => 'provider-secret']]);
        $this->failure(fn () => $this->drive->getOrCreateFolder('fake_access', 'TOR Student Photos', 'root_test'));
        Http::assertSentCount(1);
        Http::assertNotSent(fn (HttpRequest $request) => $request->method() === 'POST');
    }

    public function test_malformed_folder_lookup_never_creates_a_folder(): void
    {
        $this->sequence([['unexpected' => 'provider-secret']]);
        $this->failure(fn () => $this->drive->getOrCreateFolder('fake_access', 'TOR Student Photos', 'root_test'));
        Http::assertSentCount(1);
    }

    public function test_failed_folder_creation_stops_before_media_upload(): void
    {
        $this->sequence([$this->token(), ['files' => []], ['__status' => 403, 'body' => 'provider-secret']]);
        $this->failure(fn () => $this->photos->store(42, $this->image()));
        Http::assertSentCount(3);
        Http::assertNotSent(fn (HttpRequest $request) => str_contains($request->url(), '/upload/'));
    }

    public function test_folder_name_quotes_and_backslashes_are_escaped_in_query(): void
    {
        $this->sequence([['files' => []]]);
        self::assertNull($this->drive->findFolder('fake_access', "Registrar's \\ folder", 'root_test'));
        Http::assertSent(fn (HttpRequest $request) => str_contains($this->query($request)['q'], "name='Registrar\\'s \\\\ folder'"));
    }

    public function test_scoped_lookup_follows_pagination_and_keeps_every_matching_id(): void
    {
        $this->sequence([
            ['files' => [$this->record('new_photo')], 'nextPageToken' => 'next_page'],
            ['files' => [$this->record('old_photo')]],
        ]);
        $files = $this->drive->findImages('fake_access', 'folder_test', $this->properties());
        self::assertSame(['new_photo', 'old_photo'], array_column($files, 'id'));
        Http::assertSent(fn (HttpRequest $request) => ($this->query($request)['pageToken'] ?? '') === 'next_page' && $this->assertScope($request));
    }

    public function test_repeated_page_token_is_rejected_instead_of_looping_forever(): void
    {
        $this->sequence([
            ['files' => [], 'nextPageToken' => 'same'],
            ['files' => [], 'nextPageToken' => 'same'],
        ]);
        $this->failure(fn () => $this->drive->findImages('fake_access', 'folder_test', $this->properties()));
        Http::assertSentCount(2);
    }

    public function test_delete_soft_trashes_all_scoped_duplicates_across_pages_only(): void
    {
        $this->sequence([$this->token(), $this->folder(),
            ['files' => [$this->record('new_photo')], 'nextPageToken' => 'next'],
            ['files' => [$this->record('old_photo')]], ['id' => 'new_photo'], ['id' => 'old_photo'],
        ]);
        self::assertSame(['photoUrl' => '', 'fileId' => null], $this->photos->destroy(42));
        foreach (['new_photo', 'old_photo'] as $id) {
            Http::assertSent(fn (HttpRequest $request) => $request->method() === 'PATCH' && str_contains($request->url(), '/files/' . $id . '?') && $request['trashed'] === true);
        }
        Http::assertNotSent(fn (HttpRequest $request) => str_contains($request->url(), '/permissions') || $request->method() === 'DELETE');
        Http::assertSentCount(6);
    }

    public function test_delete_with_no_folder_is_idempotent_and_does_not_create_one(): void
    {
        $this->sequence([$this->token(), ['files' => []]]);
        self::assertSame(['photoUrl' => '', 'fileId' => null], $this->photos->destroy(42));
        Http::assertSentCount(2);
    }

    public function test_delete_failure_is_reported_instead_of_claiming_success(): void
    {
        $this->sequence([$this->token(), $this->folder(), ['files' => [$this->record()]], ['__status' => 403, 'body' => 'provider-secret']]);
        $this->failure(fn () => $this->photos->destroy(42));
    }

    public function test_non_image_upload_is_rejected_before_any_drive_request(): void
    {
        $this->expectException(ValidationException::class);
        try { $this->photos->store(42, UploadedFile::fake()->createWithContent('sample.jpg', 'not an image')); }
        finally { Http::assertNothingSent(); }
    }

    public function test_oversized_dimensions_are_rejected_before_any_drive_request(): void
    {
        $this->expectException(ValidationException::class);
        try { $this->photos->store(42, $this->image(481, 300)); }
        finally { Http::assertNothingSent(); }
    }

    public function test_upload_byte_limit_is_enforced_even_for_valid_image_headers(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'tor_test_');
        $this->temporaryFiles[] = $path;
        file_put_contents($path, $this->bytes($this->image()) . str_repeat('a', 2 * 1024 * 1024));
        $file = new UploadedFile($path, 'sample.png', 'image/png', null, true);
        $this->expectException(ValidationException::class);
        try { $this->photos->store(42, $file); }
        finally { Http::assertNothingSent(); }
    }

    public function test_lock_timeout_is_a_controlled_retryable_failure_before_drive_access(): void
    {
        $cache = new class {
            public function lock($name, $seconds) {
                TestCase::assertSame('tor-photo-write:' . sha1('root_test'), $name);
                TestCase::assertSame(300, $seconds);
                return new class {
                    public function block($seconds, $callback) {
                        TestCase::assertSame(5, $seconds);
                        throw new LockTimeoutException;
                    }
                };
            }
        };
        Cache::swap($cache);
        $this->failure(fn () => $this->photos->store(42, $this->image()), 503);
        Http::assertNothingSent();
    }

    public function test_controller_checks_existing_user_without_a_database_and_returns_private_json(): void
    {
        $this->sequence([$this->token(), ['files' => []]]);
        $response = (new TorPhotoController($this->photos))->show('42');
        self::assertSame(200, $response->getStatusCode());
        self::assertSame(['photoUrl' => '', 'fileId' => null], $response->getData(true));
        self::assertStringContainsString('private', $response->headers->get('Cache-Control'));
        self::assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }

    public function test_controller_does_not_convert_unknown_users_into_provider_errors(): void
    {
        $this->expectException(ModelNotFoundException::class);
        try { (new TorPhotoController($this->photos))->show('999'); }
        finally { Http::assertNothingSent(); }
    }

    public function test_controller_does_not_swallow_laravel_upload_validation_errors(): void
    {
        $request = TorPhotoValidatedRequest::create('/test', 'POST', ['fileId' => 'other_photo', 'folder' => 'other_folder']);
        $this->expectException(ValidationException::class);
        try { (new TorPhotoController($this->photos))->store($request, '42'); }
        finally { Http::assertNothingSent(); }
    }

    public function test_controller_valid_upload_ignores_client_file_and_folder_ids(): void
    {
        $request = TorPhotoValidatedRequest::create('/test', 'POST', ['fileId' => 'other_photo', 'folder' => 'other_folder'], [], ['photo' => $this->image()]);
        $this->sequence([$this->token(), $this->folder(), ['files' => [$this->record()]], ['id' => 'photo_test']]);
        $response = (new TorPhotoController($this->photos))->store($request, '42');
        self::assertSame(200, $response->getStatusCode());
        self::assertSame('photo_test', $response->getData(true)['fileId']);
        Http::assertNotSent(fn (HttpRequest $request) => str_contains($request->url(), 'other_photo') || str_contains($request->body(), 'other_folder'));
    }

    public function test_controller_sanitizes_provider_response_and_returns_config_failure_as_503(): void
    {
        config(['services.google.folder_id' => '']);
        $response = (new TorPhotoController($this->photos))->show('42');
        self::assertSame(503, $response->getStatusCode());
        self::assertSame(['message'], array_keys($response->getData(true)));
        self::assertStringNotContainsString('root_test', $response->getContent());
        self::assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
        Http::assertNothingSent();
    }

    public function test_compact_jpeg_and_webp_images_are_accepted_with_their_real_mime_types(): void
    {
        foreach (['jpg' => 'image/jpeg', 'webp' => 'image/webp'] as $extension => $mime) {
            Http::swap(new Factory);
            Http::preventStrayRequests();
            $this->sequence([$this->token(), $this->folder(), ['files' => []], ['id' => 'new_photo']]);
            $result = $this->photos->store(42, $this->image(480, 480, $extension));
            self::assertStringStartsWith('data:' . $mime . ';base64,', $result['photoUrl']);
            Http::assertSent(function (HttpRequest $request) use ($mime) {
                if (! str_contains($request->url(), '/upload/')) return false;
                self::assertSame($mime, $this->metadata($request)['mimeType']);
                return true;
            });
        }
    }

    public function test_connection_failure_does_not_expose_the_provider_message(): void
    {
        Http::fake(['*' => Http::failedConnection('provider-secret connection details')]);
        $this->failure(fn () => $this->photos->show(42));
    }

    public function test_controller_hides_oauth_response_bodies_and_returns_502(): void
    {
        $this->sequence([['__status' => 401, 'body' => 'provider-secret invalid refresh token']]);
        $response = (new TorPhotoController($this->photos))->show('42');
        self::assertSame(502, $response->getStatusCode());
        self::assertStringNotContainsString('provider-secret', $response->getContent());
        self::assertStringNotContainsString('refresh token', $response->getContent());
        self::assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
    }

    public function test_get_rejects_an_image_whose_real_mime_differs_from_drive_metadata(): void
    {
        $this->sequence([$this->token(), $this->folder(), ['files' => [$this->record()]], $this->bytes($this->image(type: 'jpg'))]);
        $this->failure(fn () => $this->photos->show(42));
    }
    public function test_photo_routes_share_registrar_auth_middleware_and_numeric_student_ids(): void
    {
        $router = new Router(new Dispatcher($this->app), $this->app);
        $this->app->instance('router', $router);
        require dirname(__DIR__, 2) . '/routes/RegistrarRoute.php';
        $router->getRoutes()->refreshNameLookups();
        foreach (['show' => 'GET', 'store' => 'POST', 'destroy' => 'DELETE'] as $action => $method) {
            $route = $router->getRoutes()->getByName('permanent-record.photo.' . $action);
            self::assertNotNull($route);
            self::assertContains($method, $route->methods());
            self::assertSame('permanent-record/student/{id}/photo', $route->uri());
            self::assertSame(['auth', 'maintenance', 'role:registrar'], $route->gatherMiddleware());
            self::assertSame('[0-9]+', $route->wheres['id']);
        }
    }
}

/** Exercises Eloquent findOrFail without ever opening a PDO connection. */
class TorPhotoFakeConnection extends Connection
{
    public function __construct()
    {
        parent::__construct(fn () => throw new RuntimeException('Tests must not open a database connection.'));
    }

    public function select($query, $bindings = [], $useReadPdo = true)
    {
        return (string) ($bindings[0] ?? '') === '42' ? [['id' => 42]] : [];
    }
}

class TorPhotoValidatedRequest extends Request
{
    public function validate(array $rules): array
    {
        return Container::getInstance()->make('validator')->make($this->all(), $rules)->validate();
    }
}

