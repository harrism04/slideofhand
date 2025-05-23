interface SlidePreviewProps {
  title: string
  content: string
  imageUrl?: string
  slideNumber?: number
  totalSlides?: number
  isFullscreen?: boolean
}

// Helper function to render text with bold formatting
const renderFormattedText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*)/g); // Split by **text**, keeping the delimiter
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

export function SlidePreview({ title, content, imageUrl, slideNumber, totalSlides, isFullscreen }: SlidePreviewProps) {
  const baseFontSize = isFullscreen ? "text-2xl md:text-3xl lg:text-4xl" : "text-lg";
  const titleFontSize = isFullscreen ? "text-4xl md:text-5xl lg:text-6xl" : "text-3xl";
  const padding = isFullscreen ? "p-12 md:p-16 lg:p-20" : "p-8";

  return (
    <div className={`h-full w-full flex flex-col relative overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 ${padding}`}>
      {/* Pop Art Background Elements - Adjusted for fullscreen */}
      <div className={`absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none ${isFullscreen ? "scale-150" : ""}`}>
        <div className="absolute top-0 left-0 w-20 h-20 bg-yellow-400 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-red-400 rounded-full transform translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute top-1/4 right-1/4 w-16 h-16 bg-blue-400 rounded-full"></div>
      </div>

      {/* Title */}
      <div className="mb-6 z-10">
        <h2 className={`${titleFontSize} font-bangers text-black inline-block bg-yellow-300 px-4 py-2 rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
          {title}
        </h2>
      </div>

      {/* Content and Image */}
      <div className="flex flex-1 gap-6 z-10 overflow-y-auto">
        <div className="flex-1">
          {content.split("\n\n").map((paragraph, i) => (
            <div key={i} className="mb-4">
              {paragraph.split("\n").map((line, j) => (
                <div key={j} className="mb-1">
                  {line.startsWith("•") || line.startsWith("-") ? (
                    <div className="flex items-start">
                      <span className={`inline-block bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center mr-2 mt-0.5 border border-black ${isFullscreen ? "w-8 h-8 text-xl" : "w-6 h-6"}`}>
                        •
                      </span>
                      <span className={baseFontSize}>{renderFormattedText(line.substring(1).trim())}</span>
                    </div>
                  ) : line.match(/^\d+\./) ? (
                    <div className="flex items-start">
                      <span className={`inline-block bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center mr-2 mt-0.5 border border-black ${isFullscreen ? "w-8 h-8 text-xl" : "w-6 h-6"}`}>
                        {line.match(/^\d+/)?.[0]}
                      </span>
                      <span className={baseFontSize}>{renderFormattedText(line.replace(/^\d+\./, "").trim())}</span>
                    </div>
                  ) : (
                    <p className={baseFontSize}>{renderFormattedText(line)}</p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {imageUrl && (
          <div className={`flex-shrink-0 ${isFullscreen ? "w-1/2" : "w-1/3"}`}>
            <div className={`border-4 border-black rounded-lg overflow-hidden shadow-lg bg-white p-2 ${isFullscreen ? "" : "rotate-3"}`}>
              <img
                src={imageUrl || "/placeholder.svg"}
                alt="Slide illustration"
                className="w-full h-full object-contain rounded"
                crossOrigin="anonymous"
              />
            </div>
          </div>
        )}
      </div>

      {/* Slide Number Indicator */}
      {slideNumber && totalSlides && !isFullscreen && (
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-medium z-20">
          {slideNumber} / {totalSlides}
        </div>
      )}
    </div>
  )
}
