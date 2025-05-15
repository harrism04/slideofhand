"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { PracticeSessionWithDetails } from "@/services/practice-service"

interface SessionDetailsDisplayProps {
  session: PracticeSessionWithDetails
  onClose: () => void
}

export function SessionDetailsDisplay({ session, onClose }: SessionDetailsDisplayProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const analysis = session.analysis // Already confirmed to be AnalysisResult | null

  return (
    <Card className="border-3 border-black rounded-xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] h-full flex flex-col">
      <CardHeader className="bg-pink-400 border-b-2 border-black pb-4 flex-row justify-between items-center">
        <div>
          <CardTitle className="text-xl font-bangers text-black">Session Details</CardTitle>
          <CardDescription className="text-black">
            {session.presentation_title} - {formatDate(session.created_at)}
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-black hover:bg-pink-500">
          <X className="h-6 w-6" />
          <span className="sr-only">Close details</span>
        </Button>
      </CardHeader>
      <CardContent className="p-6 space-y-6 flex-grow overflow-y-auto">
        {/* Transcription Section */}
        {session.transcription && (
          <Card className="border-2 border-black rounded-lg">
            <CardHeader className="bg-yellow-300 border-b-2 border-black p-3">
              <CardTitle className="text-md font-bangers text-black">Transcription</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ScrollArea className="h-48 w-full rounded-md border border-gray-300 p-3 bg-white">
                <p className="text-sm whitespace-pre-wrap">{session.transcription.text}</p>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Analysis Section */}
        {analysis && (
          <Card className="border-2 border-black rounded-lg">
            <CardHeader className="bg-purple-300 border-b-2 border-black p-3">
              <CardTitle className="text-md font-bangers text-black">Detailed Analysis</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm font-bangers text-gray-700">Overall Score</p>
                <p className="text-5xl font-black text-purple-600">{analysis.overallScore}%</p>
              </div>

              {/* Pace */}
              <Card className="border border-gray-300 rounded-md">
                <CardHeader className="p-3 bg-blue-100 border-b border-gray-300">
                  <CardTitle className="text-sm font-bold">Pace: {analysis.pace.wpm} WPM</CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span>Score</span>
                    <span>{analysis.pace.score}%</span>
                  </div>
                  <Progress value={analysis.pace.score} className="h-2" />
                  <p className="text-xs text-gray-600 pt-1">{analysis.pace.feedback}</p>
                </CardContent>
              </Card>

              {/* Clarity */}
              <Card className="border border-gray-300 rounded-md">
                <CardHeader className="p-3 bg-green-100 border-b border-gray-300">
                  <CardTitle className="text-sm font-bold">Clarity</CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span>Score</span>
                    <span>{analysis.clarity.score}%</span>
                  </div>
                  <Progress value={analysis.clarity.score} className="h-2 bg-green-500" />
                  <p className="text-xs text-gray-600 pt-1">{analysis.clarity.feedback}</p>
                </CardContent>
              </Card>

              {/* Filler Words */}
              <Card className="border border-gray-300 rounded-md">
                <CardHeader className="p-3 bg-red-100 border-b border-gray-300">
                  <CardTitle className="text-sm font-bold">Filler Words</CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span>Score</span>
                    <span>{analysis.fillerWords.score}%</span>
                  </div>
                  <Progress value={analysis.fillerWords.score} className="h-2 bg-red-500" />
                  {analysis.fillerWords.words.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                      {analysis.fillerWords.words.map((fw) => (
                        <div key={fw.word} className="text-xs p-1.5 bg-red-50 border border-red-200 rounded text-center">
                          <span className="font-semibold">{fw.word}:</span> {fw.count}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-600 pt-1">{analysis.fillerWords.feedback}</p>
                </CardContent>
              </Card>

              {/* Improvement Suggestions */}
              {analysis.improvements && analysis.improvements.length > 0 && (
                <Card className="border border-gray-300 rounded-md">
                  <CardHeader className="p-3 bg-yellow-100 border-b border-gray-300">
                    <CardTitle className="text-sm font-bold">Improvement Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                      {analysis.improvements.map((tip, index) => (
                        <li key={index}>{tip}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        )}
        {!analysis && !session.transcription && (
          <div className="text-center py-10">
            <p className="text-gray-500">No transcription or analysis data available for this session.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
