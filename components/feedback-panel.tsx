import { AlertTriangle, CheckCircle, Info, Volume2, Play, Pause } from "lucide-react"
import type { AnalysisResult } from "@/services/groq-service"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button" // Added
import { useEffect, useRef, useState } from "react" // Added

interface FeedbackPanelProps {
  feedbackData?: AnalysisResult | null
  audioBlob?: Blob | null // Added
  recordingDuration?: number // Added (total duration of the recording)
}

export function FeedbackPanel({ feedbackData, audioBlob, recordingDuration }: FeedbackPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null) // Changed to HTMLAudioElement

  // Default data if no analysis is provided
  const defaultData: AnalysisResult = {
    overallScore: 78,
    pace: {
      score: 85,
      feedback: "Good pace overall. Slightly fast in the middle section.",
      wpm: 125,
    },
    clarity: {
      score: 72,
      feedback: "Clear pronunciation, but some words were rushed.",
    },
    fillerWords: {
      score: 68,
      feedback: "Used 'um' and 'like' frequently. Try pausing instead.",
      words: [
        { word: "um", count: 8 },
        { word: "like", count: 6 },
        { word: "you know", count: 3 },
      ],
    },
    // engagement: { // REMOVED
    //   score: 90,
    //   feedback: "Excellent energy and enthusiasm throughout.",
    // },
    improvements: [], // Default to empty array, actual improvements come from feedbackData
  }

  // Use provided data or default
  const data = feedbackData || defaultData
  const displayImprovements = feedbackData?.improvements && feedbackData.improvements.length > 0 
    ? feedbackData.improvements 
    : (feedbackData ? ["No specific improvement areas identified for this session."] : defaultData.improvements);


  // Audio playback logic integrated directly
  useEffect(() => {
    if (audioBlob && audioRef.current) {
      audioRef.current.src = URL.createObjectURL(audioBlob)
      audioRef.current.load()
      audioRef.current.onloadedmetadata = () => {
        if (audioRef.current) {
          const newAudioDuration = audioRef.current.duration;
          if (isFinite(newAudioDuration) && newAudioDuration > 0) {
            setDuration(newAudioDuration);
          } else if (recordingDuration && isFinite(recordingDuration) && recordingDuration > 0) {
            setDuration(recordingDuration);
          } else {
            setDuration(0);
          }
        }
        setCurrentTime(0);
        setIsPlaying(false);
      };
    } else if (audioRef.current) {
      audioRef.current.src = ""
      setDuration(0)
      setCurrentTime(0)
      setIsPlaying(false)
    }
  }, [audioBlob, recordingDuration])

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play().catch(error => console.error("Error playing audio:", error));
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const time = Number(event.target.value)
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }
  
  const handleAudioEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0) // Optionally reset to start
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="flex items-center justify-between p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <div>
          <h3 className="font-bold text-lg">Overall Performance</h3>
          <p className="text-sm text-gray-600">Based on pace, clarity, and delivery</p>
        </div>
        <div className="text-center">
          <div className="text-4xl font-black">{data.overallScore}%</div>
          <div className="text-xs text-green-600">+5% from last time</div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white border-2 border-black rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold">Speaking Pace</h4>
            <div className="text-lg font-bold">{data.pace.score}%</div>
          </div>
          <Progress value={data.pace.score} className="h-2 mb-2" />
          <p className="text-sm text-gray-600 mb-2">{data.pace.feedback}</p>
          <div className="flex items-center text-sm bg-yellow-100 p-2 rounded">
            <Info className="h-4 w-4 mr-2 text-yellow-600" />
            <span>{data.pace.wpm} words per minute (ideal: 120-150)</span>
          </div>
        </div>

        <div className="p-4 bg-white border-2 border-black rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold">Clarity</h4>
            <div className="text-lg font-bold">{data.clarity.score}%</div>
          </div>
          <Progress value={data.clarity.score} className="h-2 mb-2" />
          <p className="text-sm text-gray-600 mb-2">{data.clarity.feedback}</p>
        </div>

        <div className="p-4 bg-white border-2 border-black rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold">Filler Words</h4>
            <div className="text-lg font-bold">{data.fillerWords.score}%</div>
          </div>
          <Progress value={data.fillerWords.score} className="h-2 mb-2" />
          <p className="text-sm text-gray-600 mb-2">{data.fillerWords.feedback}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {data.fillerWords.words.map((item, index) => (
              <div
                key={index}
                className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs flex items-center gap-1"
              >
                <span>{item.word}</span>
                <span className="bg-white px-1 rounded-full">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Engagement section removed */}
        {/* <div className="p-4 bg-white border-2 border-black rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold">Engagement</h4>
            <div className="text-lg font-bold">{data.engagement?.score || 0}%</div>
          </div>
          <Progress value={data.engagement?.score || 0} className="h-2 mb-2" />
          <p className="text-sm text-gray-600 mb-2">{data.engagement?.feedback || "N/A"}</p>
          <div className="flex items-center text-sm bg-green-100 p-2 rounded">
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
            <span>Excellent energy and enthusiasm throughout</span>
          </div>
        </div> */}
      </div>

      {/* Improvement Areas */}
      <div className="p-4 bg-white border-2 border-black rounded-lg">
        <h4 className="font-bold mb-3">Areas for Improvement</h4>
        <div className="space-y-2">
          {displayImprovements.map((item, index) => (
            <div key={index} className="flex items-start">
              <AlertTriangle className="h-4 w-4 mr-2 text-yellow-600 mt-0.5" />
              <p className="text-sm">{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Audio Playback */}
      {audioBlob && (
        <div className="p-4 bg-white border-2 border-black rounded-lg">
          <h4 className="font-bold mb-3">Audio Playback</h4>
          <div className="flex items-center gap-4">
            <Button
              onClick={togglePlayPause}
              className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600"
              aria-label={isPlaying ? "Pause" : "Play"}
              disabled={!audioBlob}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max={duration || recordingDuration || 0}
                value={currentTime}
                onChange={handleSeek}
                disabled={!audioBlob}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-xs mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration || recordingDuration || 0)}</span>
              </div>
            </div>
          </div>
          {audioBlob && <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={handleAudioEnded} />}
        </div>
      )}
    </div>
  )
}

// Helper function to format time (MM:SS)
const formatTime = (timeInSeconds: number) => {
  const minutes = Math.floor(timeInSeconds / 60)
  const seconds = Math.floor(timeInSeconds % 60)
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
}

// Removed useAudioPlayback, useAudioControls, and FeedbackPanelWithHooks
// as their logic is now integrated into the main FeedbackPanel component.
