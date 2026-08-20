"use client";

import { useState } from "react";
import { generateAiDraft } from "@/app/actions/generate-draft";
import { publishReplyAndLog } from "@/app/actions/publish-reply";
import {
    Sparkles,
    Send,
    Star,
    CheckCircle2,
    AlertCircle,
    Database,
} from "lucide-react";

// Mock review to test our Tracer Bullet
const MOCK_REVIEW = {
    id: "google_rev_98765",
    customerName: "Sarah Jenkins",
    rating: 2,
    comment:
        "The coffee was cold and we waited 25 minutes for our breakfast sandwich. Very disappointing service today.",
    businessName: "Artisan Cafe & Bakery",
};

export default function TestAiPage() {
    const [tone, setTone] = useState<string>("apologetic");
    const [language, setLanguage] = useState<string>("en");
    const [aiDraft, setAiDraft] = useState<string>("");
    const [editedDraft, setEditedDraft] = useState<string>("");
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [isPublishing, setIsPublishing] = useState<boolean>(false);
    const [isPublished, setIsPublished] = useState<boolean>(false);
    const [wasEdited, setWasEdited] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleGenerateDraft = async () => {
        setIsGenerating(true);
        setErrorMessage(null);
        setIsPublished(false);

        const result = await generateAiDraft({
            reviewComment: MOCK_REVIEW.comment,
            rating: MOCK_REVIEW.rating,
            businessName: MOCK_REVIEW.businessName,
            tone,
            language,
        });

        if (result.success && result.draft) {
            setAiDraft(result.draft);
            setEditedDraft(result.draft);
        } else {
            setErrorMessage(result.error || "Failed to generate draft.");
        }
        setIsGenerating(false);
    };

    const handlePublish = async () => {
        if (!editedDraft.trim()) return;
        setIsPublishing(true);
        setErrorMessage(null);

        const result = await publishReplyAndLog({
            googleReviewId: MOCK_REVIEW.id,
            authorName: MOCK_REVIEW.customerName,
            rating: MOCK_REVIEW.rating,
            comment: MOCK_REVIEW.comment,
            businessName: MOCK_REVIEW.businessName,
            selectedTone: tone,
            aiGeneratedDraft: aiDraft,
            finalPublishedText: editedDraft,
        });

        if (result.success) {
            setIsPublished(true);
            setWasEdited(result.isEdited ?? false);
        } else {
            setErrorMessage(result.error || "Failed to save to Supabase.");
        }
        setIsPublishing(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-3">
                        <Sparkles className="w-3.5 h-3.5" />
                        Tracer Bullet Test Mode (AI + Supabase DB)
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        Review AI Draft Generator
                    </h1>
                    <p className="text-slate-600 mt-1">
                        Test generating drafts and saving human-in-the-loop
                        edits to Supabase.
                    </p>
                </div>

                {/* Mock Review Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center">
                                {MOCK_REVIEW.customerName.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">
                                    {MOCK_REVIEW.customerName}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Google Maps Review
                                </p>
                            </div>
                        </div>
                        {/* Star Rating */}
                        <div className="flex items-center gap-1 text-amber-500">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`w-4 h-4 ${
                                        star <= MOCK_REVIEW.rating
                                            ? "fill-amber-400 text-amber-400"
                                            : "text-slate-200"
                                    }`}
                                />
                            ))}
                        </div>
                    </div>

                    <p className="text-slate-800 bg-slate-50 p-4 rounded-lg italic border border-slate-100">
                        &quot;{MOCK_REVIEW.comment}&quot;
                    </p>

                    {/* Controls: Tone & Language */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Tone of Voice
                            </label>
                            <select
                                value={tone}
                                onChange={(e) => setTone(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="apologetic">
                                    Apologetic & Empathetic
                                </option>
                                <option value="professional">
                                    Professional & Formal
                                </option>
                                <option value="friendly">
                                    Friendly & Warm
                                </option>
                                <option value="casual">Casual & Direct</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Response Language
                            </label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="en">English</option>
                                <option value="es">Spanish (Español)</option>
                                <option value="de">German (Deutsch)</option>
                                <option value="pt">
                                    Portuguese (Português)
                                </option>
                                <option value="tr">Turkish (Türkçe)</option>
                            </select>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={handleGenerateDraft}
                        disabled={isGenerating}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Sparkles className="w-4 h-4" />
                        {isGenerating
                            ? "AI is Drafting Response..."
                            : "AI ile Taslak Hazırla"}
                    </button>
                </div>

                {/* Error Alert */}
                {errorMessage && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">Operation Failed</p>
                            <p>{errorMessage}</p>
                        </div>
                    </div>
                )}

                {/* AI Draft Editor Section */}
                {aiDraft && (
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">
                                <Sparkles className="w-4 h-4 text-indigo-600" />
                                AI Generated Draft (Editable)
                            </h3>
                            <span className="text-xs text-slate-500">
                                Edit before publishing
                            </span>
                        </div>

                        <textarea
                            rows={4}
                            value={editedDraft}
                            onChange={(e) => setEditedDraft(e.target.value)}
                            className="w-full p-3 border border-slate-300 rounded-lg text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed"
                        />

                        <div className="flex items-center justify-between pt-2">
                            <p className="text-xs text-slate-500">
                                Human-in-the-loop: Edit any word above before
                                posting.
                            </p>
                            <button
                                onClick={handlePublish}
                                disabled={isPublishing || isPublished}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2 rounded-lg transition text-sm flex items-center gap-2 disabled:opacity-50"
                            >
                                {isPublished ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        Saved to Supabase!
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        {isPublishing
                                            ? "Saving..."
                                            : "Yanıtla & Yayınla"}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Success Banner */}
                {isPublished && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-900 text-sm">
                        <Database className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">
                                Saved & Logged to Supabase Database!
                            </p>
                            <p className="text-emerald-700 text-xs mt-0.5">
                                Feedback Status:{" "}
                                <span className="font-bold">
                                    {wasEdited
                                        ? "User Edited AI Draft (Diff logged)"
                                        : "User Accepted AI Draft As-Is"}
                                </span>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
