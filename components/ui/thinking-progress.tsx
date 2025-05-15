"use client"

import React, { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { TypewriterText } from "@/components/ui/typewriter-text"
import { CheckCircle, Loader2, AlertCircle } from "lucide-react"

export interface ProgressStep {
  id: string;
  label: string;
  details?: string; // Restored static details field
  // duration is no longer used for core logic but can be kept for initial display if needed
  duration?: number;
}

export type StepStatus = "pending" | "in_progress" | "completed" | "error";

interface ThinkingProgressProps {
  steps: ProgressStep[];
  title?: string;
  activeStepId?: string | null;
  stepMessages?: Record<string, string | null>; // Dynamic messages for steps
  stepStatuses?: Record<string, StepStatus>; // Status of each step
  overallProgress?: number; // 0-100, controlled by parent
  isGlobalError?: boolean; // Indicates a general error not tied to a specific step
  globalErrorMessage?: string;
}

const ThinkingProgress: React.FC<ThinkingProgressProps> = ({
  steps,
  title = "Processing...",
  activeStepId = null,
  stepMessages = {},
  stepStatuses = {},
  overallProgress = 0,
  isGlobalError = false,
  globalErrorMessage = "An error occurred. Please try again.",
}) => {
  // No internal state for currentStepIndex or completedSteps anymore
  // These are now derived from props (activeStepId, stepStatuses)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.map((step) => {
            const status = stepStatuses[step.id] || "pending";
            const isActive = step.id === activeStepId && status === "in_progress";
            const isCompleted = status === "completed";
            const hasError = status === "error";
            const message = stepMessages[step.id] || null;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-start space-x-3 p-3 rounded-lg transition-all duration-300",
                  isActive ? "bg-primary/10" : "",
                  isCompleted ? "bg-green-500/10" : "",
                  hasError ? "bg-destructive/10" : "bg-muted/50" // Default background for pending
                )}
              >
                <div className="flex-shrink-0 pt-1">
                  {isCompleted && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {isActive && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                  {hasError && <AlertCircle className="h-5 w-5 text-destructive" />}
                  {status === "pending" && <div className="h-5 w-5 rounded-full bg-muted-foreground/30" />}
                </div>
                <div className="flex-grow min-w-0"> {/* Added min-w-0 for better text wrapping */}
                  <p
                    className={cn(
                      "font-semibold truncate", // Added truncate
                      isActive ? "text-primary" : "",
                      isCompleted ? "text-green-600" : "",
                      hasError ? "text-destructive" : "text-foreground/80" // Default for pending
                    )}
                  >
                    {isActive && message ? ( // Show dynamic message if active and available
                      <TypewriterText text={message} speed={30} key={message} /> // Key to re-trigger typewriter on message change
                    ) : isActive ? (
                      <TypewriterText text={step.label} speed={30} key={step.label}/>
                    ) : (
                      step.label
                    )}
                  </p>
                  {/* Show dynamic message if available, otherwise fallback to static step.details */}
                  {(message || step.details) && (isActive || isCompleted || hasError) && (
                     <p className="text-sm text-muted-foreground mt-0.5">{message || step.details}</p>
                  )}
                  {!isActive && !isCompleted && !hasError && !step.details && !message && (
                     <Skeleton className="h-4 w-3/4 mt-1" />
                  )}
                </div>
              </div>
            );
          })}
          {steps.length > 0 && (
            <div className="pt-4">
              <Progress value={overallProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center mt-2">
                {Math.round(overallProgress)}% complete
              </p>
            </div>
          )}
          {isGlobalError && (
            <div className="text-center text-destructive p-3 bg-destructive/10 rounded-md mt-2">
              <p className="font-semibold">{globalErrorMessage}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export { ThinkingProgress };
