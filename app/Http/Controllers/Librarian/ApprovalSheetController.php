<?php

namespace App\Http\Controllers\Librarian;

use App\Http\Controllers\Controller;
use App\Models\EnrolledStudent;
use App\Http\Services\GoogleDriveService;
use App\Models\ApprovalSheet;
use App\Models\GraduationRequirement;
use App\Models\StudentApprovalSheet;
use App\Models\StudentMemorandumOfAgreement;
use App\Models\StudentOjtCertificate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Chart\Title;

class ApprovalSheetController extends Controller
{
    protected $drive;

    public function __construct(GoogleDriveService $drive)
    {
        $this->drive = $drive;
    }

    public function storeApprovalSheet(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf|max:10240', // 10MB max
            'title' => 'required|string|max:255',
            'student_ids' => 'required|json',
            'school_year_id' => 'required|exists:school_years,id',
        ]);

        $accessToken = $this->drive->token();

        $folderId = $this->drive->getOrCreateFolder($accessToken, 'Approval Sheet', config('services.google.folder_id'));

        $file = $request->file('file');
        $mimeType = $file->getMimeType();

        $extension = $file->getClientOriginalExtension();

        $metadata = [
            'name' => $request->title . '-' . time() . '.' . $extension,
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

            $approvalSheet = ApprovalSheet::create([
                'title' => $request->title,
                'file_name' => $metadata['name'],
                'google_id' => $fileId,
                'uploaded_at' => now(),
                'uploader_id' => Auth::id(),
            ]);

            $studentIds = json_decode($request->student_ids);

            foreach ($studentIds as $student) {
                $hasCreated = GraduationRequirement::where('enrolled_student_id', $student)->first();

                if ($hasCreated) {
                    StudentApprovalSheet::create([
                        'approval_sheet_id' => $approvalSheet->id,
                        'graduation_requirement_id' => $hasCreated->id,
                    ]);
                } else {
                    $gradReq = GraduationRequirement::create([
                        'enrolled_student_id' => $student,
                    ]);

                    StudentApprovalSheet::create([
                        'approval_sheet_id' => $approvalSheet->id,
                        'graduation_requirement_id' => $gradReq->id,
                    ]);
                }
            }

            return redirect()->back()->with('success', 'News added successfully!');
        } else {
            return redirect()->back()->with('error', 'Failed to upload file to Google Drive.');
        }
    }

    public function list()
    {
        return Inertia::render("Librarian/ApprovalSheets/list");
    }

    public function searchList(Request $request)
    {
        $searchTerm = $request->input('searchTerm', '');
        $searchType = $request->input('searchType', 'title');
        $page = $request->input('page', 1);
        $perPage = $request->input('perPage', 10);

        $query = ApprovalSheet::with('studentApprovalSheets.graduationRequirement.enrolledStudent.user.information');

        if (!empty($searchTerm)) {
            if ($searchType === 'student') {
                // Search by student name (first_name or last_name)
                $query->whereHas('studentApprovalSheets.graduationRequirement.enrolledStudent.user.information', function ($q) use ($searchTerm) {
                    $q->where(function ($subQ) use ($searchTerm) {
                        $subQ->where('first_name', 'LIKE', "%{$searchTerm}%")
                            ->orWhere('last_name', 'LIKE', "%{$searchTerm}%")
                            ->orWhere('middle_name', 'LIKE', "%{$searchTerm}%");
                    });
                });
            } else {
                // Search by title (default)
                $query->where('title', 'LIKE', "%{$searchTerm}%");
            }
        }

        $query->orderBy('uploaded_at', 'asc');

        $approvalSheets = $query->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'data' => $approvalSheets->items(),
            'currentPage' => $approvalSheets->currentPage(),
            'lastPage' => $approvalSheets->lastPage(),
            'perPage' => $approvalSheets->perPage(),
            'total' => $approvalSheets->total(),
            'hasMore' => $approvalSheets->hasMorePages(),
        ]);
    }
    
    public function upload()
    {
        return Inertia::render("Librarian/ApprovalSheets/uploadApprovalSheet");
    }

    public function searchEnrolledStudents(Request $request)
    {
        $searchTerm = $request->searchTerm;

        return EnrolledStudent::select(
            'enrolled_students.id',
            'first_name',
            'middle_name',
            'last_name',
            'user_id_no',
            'year_level_name',
            'course_name_abbreviation'
        )
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->join('year_level', 'year_level.id', '=', 'year_section.year_level_id')
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->where('school_year_id', '=', $request->schoolYearId)
            ->where(function ($query) use ($searchTerm) {
                $query->where('user_id_no', 'LIKE', "%{$searchTerm}%")
                    ->orWhere('first_name', 'LIKE', "%{$searchTerm}%")
                    ->orWhere('last_name', 'LIKE', "%{$searchTerm}%");
            })
            ->with([
                'GraduationRequirements.studentApprovalSheets' => function ($query) {
                    $query->select('id', 'approval_sheet_id', 'graduation_requirement_id');
                },
                'GraduationRequirements.studentMOAs' => function ($query) {
                    $query->select('id', 'memorandum_of_agreement_id', 'graduation_requirement_id');
                },
                'GraduationRequirements.studentOjtCertificates' => function ($query) {
                    $query->select('id', 'google_id', 'graduation_requirement_id');
                },
            ])
            ->get();
    }

    public function uploadPdf(Request $request) {}

    private function generateGraduationRequirement($studentId)
    {
        $gradReq = GraduationRequirement::create([
            'student_id' => $studentId,
        ]);

        StudentApprovalSheet::create([
            'graduation_requirement_id' => $gradReq->id,
        ]);

        StudentMemorandumOfAgreement::create([
            'graduation_requirement_id' => $gradReq->id,
        ]);

        StudentOjtCertificate::create([
            'graduation_requirement_id' => $gradReq->id,
        ]);

        return $gradReq->id;
    }
}
