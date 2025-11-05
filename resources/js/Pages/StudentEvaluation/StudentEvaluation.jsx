import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, router } from "@inertiajs/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import { Badge } from "@/Components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";

export default function Dashboard() {
  const { evaluations } = usePage().props;

  const hasEvaluation = evaluations.length > 0;
  const firstEval = hasEvaluation ? evaluations[0] : null;

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-green-500 text-white";
      case "pending":
        return "bg-yellow-400 text-white";
      case "closed":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-300 text-black";
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      router.reload({ only: ["evaluations"], preserveScroll: true });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AuthenticatedLayout>
      <Head title="Faculty Evaluation" />

      <div className="max-w-7xl mx-auto px-4 mb-6">
        {firstEval && (
          <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-4 rounded shadow flex flex-col md:flex-row md:justify-between md:items-center gap-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                School Year: {firstEval.start_year} - {firstEval.end_year}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Semester: {firstEval.semester_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Evaluation Period:
                <span className="font-medium text-gray-800 dark:text-white ml-1">
                  {new Date(firstEval.start_date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  to{" "}
                  {new Date(firstEval.end_date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </p>
              <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                <span>Status:</span>
                <Badge
                  variant="outline"
                  className={`ml-2 px-2 py-1 rounded ${getStatusColor(firstEval.status)}`}
                >
                  {firstEval.status}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          {!hasEvaluation ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 p-4 rounded shadow mb-6">
              <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
                No evaluations available at the moment. Please check back later.
              </p>
            </div>
          ) : firstEval?.status === "active" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {evaluations.map((evaluation, index) => {
                const progress = evaluation.has_submitted ? 100 : evaluation.progress ?? 0;

                return (
                  <Card key={index} className="shadow-md">
                    <CardHeader>
                      <CardTitle className="flex justify-between items-center">
                        {evaluation.instructor_first_name} {evaluation.instructor_last_name}
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{evaluation.status}</Badge>
                          {evaluation.has_submitted && (
                            <div
                              className="flex items-center gap-1 text-green-600 dark:text-green-400"
                              title="Evaluation Completed"
                            >
                              <CheckCircle2 size={18} />
                              <span className="text-sm font-semibold">Completed</span>
                            </div>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 dark:text-gray-300 mb-2">
                        Subject: {evaluation.subject_title} ({evaluation.subject_code})
                      </p>

                      {/* Progress Bar */}
                      <div className="relative w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full mb-4 overflow-hidden">
                        <div
                          className="absolute left-0 top-0 h-full bg-blue-500 text-white text-xs font-semibold flex items-center justify-center transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        >
                          {progress > 10 && `${progress}%`}
                        </div>
                        {progress <= 10 && (
                          <span className="absolute right-2 top-0 text-xs text-gray-700 dark:text-gray-200 h-full flex items-center">
                            {progress}%
                          </span>
                        )}
                      </div>

                      {/* Action Button */}
                      {evaluation.has_submitted ? (
                       <Button
                        variant="outline"
                        onClick={() =>
                            router.get(
                            route("student.eval_question_preview", {
                                evaluationId: evaluation.evaluation_id,
                                studentSubjectId: evaluation.student_subject_id,
                            })
                            )
                        }
                        >
                        Preview Evaluation
                        </Button>

                      ) : (
                        <Button
                          onClick={() =>
                            router.get(
                              route("student.eval_question", {
                                id: evaluation.student_subject_id,
                              })
                            )
                          }
                        >
                          Start Evaluation
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
              {firstEval?.status === "closed" && "The evaluation is closed."}
              {firstEval?.status === "pending" && "The evaluation will come soon."}
            </p>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
