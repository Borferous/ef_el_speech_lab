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
  const [analysis, setAnalysis] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
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
      setIsAnalyzing(true)
      const formData = new FormData()
      formData.append('audio_file', audioBlobRef.current, 'recording.wav')
      formData.append('original_text', readingMaterials[currentMaterialIndex])

      console.log('Sending original text:', readingMaterials[currentMaterialIndex])

      const response = await axios.post('http://localhost:8000/upload-and-analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      console.log('Full response:', response.data)
      console.log('Analysis data:', response.data.analysis)
      console.log('Transcription:', response.data.transcription)
      
      setTranscription(response.data.transcription)
      
      // If backend analysis failed or is null, create a simple frontend analysis
      if (!response.data.analysis || response.data.analysis === null) {
        const simpleAnalysis = createSimpleAnalysis(
          readingMaterials[currentMaterialIndex], 
          response.data.transcription
        )
        setAnalysis(simpleAnalysis)
      } else {
        setAnalysis(response.data.analysis)
      }
      
      setUploadStatus('success')
    } catch (err) {
      console.error('Upload error:', err)
      setUploadStatus('error')
    } finally {
      setIsUploading(false)
      setIsAnalyzing(false)
    }
  }

  // Simple frontend analysis function as fallback
  const createSimpleAnalysis = (original: string, transcribed: string) => {
    // Clean and normalize the texts
    const cleanOriginal = original.toLowerCase().trim().replace(/[^\w\s]/g, '')
    const cleanTranscribed = transcribed.toLowerCase().trim().replace(/[^\w\s]/g, '')
    
    const originalWords = cleanOriginal.split(/\s+/).filter(word => word.length > 0)
    const transcribedWords = cleanTranscribed.split(/\s+/).filter(word => word.length > 0)
    
    // Calculate word-level accuracy
    let correctWords = 0
    const missingWords = []
    const incorrectWords = []
    
    // Compare word by word (considering position)
    const maxLength = Math.max(originalWords.length, transcribedWords.length)
    for (let i = 0; i < originalWords.length; i++) {
      const originalWord = originalWords[i]
      const transcribedWord = transcribedWords[i]
      
      if (transcribedWord && originalWord === transcribedWord) {
        correctWords++
      } else if (!transcribedWord) {
        missingWords.push(originalWord)
      } else if (originalWord !== transcribedWord) {
        incorrectWords.push({
          original: originalWord,
          transcribed: transcribedWord
        })
      }
    }
    
    // Also check for exact match
    const isExactMatch = cleanOriginal === cleanTranscribed
    
    // If it's an exact match or very close, give perfect scores
    if (isExactMatch || correctWords === originalWords.length) {
      return {
        accuracy_score: 100,
        fluency_score: 100,
        overall_score: 100,
        word_accuracy: 100,
        missing_words: [],
        incorrect_words: [],
        strengths: ["Perfect pronunciation!", "Excellent clarity", "All words correctly spoken"],
        areas_for_improvement: [],
        detailed_feedback: "Excellent work! You pronounced all words correctly with perfect clarity."
      }
    }
    
    const accuracy = Math.round((correctWords / originalWords.length) * 100)
    
    return {
      accuracy_score: accuracy,
      fluency_score: accuracy > 80 ? 85 : accuracy > 60 ? 70 : 50,
      overall_score: accuracy,
      word_accuracy: accuracy,
      missing_words: missingWords,
      incorrect_words: incorrectWords,
      strengths: accuracy > 80 ? ["Good pronunciation"] : accuracy > 60 ? ["Clear speech"] : [],
      areas_for_improvement: accuracy < 100 ? ["Practice pronunciation", "Speak more clearly"] : [],
      detailed_feedback: `You achieved ${accuracy}% accuracy. ${accuracy >= 90 ? 'Excellent work!' : accuracy >= 70 ? 'Good job, keep practicing!' : 'Keep practicing to improve your pronunciation!'}`
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
      <h1 className="text-2xl font-bold">EF-EL Speech Lab version 1</h1>

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
              {isUploading ? 'Analyzing...' : 'Upload & Analyze Speech'}
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

      {/* Analysis Display */}
      {analysis && (
        <div className="mt-6 w-full max-w-4xl">
          <h3 className="text-lg font-semibold mb-3 text-center">Speech Analysis</h3>

          {/* Check for analysis error */}
          {analysis.error ? (
            <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
              <h4 className="font-semibold text-red-700">Analysis Error</h4>
              <p className="text-red-600">{analysis.error}</p>
              {analysis.details && <p className="text-sm text-red-500 mt-2">{analysis.details}</p>}
            </div>
          ) : (
            <>
              {/* Score Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                  <h4 className="font-semibold text-green-700">Accuracy Score</h4>
                  <p className="text-2xl font-bold text-green-600">{analysis.accuracy_score}/100</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <h4 className="font-semibold text-blue-700">Fluency Score</h4>
                  <p className="text-2xl font-bold text-blue-600">{analysis.fluency_score}/100</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                  <h4 className="font-semibold text-purple-700">Overall Score</h4>
                  <p className="text-2xl font-bold text-purple-600">{analysis.overall_score}/100</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                {analysis.strengths && analysis.strengths.length > 0 && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-700 mb-2">Strengths</h4>
                    <ul className="list-disc list-inside text-green-600">
                      {analysis.strengths.map((strength: string, index: number) => (
                        <li key={index}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Areas for Improvement */}
                {analysis.areas_for_improvement && analysis.areas_for_improvement.length > 0 && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-700 mb-2">Areas for Improvement</h4>
                    <ul className="list-disc list-inside text-orange-600">
                      {analysis.areas_for_improvement.map((area: string, index: number) => (
                        <li key={index}>{area}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Word Analysis */}
              {(analysis.missing_words?.length > 0 || analysis.incorrect_words?.length > 0) && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysis.missing_words && analysis.missing_words.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-red-700 mb-2">Missing Words</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysis.missing_words.map((word: string, index: number) => (
                          <span key={index} className="bg-red-200 text-red-700 px-2 py-1 rounded text-sm">
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.incorrect_words && analysis.incorrect_words.length > 0 && (
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-yellow-700 mb-2">Incorrect Words</h4>
                      <div className="space-y-1">
                        {analysis.incorrect_words.map((wordPair: any, index: number) => (
                          <div key={index} className="text-sm">
                            <span className="text-red-600 line-through">{wordPair.original}</span>
                            {' → '}
                            <span className="text-yellow-600">{wordPair.transcribed}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Detailed Feedback */}
              {analysis.detailed_feedback && (
                <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2">Detailed Feedback</h4>
                  <p className="text-gray-600">{analysis.detailed_feedback}</p>
                </div>
              )}

              {/* Word Accuracy */}
              {analysis.word_accuracy !== undefined && (
                <div className="mt-4 bg-indigo-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-indigo-700 mb-2">Word Accuracy</h4>
                  <p className="text-indigo-600">{analysis.word_accuracy}% of words were correctly transcribed</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Loading States */}
      {isAnalyzing && (
        <div className="mt-4 text-center">
          <p className="text-blue-500">Analyzing speech with AI...</p>
        </div>
      )}
    </div>
  )
}

export default AudioRecorder