<?php

namespace App\Http\Controllers\Curriculum;

use App\Http\Controllers\Controller;
use App\Models\Faculty;
use App\Services\SubjectGroups;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

/**
 * Curriculum > Same subjects: subject codes a program head confirmed are the same
 * subject. Every change answers with the page's fresh data.
 */
class SubjectGroupController extends Controller
{
    public function __construct(private SubjectGroups $groups)
    {
    }

    public function view()
    {
        return Inertia::render('Curriculum/SubjectGroups');
    }

    public function data(Request $request)
    {
        return response()->json($this->groups->overview($this->departmentId($request)));
    }

    public function create(Request $request)
    {
        $validated = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'subject_ids' => ['required', 'array', 'min:2', 'max:50'],
            'subject_ids.*' => ['integer', 'distinct', 'exists:subjects,id'],
        ], [
            'subject_ids.min' => 'Choose at least two subjects.',
        ])->validate();

        $this->groups->create($validated['name'], $validated['subject_ids'], $request->user()->id, $this->requireDepartment($request));

        return $this->data($request);
    }

    public function addMembers(Request $request, int $group)
    {
        $validated = Validator::make($request->all(), [
            'subject_ids' => ['required', 'array', 'min:1', 'max:50'],
            'subject_ids.*' => ['integer', 'distinct', 'exists:subjects,id'],
        ])->validate();

        $this->groups->addMembers($group, $validated['subject_ids'], $request->user()->id, $this->requireDepartment($request));

        return $this->data($request);
    }

    public function removeMember(Request $request, int $group)
    {
        $validated = Validator::make($request->all(), [
            'subject_id' => ['required', 'integer'],
        ])->validate();

        $this->groups->removeMember($group, (int) $validated['subject_id'], $request->user()->id, $this->requireDepartment($request));

        return $this->data($request);
    }

    public function rename(Request $request, int $group)
    {
        $validated = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
        ])->validate();

        $this->groups->rename($group, $validated['name'], $request->user()->id, $this->requireDepartment($request));

        return $this->data($request);
    }

    public function destroy(Request $request, int $group)
    {
        $this->groups->delete($group, $this->requireDepartment($request));

        return $this->data($request);
    }

    public function dismiss(Request $request)
    {
        $validated = Validator::make($request->all(), [
            'key' => ['required', 'string', 'max:255'],
            'subject_ids' => ['required', 'array', 'min:1', 'max:50'],
            'subject_ids.*' => ['integer', 'distinct', 'exists:subjects,id'],
        ])->validate();

        $this->groups->dismiss($validated['key'], $validated['subject_ids'], $request->user()->id, $this->requireDepartment($request));

        return $this->data($request);
    }

    public function restore(Request $request)
    {
        $validated = Validator::make($request->all(), [
            'key' => ['required', 'string', 'max:255'],
        ])->validate();

        $this->groups->restore($validated['key'], $this->requireDepartment($request));

        return $this->data($request);
    }

    private function departmentId(Request $request): ?int
    {
        $user = $request->user();
        $departmentId = $user ? Faculty::where('faculty_id', $user->id)->value('department_id') : null;

        return $departmentId === null ? null : (int) $departmentId;
    }

    private function requireDepartment(Request $request): int
    {
        return $this->departmentId($request)
            ?? throw new AuthorizationException('Only a program head with a department can change subject groups.');
    }
}
