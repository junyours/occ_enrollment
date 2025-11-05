import React, { useState, useEffect, useRef } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, router } from "@inertiajs/react";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardContent,
} from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/Components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

function StudentQuestionnaire() {
  const { evaluation, criteria = [] } = usePage().props;
  const { toast } = useToast();

  const [answers, setAnswers] = useState({});
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strengthsRef = useRef(null);
  const weaknessesRef = useRef(null);
  const dragRef = useRef(null);

  const [dragPos, setDragPos] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 100 });
  const dragOffset = useRef({ x: 0, y: 0 });

  const totalQuestions = criteria.reduce((sum, c) => sum + c.questions.length, 0);
  const answeredCount = Object.keys(answers).length;
  const filledExtras = strengths.trim() !== "" && weaknesses.trim() !== "";
  const progressPercent = totalQuestions > 0
    ? Math.round(((answeredCount + (filledExtras ? 2 : 0)) / (totalQuestions + 2)) * 100)
    : 0;

  const ratingDescriptions = {
    1: "Strongly Disagree",
    2: "Disagree",
    3: "Neutral",
    4: "Agree",
    5: "Strongly Agree",
  };

  const draftFilename = `${evaluation.student_subject_id}_eval${evaluation.evaluation_id}`;

  // Load draft from file
  useEffect(() => {
    axios
      .post("/student/evaluation/draft/load", { filename: draftFilename })
      .then((res) => {
        if (res.data?.data) {
          const parsed = JSON.parse(res.data.data);
          setAnswers(parsed.answers || {});
          setStrengths(parsed.strengths || "");
          setWeaknesses(parsed.weaknesses || "");
          setAnonymous(parsed.anonymous || false);
        }
      })
      .catch((err) => {
        console.error("Failed to load draft", err);
      });
  }, [evaluation.evaluation_id, evaluation.student_subject_id]);

  // Save draft to file
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (answeredCount > 0 || strengths || weaknesses) {
        axios
          .post("/student/evaluation/draft/save", {
            filename: draftFilename,
            data: JSON.stringify({ answers, strengths, weaknesses, anonymous }),
          })
          .then(() => {
            toast({
              title: "Draft Saved",
              description: "Your answers have been saved.",
              position: "top-right",
            });
          })
          .catch(() => {
            toast({
              title: "Error",
              description: "Failed to save draft.",
              variant: "destructive",
              position: "top-right",
            });
          });
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [answers, strengths, weaknesses, anonymous]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    const missing = criteria.flatMap((c) => c.questions.filter((q) => !answers[q.id]));
    if (missing.length > 0) {
      const firstMissing = document.querySelector(`input[name='question_${missing[0].id}']`);
      firstMissing?.scrollIntoView({ behavior: "smooth", block: "center" });
      firstMissing?.focus();
      toast({ title: "Incomplete", description: "Please answer all questions before submitting.", variant: "destructive" });
      return;
    }

    if (!strengths.trim()) {
      strengthsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      strengthsRef.current?.focus();
      toast({ title: "Missing Strengths", description: "Please provide feedback on strengths.", variant: "destructive" });
      return;
    }

    if (!weaknesses.trim()) {
      weaknessesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      weaknessesRef.current?.focus();
      toast({ title: "Missing Weaknesses", description: "Please provide feedback on weaknesses.", variant: "destructive" });
      return;
    }

    setShowConfirm(true);
  };

  const handleSubmitConfirmed = () => {
    setShowConfirm(false);
    setSubmitting(true);
    router.post(
      route("student.evaluation.submit"),
      {
        evaluation_id: evaluation.evaluation_id,
        student_subject_id: evaluation.student_subject_id,
        answers,
        strengths,
        weaknesses,
        anonymous,
      },
      {
        onSuccess: () => {
          // ✅ delete draft file after submission
          axios.post("/student/evaluation/draft/delete", {
            filename: draftFilename,
          });

          toast({
            title: "Evaluation Submitted",
            description: "Your evaluation was successfully submitted.",
            variant: "success",
            position: "top",
          });
        },
        onError: (errors) => {
          toast({
            title: "Submission Failed",
            description: errors.error || "Something went wrong.",
            variant: "destructive",
            position: "top",
          });
        },
        onFinish: () => setSubmitting(false),
      }
    );
  };

  // Floating draggable progress circle
  useEffect(() => {
    const onMouseMove = (e) => {
      setDragPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    const el = dragRef.current;
    if (el) {
      const onMouseDown = (e) => {
        dragOffset.current = {
          x: e.clientX - el.getBoundingClientRect().left,
          y: e.clientY - el.getBoundingClientRect().top,
        };
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      };
      el.addEventListener("mousedown", onMouseDown);
      return () => el.removeEventListener("mousedown", onMouseDown);
    }
  }, []);

  return (
    <>
      <Head title="Faculty Evaluation Questionnaire" />
      <div className="py-12 max-w-7xl mx-auto px-4 space-y-6 dark:bg-gray-900 dark:text-white">
        <h1 className="text-2xl font-bold text-blue-800 dark:text-blue-300 mb-4">Student Evaluation Questionnaire</h1>

        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 p-4 rounded shadow flex justify-between">
          <p className="text-gray-800 dark:text-gray-200 font-medium">
            Faculty: <span className="font-bold">{evaluation.instructor_first_name} {evaluation.instructor_last_name}</span>
          </p>
          <p className="text-gray-800 dark:text-gray-200 font-medium">
            Subject: <span className="font-bold">{evaluation.subject_code} - {evaluation.subject_title}</span>
          </p>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-gray-700 dark:text-gray-200">
            Progress: {answeredCount} / {totalQuestions} questions,
            {strengths ? " ✓ Strengths," : " ✗ Strengths,"}
            {weaknesses ? " ✓ Weaknesses" : " ✗ Weaknesses"}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div
          ref={dragRef}
          className="fixed z-50 group cursor-move"
          style={{ left: dragPos.x, top: dragPos.y, width: "56px", height: "56px" }}
          title={`${progressPercent}% Complete`}
        >
          <div className="relative w-14 h-14">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 1 1 0 31.831 a 15.9155 15.9155 0 1 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-gray-300 dark:text-gray-700"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 1 1 0 31.831 a 15.9155 15.9155 0 1 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray="100"
                strokeDashoffset={100 - progressPercent}
                strokeLinecap="round"
                className="text-blue-500 transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-blue-700 group-hover:scale-110 transition-transform">
              {progressPercent}%
            </div>
          </div>
        </div>

        {criteria.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <div className="grid grid-cols-[1fr_repeat(5,_4rem)] items-center bg-gray-100 dark:bg-gray-700 rounded px-2 py-1">
                <h2 className="font-bold text-lg text-gray-800 dark:text-white">{c.title}</h2>
                {[5, 4, 3, 2, 1].map((num) => (
                  <span key={num} className="text-center text-sm font-semibold text-gray-600 dark:text-gray-300">{num}</span>
                ))}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {c.questions.map((q, index) => (
                <div key={q.id} className="grid grid-cols-[1fr_repeat(5,_4rem)] items-center border-b dark:border-gray-600 py-3">
                  <p className="text-gray-700 dark:text-gray-100 font-medium pl-2">
                    {index + 1}. {q.question_text}
                  </p>
                  {[5, 4, 3, 2, 1].map((opt) => (
                    <div key={opt} className="flex justify-center px-2">
                      <input
                        type="radio"
                        name={`question_${q.id}`}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => handleAnswerChange(q.id, opt)}
                        title={ratingDescriptions[opt]}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        <div className="flex flex-col md:flex-row gap-6 mt-4">
          <div className="w-full">
            <label className="block text-gray-700 dark:text-gray-200 font-medium mb-2">Strengths</label>
            <textarea
              ref={strengthsRef}
              className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              rows="3"
              placeholder="Please provide constructive feedback on the strengths of the faculty member."
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              required
            />
          </div>
          <div className="w-full">
            <label className="block text-gray-700 dark:text-gray-200 font-medium mb-2">Weaknesses</label>
            <textarea
              ref={weaknessesRef}
              className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              rows="3"
              placeholder="Please provide constructive feedback on areas for improvement."
              value={weaknesses}
              onChange={(e) => setWeaknesses(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex items-center mt-4">
          <input
            id="anonymous"
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="anonymous" className="text-sm text-gray-700 dark:text-gray-300">Submit anonymously</label>
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={handleSubmit} disabled={submitting || answeredCount < totalQuestions || !filledExtras}>
            {submitting ? "Submitting..." : "Submit Evaluation"}
          </Button>
        </div>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Submit Evaluation?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to submit this evaluation? You won’t be able to change your answers afterwards.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmitConfirmed} disabled={submitting}>Submit</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

StudentQuestionnaire.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;

export default StudentQuestionnaire;
