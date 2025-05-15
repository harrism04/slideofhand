export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null

  async startRecording(): Promise<void> {
    try {
      this.audioChunks = []
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.mediaRecorder = new MediaRecorder(this.stream)

      this.mediaRecorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      })

      this.mediaRecorder.start()
    } catch (error) {
      console.error("Error starting recording:", error)
      throw new Error("Could not start recording")
    }
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("Recording not started"))
        return
      }

      this.mediaRecorder.addEventListener("stop", () => {
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" })

        // Stop all tracks
        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop())
        }

        resolve(audioBlob)
      })

      this.mediaRecorder.stop()
    })
  }

  isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === "recording"
  }
}

export async function convertBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
      const base64Data = base64String.split(",")[1]
      resolve(base64Data)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function convertBlobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      resolve(reader.result as ArrayBuffer)
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(blob)
  })
}
