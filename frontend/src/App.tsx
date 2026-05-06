import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type AgentSummary = {
  id: string
  name: string
  description: string
  instructions: string
  sourcePath: string
}

type OutputFile = {
  fileId: string
  fileName: string
  mimeType: string
  size: number
}

type SessionStatus = 'queued' | 'processing' | 'completed' | 'error'

type ProcessSession = {
  sessionId: string
  status: SessionStatus
  responseText: string
  outputFiles: OutputFile[]
  error?: string
}

type StreamEvent =
  | { type: 'status'; status: SessionStatus; message: string }
  | { type: 'chunk'; chunk: string }
  | { type: 'artifact'; file: OutputFile }
  | { type: 'completed'; session: ProcessSession }
  | { type: 'agent-error'; message: string }

const apiBase = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001'

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function App() {
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [agentsLoading, setAgentsLoading] = useState(true)
  const [agentsError, setAgentsError] = useState<string | null>(null)

  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [status, setStatus] = useState<SessionStatus>('queued')
  const [statusMessage, setStatusMessage] = useState('Idle')
  const [responseText, setResponseText] = useState('')
  const [outputFiles, setOutputFiles] = useState<OutputFile[]>([])
  const [runError, setRunError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const eventSourceRef = useRef<EventSource | null>(null)

  const canSubmit = useMemo(() => {
    return Boolean(file) && Boolean(selectedAgentId) && !submitting
  }, [file, selectedAgentId, submitting])

  useEffect(() => {
    const loadAgents = async () => {
      setAgentsLoading(true)
      setAgentsError(null)
      try {
        const response = await fetch(`${apiBase}/api/agents`)
        if (!response.ok) {
          throw new Error(`Failed to load agents (${response.status})`)
        }

        const data = (await response.json()) as { agents: AgentSummary[] }
        setAgents(data.agents)
        if (data.agents.length > 0) {
          setSelectedAgentId(data.agents[0].id)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error loading agents'
        setAgentsError(message)
      } finally {
        setAgentsLoading(false)
      }
    }

    loadAgents()
  }, [])

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close()
    }
  }, [])

  const startStream = (nextSessionId: string) => {
    eventSourceRef.current?.close()
    const stream = new EventSource(`${apiBase}/api/process/${nextSessionId}/stream`)

    const handleEvent = (event: Event) => {
      const messageEvent = event as MessageEvent<string>
      const data = JSON.parse(messageEvent.data) as StreamEvent
      switch (data.type) {
        case 'status':
          setStatus(data.status)
          setStatusMessage(data.message)
          break
        case 'chunk':
          setResponseText((current) => current + data.chunk)
          break
        case 'artifact':
          setOutputFiles((current) => [...current, data.file])
          break
        case 'completed':
          setStatus('completed')
          setStatusMessage('Completed')
          setResponseText(data.session.responseText)
          setOutputFiles(data.session.outputFiles)
          stream.close()
          break
        case 'agent-error':
          setStatus('error')
          setRunError(data.message)
          setStatusMessage('Processing failed')
          stream.close()
          break
      }
    }

    stream.addEventListener('status', handleEvent)
    stream.addEventListener('chunk', handleEvent)
    stream.addEventListener('artifact', handleEvent)
    stream.addEventListener('completed', handleEvent)
    stream.addEventListener('agent-error', handleEvent)

    stream.onerror = () => {
      setStatusMessage('Stream disconnected')
    }

    eventSourceRef.current = stream
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file || !selectedAgentId) {
      return
    }

    setSubmitting(true)
    setRunError(null)
    setResponseText('')
    setOutputFiles([])
    setStatus('queued')
    setStatusMessage('Queued')

    try {
      const formData = new FormData()
      formData.set('agentId', selectedAgentId)
      formData.set('file', file)

      const response = await fetch(`${apiBase}/api/process`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        throw new Error(payload.error ?? `Request failed (${response.status})`)
      }

      const payload = (await response.json()) as { sessionId: string; status: SessionStatus }
      setSessionId(payload.sessionId)
      setStatus(payload.status)
      startStream(payload.sessionId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown processing error'
      setRunError(message)
      setStatus('error')
      setStatusMessage('Processing failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <p className="eyebrow">GitHub Copilot SDK Frontend</p>
        <h1>Upload CSV, Run Custom Agent, Stream Results</h1>
        <p className="hero-copy">
          Custom agents are loaded from <strong>.github/agents</strong>. Select one, upload a CSV, and get a streamed response plus downloadable artifacts.
        </p>
      </header>

      <main className="grid">
        <section className="card">
          <h2>1) Upload + Agent</h2>
          <form onSubmit={onSubmit} className="form">
            <label>
              CSV file
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <label>
              Custom agent
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                disabled={agentsLoading || agents.length === 0}
              >
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" disabled={!canSubmit}>
              {submitting ? 'Submitting...' : 'Run Agent'}
            </button>
          </form>

          {agentsLoading && <p>Loading agents...</p>}
          {agentsError && <p className="error">{agentsError}</p>}
          {!agentsLoading && agents.length === 0 && <p>No agents found in .github/agents</p>}
        </section>

        <section className="card">
          <h2>2) Agent Response</h2>
          <p>
            <strong>Status:</strong> {status} ({statusMessage})
          </p>
          {sessionId && (
            <p>
              <strong>Session:</strong> {sessionId}
            </p>
          )}
          {runError && <p className="error">{runError}</p>}

          <pre className="response-box">{responseText || 'No response yet.'}</pre>
        </section>

        <section className="card">
          <h2>3) Generated Files</h2>
          {outputFiles.length === 0 ? (
            <p>No generated files yet.</p>
          ) : (
            <ul className="file-list">
              {outputFiles.map((generatedFile) => (
                <li key={generatedFile.fileId}>
                  <span>
                    {generatedFile.fileName} ({formatBytes(generatedFile.size)})
                  </span>
                  {sessionId && (
                    <a
                      href={`${apiBase}/api/process/${sessionId}/files/${generatedFile.fileId}/download`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
