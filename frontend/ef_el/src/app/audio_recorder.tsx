'use client'
import { useState, useRef } from 'react'
import axios from 'axios'

const readingMaterials = [
  "The cat is fat",
  "A quick brown fox jumps over the lazy dog",
  "She sells seashells by the seashore",
  "The rain in Spain falls mainly on the plain",
  "How much wood would a woodchuck chuck if a woodchuck could chuck wood?",
  "Peter Piper picked a peck of pickled peppers",
  "Red leather, yellow leather",
  "Unique New York, you know you need unique New York",
  "The sixth sick sheik's sixth sheep's sick",
  "Technology has revolutionized the way we communicate and work",
  "Artificial intelligence is transforming industries across the globe",
  "Climate change requires immediate and coordinated global action",
  "Education is the most powerful weapon which you can use to change the world",
  "Innovation distinguishes between a leader and a follower",
  "The greatest glory in living lies not in never falling, but in rising every time we fall",
  "Yesterday is history, tomorrow is a mystery, today is a gift",
  "Success is not final, failure is not fatal, it is the courage to continue that counts",
  "The only way to do great work is to love what you do",
  "Life is what happens to you while you're busy making other plans",
  "In the middle of difficulty lies opportunity"
]

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [currentMaterialIndex, setCurrentMaterialIndex] = useState(0)
  const [transcription, setTranscription] = useState<string | null>(null)
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

      const response = await axios.post('http://localhost:8000/upload-audio-and-transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      console.log(response.data)
      setTranscription(response.data.transcription)
      setUploadStatus('success')
    } catch (err) {
      console.error('Upload error:', err)
      setUploadStatus('error')
    } finally {
      setIsUploading(false)
    }
  }

  const nextMaterial = () => {
    setCurrentMaterialIndex((prev) => (prev + 1) % readingMaterials.length)
  }

  const prevMaterial = () => {
    setCurrentMaterialIndex((prev) => (prev - 1 + readingMaterials.length) % readingMaterials.length)
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

      {/* Reading Materials Section */}
      <div className="mt-8 w-full max-w-2xl">
        <h2 className="text-xl font-semibold mb-4 text-center">Reading Materials</h2>
        
        <div className="bg-gray-100 p-6 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={prevMaterial}
              className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-600">
              {currentMaterialIndex + 1} of {readingMaterials.length}
            </span>
            <button
              onClick={nextMaterial}
              className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded"
            >
              Next →
            </button>
          </div>
          
          <div className="text-lg text-center leading-relaxed p-4 bg-white rounded border">
            {readingMaterials[currentMaterialIndex]}
          </div>
        </div>
      </div>

      {/* Transcription Display */}
      {transcription && (
        <div className="mt-6 w-full max-w-2xl">
          <h3 className="text-lg font-semibold mb-3 text-center">Transcription Result</h3>
          <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
            <p className="text-gray-800">{transcription}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default AudioRecorder