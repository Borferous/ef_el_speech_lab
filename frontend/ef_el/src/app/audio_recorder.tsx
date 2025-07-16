'use client'
import { useState, useRef } from 'react'

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioBlobRef = useRef<Blob | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' })
        audioBlobRef.current = audioBlob
        const audioUrl = URL.createObjectURL(audioBlob)
        setAudioURL(audioUrl)
        chunksRef.current = []
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setUploadStatus('idle')
    } catch (err) {
      console.error('Error accessing microphone:', err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
  }

  const handleUpload = async () => {
    if (!audioBlobRef.current) return

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('audio_file', audioBlobRef.current, 'recording.wav')

      const response = await fetch('http://localhost:8000/upload-audio', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')
      setUploadStatus('success')
    } catch (err) {
      console.error('Upload error:', err)
      setUploadStatus('error')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <p>Hello</p>
      <h1 className="text-2xl font-bold">Audio Recorder</h1>
      
      <div className="flex gap-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-4 py-2 rounded-lg ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-500 hover:bg-blue-600'
          } text-white`}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>

      {audioURL && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <audio controls src={audioURL} />
          <div className="flex gap-2">
            <a
              href={audioURL}
              download="recording.wav"
              className="text-blue-500 hover:underline"
            >
              Download
            </a>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : 'Upload Recording'}
            </button>
          </div>
          {uploadStatus === 'success' && (
            <p className="text-green-500">Upload successful!</p>
          )}
          {uploadStatus === 'error' && (
            <p className="text-red-500">Upload failed. Please try again.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default AudioRecorder