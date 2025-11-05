import React, { useState, useEffect, useRef } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, usePage, router } from "@inertiajs/react";
import axios from "axios";
import {
  Card, CardHeader, CardContent
} from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription,
} from "@/Components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronRight } from "lucide-react";

function StudentQuestionnaire() {
  const {
    evaluation,
    criteria = [],
    isPreview = false,
    answers: initialAnswers = {},
    feedback = null,
  } = usePage().props;

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
  const dragOffset = useRef({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 100 });

  const [openSections, setOpenSections] = useState(() =>
    Object.fromEntries(criteria.map((c) => [c.id, true]))
  );

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

  // Load answers from DB
  useEffect(() => {
    if (isPreview) {
      setAnswers(initialAnswers || {});
      setStrengths(feedback?.strengths || "");
      setWeaknesses(feedback?.weaknesses || "");
      setAnonymous(feedback?.anonymous || false);
      return;
    }

    axios
      .get(`/student/evaluation/draft/${evaluation.evaluation_id}/${evaluation.student_subject_id}`)
      .then((res) => {
        const draft = res.data;
        if (draft) {
          setAnswers(draft.answers || {});
          setStrengths(draft.strengths || "");
          setWeaknesses(draft.weaknesses || "");
          setAnonymous(draft.anonymous || false);
        }
      })
      .catch((err) => console.error("Failed to load draft", err));
  }, [evaluation.evaluation_id, evaluation.student_subject_id, isPreview]);

  // Auto-save unless preview
  useEffect(() => {
    if (isPreview) return;

    const timeout = setTimeout(() => {
      if (answeredCount > 0 || strengths || weaknesses) {
        axios
          .post(route("student.evaluation.draft.save"), {
            evaluation_id: evaluation.evaluation_id,
            student_subject_id: evaluation.student_subject_id,
            answers,
            strengths,
            weaknesses,
            anonymous,
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
    if (!isPreview) {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
    }
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
          axios.delete(`/student/evaluation/draft/${evaluation.evaluation_id}/${evaluation.student_subject_id}`);
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

  const toggleAll = (expand = true) => {
    setOpenSections(Object.fromEntries(criteria.map((c) => [c.id, expand])));
  };

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
          <p className="font-medium">
            Faculty: <span className="font-bold">{evaluation.instructor_first_name} {evaluation.instructor_last_name}</span>
          </p>
          <p className="font-medium">
            Subject: <span className="font-bold">{evaluation.subject_code} - {evaluation.subject_title}</span>
          </p>
        </div>

        <div className="relative border border-blue-200 dark:border-blue-700 rounded p-4 bg-blue-50 dark:bg-blue-900 shadow">
          <h2 className="absolute -top-3 left-4 px-6 bg-blue-50 dark:bg-blue-900 text-blue-700 text-large font-semibold">
            Rating Legend
          </h2>
          <div className="mt-2 font-bold grid grid-cols-5 gap-4 text-sm text-gray-800 dark:text-gray-200 text-center">
            <span>5 - Strongly Agree</span>
            <span>4 - Agree</span>
            <span>3 - Neutral</span>
            <span>2 - Disagree</span>
            <span>1 - Strongly Disagree</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full">
          <div className="flex-1">
            <div className="text-sm mb-1">
              Progress: {answeredCount} / {totalQuestions} questions,
              {strengths ? " ✓ Strengths," : " ✗ Strengths,"}
              {weaknesses ? " ✓ Weaknesses" : " ✗ Weaknesses"}
            </div>
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-3 bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <Button variant="outline" className="flex items-center gap-2" onClick={() => {
            const anyClosed = Object.values(openSections).some((isOpen) => !isOpen);
            toggleAll(anyClosed);
          }}>
            {Object.values(openSections).some((isOpen) => !isOpen) ? (
              <>
                <ChevronRight className="w-4 h-4" />
                Expand All
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Collapse All
              </>
            )}
          </Button>
        </div>

        <div
          ref={dragRef}
          className="fixed z-50 group cursor-move"
          style={{ left: dragPos.x, top: dragPos.y, width: "56px", height: "56px" }}
          title={`${progressPercent}% Complete`}
        >
          <div className="relative w-14 h-14">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845a15.9155 15.9155 0 1 1 0 31.831a15.9155 15.9155 0 1 1 0 -31.831"
                fill="none" stroke="currentColor" strokeWidth="3"
                className="text-gray-300 dark:text-gray-700" />
              <path d="M18 2.0845a15.9155 15.9155 0 1 1 0 31.831a15.9155 15.9155 0 1 1 0 -31.831"
                fill="none" stroke="currentColor" strokeWidth="3"
                strokeDasharray="100" strokeDashoffset={100 - progressPercent}
                strokeLinecap="round"
                className="text-blue-500 transition-all duration-300" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-blue-700 group-hover:scale-110 transition-transform">
              {progressPercent}%
            </div>
          </div>
        </div>

        {criteria.map((c) => (
          <Card key={c.id} className="border dark:border-gray-700">
            <CardHeader
              className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-t space-y-2"
              onClick={() => setOpenSections(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
            >
              <div className="flex justify-between items-center cursor-pointer">
                <h2 className="font-bold text-lg">{c.title}</h2>
                <span>{openSections[c.id] ? "−" : "+"}</span>
              </div>
              <div className="grid grid-cols-[1fr_repeat(5,_4rem)] items-center bg-gray-200 dark:bg-gray-700 rounded px-2 py-1 text-sm font-semibold">
                <span></span>
                {[5, 4, 3, 2, 1].map((num) => (
                  <span key={num} className="text-center">{num}</span>
                ))}
              </div>
            </CardHeader>
            {openSections[c.id] && (
              <CardContent className="pt-4">
                {c.questions.map((q, index) => (
                  <div key={q.id} className="grid grid-cols-[1fr_repeat(5,_4rem)] items-center border-b dark:border-gray-600 py-3">
                    <p className="font-medium pl-2">{index + 1}. {q.question_text}</p>
                    {[5, 4, 3, 2, 1].map((opt) => (
                      <div key={opt} className="flex justify-center px-2">
                        <input
                          type="radio"
                          name={`question_${q.id}`}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() => handleAnswerChange(q.id, opt)}
                          disabled={isPreview}
                          title={ratingDescriptions[opt]}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        ))}

        <div className="flex flex-col md:flex-row gap-6 mt-4">
          <div className="w-full">
            <label className="font-medium mb-2 block">Strengths</label>
            <textarea
              ref={strengthsRef}
              className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-600"
              rows="3"
              value={strengths}
              onChange={(e) => !isPreview && setStrengths(e.target.value)}
              disabled={isPreview}
            />
          </div>
          <div className="w-full">
            <label className="font-medium mb-2 block">Weaknesses</label>
            <textarea
              ref={weaknessesRef}
              className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-600"
              rows="3"
              value={weaknesses}
              onChange={(e) => !isPreview && setWeaknesses(e.target.value)}
              disabled={isPreview}
            />
          </div>
        </div>

        <div className="flex items-center mt-4">
          <input
            id="anonymous"
            type="checkbox"
            checked={anonymous}
            onChange={(e) => !isPreview && setAnonymous(e.target.checked)}
            className="mr-2"
            disabled={isPreview}
          />
          <label htmlFor="anonymous" className="text-sm">Submit anonymously</label>
        </div>

        {!isPreview && (
          <>
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
          </>
        )}
      </div>
    </>
  );
}

StudentQuestionnaire.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;

export default StudentQuestionnaire;
