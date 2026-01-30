import { useState, useEffect, useRef } from 'react'
import { callAIAgent } from '@/utils/aiAgent'
import type { NormalizedAgentResponse } from '@/utils/aiAgent'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Send,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  User,
  Bot,
  Clock,
  AlertTriangle,
  Shield,
  FileText,
  TrendingUp,
  Edit2,
  MessageSquare,
  PhoneCall,
  UserCircle,
  LogOut
} from 'lucide-react'

// Agent IDs from workflow.json
const ORCHESTRATOR_ID = "697c72bad36f070193f5ae0b"

// TypeScript interfaces from ACTUAL test responses
interface ConversationAnalysis {
  intent: string
  sentiment: string
  urgency: string
  issue_summary: string
}

interface ScopeAssessment {
  in_scope: boolean
  risk_level: string
  recommended_action: string
}

interface ResolutionPlan {
  playbook_matched: string
  draft_response: string
  requires_dbr_approval: boolean
}

interface EscalationStatus {
  escalation_required: boolean
  target_team: string | null
  ticket_id: string | null
}

interface OrchestratorResult {
  conversation_analysis: ConversationAnalysis
  scope_assessment: ScopeAssessment
  resolution_plan: ResolutionPlan
  escalation_status: EscalationStatus
  next_action: string
  aggregated_confidence: number
  ui_display_message: string
}

interface ChatMessage {
  id: string
  sender: 'customer' | 'dbr' | 'system'
  text: string
  timestamp: Date
  isAiDraft?: boolean
}

interface AgentActivity {
  id: string
  agentName: string
  icon: any
  triggerReason: string
  status: 'thinking' | 'completed' | 'awaiting_approval' | 'error'
  output?: string
  confidence?: number
  timestamp: Date
}

// Sub-components defined outside Home() to prevent re-creation
function TopHeader({ sessionTime, dbrName }: { sessionTime: string; dbrName: string }) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#0066FF] rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xl">V</span>
        </div>
        <span className="font-bold text-xl text-gray-900">VARO</span>
      </div>

      <div className="flex items-center gap-2 text-gray-700">
        <UserCircle className="w-5 h-5" />
        <span className="font-medium">Customer #12345</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-gray-600">
          <Clock className="w-4 h-4" />
          <span className="text-sm">{sessionTime}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-700">
          <User className="w-4 h-4" />
          <span className="text-sm font-medium">{dbrName}</span>
        </div>
        <Button variant="ghost" size="sm" className="gap-2">
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}

function DBRActionPanel({
  orchestratorResponse,
  draftText,
  onDraftChange,
  onApprove,
  onEdit,
  onReject,
  loading
}: {
  orchestratorResponse: NormalizedAgentResponse | null
  draftText: string
  onDraftChange: (text: string) => void
  onApprove: () => void
  onEdit: () => void
  onReject: () => void
  loading: boolean
}) {
  const [showReasoning, setShowReasoning] = useState(false)

  const result = orchestratorResponse?.result as OrchestratorResult | undefined
  const confidence = result ? Math.round(result.aggregated_confidence * 100) : 0

  if (!result) {
    return (
      <div className="w-[30%] bg-[#F5F7FA] p-6 flex flex-col">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">DBR Action Panel</h2>
        <Card className="bg-white">
          <CardContent className="pt-6">
            <p className="text-gray-500 text-center">Waiting for customer message...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-[30%] bg-[#F5F7FA] p-6 flex flex-col gap-4 overflow-y-auto">
      <h2 className="text-lg font-semibold text-gray-900">DBR Action Panel</h2>

      {/* Recommendation Card */}
      <Card className="bg-white border-[#0066FF]">
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>AI Recommendation</span>
            <Badge className="bg-[#0066FF] text-white">{result.next_action.replace('_', ' ')}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Confidence Meter */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Confidence</span>
              <span className="font-semibold text-[#0066FF]">{confidence}%</span>
            </div>
            <Progress value={confidence} className="h-2" />
          </div>

          {/* Playbook */}
          <div className="pt-2">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Playbook Matched</p>
                <p className="text-sm font-medium text-gray-900">{result.resolution_plan.playbook_matched}</p>
              </div>
            </div>
          </div>

          {/* Why Suggested */}
          <div className="pt-2">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="flex items-center gap-2 text-sm text-[#0066FF] hover:underline"
            >
              {showReasoning ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Why this was suggested
            </button>
            {showReasoning && (
              <div className="mt-2 p-3 bg-blue-50 rounded text-sm text-gray-700">
                {result.ui_display_message}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={onApprove}
          disabled={loading}
          className="flex-1 bg-[#0066FF] hover:bg-blue-700 text-white"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approve'}
        </Button>
        <Button
          onClick={onEdit}
          disabled={loading}
          variant="outline"
          className="flex-1"
        >
          <Edit2 className="w-4 h-4 mr-2" />
          Edit
        </Button>
        <Button
          onClick={onReject}
          disabled={loading}
          variant="outline"
          className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
        >
          Reject
        </Button>
      </div>

      {/* Editable Response Field */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-sm">Draft Response</CardTitle>
          <CardDescription className="text-xs">{draftText.length}/500 characters</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={draftText}
            onChange={(e) => onDraftChange(e.target.value)}
            maxLength={500}
            className="min-h-[150px] text-sm"
            placeholder="AI-generated response will appear here..."
          />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2">
            <MessageSquare className="w-4 h-4" />
            Request Clarification
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2">
            <AlertTriangle className="w-4 h-4" />
            Escalate Manually
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2">
            <UserCircle className="w-4 h-4" />
            View Customer Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function ChatPanel({
  messages,
  inputMessage,
  onInputChange,
  onSend,
  loading,
  orchestratorResponse
}: {
  messages: ChatMessage[]
  inputMessage: string
  onInputChange: (text: string) => void
  onSend: () => void
  loading: boolean
  orchestratorResponse: NormalizedAgentResponse | null
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const result = orchestratorResponse?.result as OrchestratorResult | undefined

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const getSentimentColor = (sentiment?: string) => {
    if (!sentiment) return 'bg-gray-100 text-gray-700'
    if (sentiment === 'frustrated' || sentiment === 'angry') return 'bg-red-100 text-red-700'
    if (sentiment === 'neutral') return 'bg-gray-100 text-gray-700'
    return 'bg-green-100 text-green-700'
  }

  const getUrgencyColor = (urgency?: string) => {
    if (!urgency) return 'bg-gray-100 text-gray-700'
    if (urgency === 'critical' || urgency === 'high') return 'bg-red-100 text-red-700'
    if (urgency === 'medium') return 'bg-yellow-100 text-yellow-700'
    return 'bg-green-100 text-green-700'
  }

  return (
    <div className="w-[40%] bg-white border-x border-gray-200 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Chat</h2>
        {result && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              {result.conversation_analysis.intent.replace('_', ' ')}
            </Badge>
            <Badge className={`text-xs ${getSentimentColor(result.conversation_analysis.sentiment)}`}>
              {result.conversation_analysis.sentiment}
            </Badge>
            <Badge className={`text-xs ${getUrgencyColor(result.conversation_analysis.urgency)}`}>
              {result.conversation_analysis.urgency}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {result.scope_assessment.in_scope ? 'In-Scope' : 'Out-of-Scope'}
            </Badge>
          </div>
        )}
      </div>

      {/* Message Thread */}
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'customer' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-4 py-3 ${
                  msg.sender === 'customer'
                    ? 'bg-gray-100 text-gray-900'
                    : msg.sender === 'system'
                    ? 'bg-yellow-50 text-gray-700 border border-yellow-200'
                    : 'bg-[#0066FF] text-white'
                }`}
              >
                {msg.isAiDraft && (
                  <Badge className="mb-2 bg-white text-[#0066FF] text-xs">AI Draft</Badge>
                )}
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                <p
                  className={`text-xs mt-2 ${
                    msg.sender === 'customer' ? 'text-gray-500' : 'text-white/70'
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSend()
              }
            }}
            placeholder="Type customer message..."
            disabled={loading}
            className="flex-1"
          />
          <Button
            onClick={onSend}
            disabled={loading || !inputMessage.trim()}
            className="bg-[#0066FF] hover:bg-blue-700 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">{inputMessage.length} characters</p>
      </div>
    </div>
  )
}

function AIOrchestrationTimeline({ activities }: { activities: AgentActivity[] }) {
  const getStatusBadge = (status: AgentActivity['status']) => {
    switch (status) {
      case 'thinking':
        return (
          <Badge className="bg-blue-100 text-blue-700 gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Thinking
          </Badge>
        )
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-700 gap-1">
            <CheckCircle className="w-3 h-3" />
            Completed
          </Badge>
        )
      case 'awaiting_approval':
        return (
          <Badge className="bg-orange-100 text-orange-700 gap-1">
            <Clock className="w-3 h-3" />
            Awaiting DBR Approval
          </Badge>
        )
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-700 gap-1">
            <XCircle className="w-3 h-3" />
            Error
          </Badge>
        )
    }
  }

  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="w-[30%] bg-[#F5F7FA] p-6 overflow-y-auto">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">AI Orchestration Timeline</h2>
        <Badge variant="outline" className="text-xs">
          <Bot className="w-3 h-3 mr-1" />
          Orchestrator Active
        </Badge>
      </div>

      <div className="space-y-4">
        {activities.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="pt-6">
              <p className="text-gray-500 text-center text-sm">No agent activity yet</p>
            </CardContent>
          </Card>
        ) : (
          activities.map((activity, idx) => (
            <div key={activity.id} className="relative">
              {/* Timeline Connector */}
              {idx < activities.length - 1 && (
                <div className="absolute left-5 top-16 bottom-0 w-0.5 bg-gray-300 -mb-4" />
              )}

              <Card className="bg-white relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-[#0066FF] rounded-full flex items-center justify-center">
                        <activity.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{activity.agentName}</CardTitle>
                        <p className="text-xs text-gray-500">{activity.timestamp.toLocaleTimeString()}</p>
                      </div>
                    </div>
                    {getStatusBadge(activity.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Trigger Reason</p>
                      <p className="text-sm text-gray-900">{activity.triggerReason}</p>
                    </div>
                  </div>

                  {activity.confidence !== undefined && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Confidence</span>
                        <span className="font-medium text-[#0066FF]">
                          {Math.round(activity.confidence * 100)}%
                        </span>
                      </div>
                      <Progress value={activity.confidence * 100} className="h-1.5" />
                    </div>
                  )}

                  {activity.output && (
                    <div>
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === activity.id ? null : activity.id)
                        }
                        className="flex items-center gap-1 text-xs text-[#0066FF] hover:underline"
                      >
                        {expandedId === activity.id ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                        Output Summary
                      </button>
                      {expandedId === activity.id && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700">
                          {activity.output}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'system',
      text: 'Session started. Awaiting customer message...',
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [orchestratorResponse, setOrchestratorResponse] = useState<NormalizedAgentResponse | null>(null)
  const [draftText, setDraftText] = useState('')
  const [loading, setLoading] = useState(false)
  const [activities, setActivities] = useState<AgentActivity[]>([])
  const [sessionTime, setSessionTime] = useState('00:00')
  const [sessionStart] = useState(new Date())

  // Session timer
  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((new Date().getTime() - sessionStart.getTime()) / 1000)
      const minutes = Math.floor(elapsed / 60)
      const seconds = elapsed % 60
      setSessionTime(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(timer)
  }, [sessionStart])

  const handleSend = async () => {
    if (!inputMessage.trim() || loading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'customer',
      text: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setLoading(true)

    // Add Orchestrator thinking activity
    const orchestratorActivity: AgentActivity = {
      id: `activity-${Date.now()}`,
      agentName: 'AI Orchestrator',
      icon: Bot,
      triggerReason: 'Processing customer message',
      status: 'thinking',
      timestamp: new Date()
    }
    setActivities(prev => [orchestratorActivity, ...prev])

    try {
      // Call the AI Orchestrator
      const result = await callAIAgent(inputMessage, ORCHESTRATOR_ID)

      if (result.success && result.response.status === 'success') {
        setOrchestratorResponse(result.response)
        const data = result.response.result as OrchestratorResult

        // Update draft text
        setDraftText(data.resolution_plan.draft_response)

        // Update orchestrator activity to completed
        setActivities(prev =>
          prev.map(a =>
            a.id === orchestratorActivity.id
              ? {
                  ...a,
                  status: 'completed',
                  confidence: data.aggregated_confidence,
                  output: data.ui_display_message
                }
              : a
          )
        )

        // Add sub-agent activities based on orchestrator response
        const newActivities: AgentActivity[] = []

        // Conversation Intelligence
        newActivities.push({
          id: `conv-${Date.now()}`,
          agentName: 'Conversation Intelligence',
          icon: MessageSquare,
          triggerReason: 'Analyze message intent and sentiment',
          status: 'completed',
          confidence: 0.98,
          output: `Intent: ${data.conversation_analysis.intent} | Sentiment: ${data.conversation_analysis.sentiment} | Urgency: ${data.conversation_analysis.urgency}`,
          timestamp: new Date()
        })

        // Scope & Account Intelligence
        newActivities.push({
          id: `scope-${Date.now()}`,
          agentName: 'Scope & Account Intelligence',
          icon: Shield,
          triggerReason: 'Determine if issue is in-scope',
          status: 'completed',
          confidence: 0.95,
          output: `${data.scope_assessment.in_scope ? 'In-scope' : 'Out-of-scope'} | Risk: ${data.scope_assessment.risk_level} | Action: ${data.scope_assessment.recommended_action}`,
          timestamp: new Date()
        })

        // Resolution Intelligence
        newActivities.push({
          id: `resolution-${Date.now()}`,
          agentName: 'Resolution Intelligence',
          icon: FileText,
          triggerReason: 'Find SOP and draft response',
          status: 'completed',
          confidence: 0.92,
          output: `Playbook: ${data.resolution_plan.playbook_matched}`,
          timestamp: new Date()
        })

        // Check if escalation needed
        if (data.escalation_status.escalation_required) {
          newActivities.push({
            id: `escalation-${Date.now()}`,
            agentName: 'Escalation Intelligence',
            icon: AlertTriangle,
            triggerReason: 'Issue requires escalation',
            status: 'completed',
            output: `Escalated to: ${data.escalation_status.target_team}`,
            timestamp: new Date()
          })
        }

        setActivities(prev => [...newActivities, ...prev])

        // Add awaiting approval activity
        if (data.resolution_plan.requires_dbr_approval) {
          setActivities(prev => [
            {
              id: `approval-${Date.now()}`,
              agentName: 'Awaiting DBR Decision',
              icon: Clock,
              triggerReason: 'DBR approval required before sending',
              status: 'awaiting_approval',
              timestamp: new Date()
            },
            ...prev
          ])
        }
      } else {
        // Error handling
        setActivities(prev =>
          prev.map(a =>
            a.id === orchestratorActivity.id ? { ...a, status: 'error' as const } : a
          )
        )
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: 'system',
            text: `Error: ${result.error || 'Failed to process message'}`,
            timestamp: new Date()
          }
        ])
      }
    } catch (error) {
      setActivities(prev =>
        prev.map(a =>
          a.id === orchestratorActivity.id ? { ...a, status: 'error' as const } : a
        )
      )
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'system',
          text: 'Network error occurred',
          timestamp: new Date()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = () => {
    if (!draftText.trim()) return

    const dbrMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'dbr',
      text: draftText,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, dbrMessage])
    setDraftText('')
    setOrchestratorResponse(null)

    // Update activities - mark as completed
    setActivities(prev =>
      prev.map(a =>
        a.status === 'awaiting_approval' ? { ...a, status: 'completed' as const } : a
      )
    )

    // Add resolution delivered activity
    setActivities(prev => [
      {
        id: `delivered-${Date.now()}`,
        agentName: 'Resolution Delivered',
        icon: CheckCircle,
        triggerReason: 'DBR approved and sent response',
        status: 'completed',
        timestamp: new Date()
      },
      ...prev
    ])
  }

  const handleEdit = () => {
    // Draft text is already editable in the textarea
    // This button just focuses the user on editing
  }

  const handleReject = () => {
    setDraftText('')
    setOrchestratorResponse(null)

    setActivities(prev => [
      {
        id: `rejected-${Date.now()}`,
        agentName: 'AI Recommendation Rejected',
        icon: XCircle,
        triggerReason: 'DBR rejected AI suggestion',
        status: 'error',
        timestamp: new Date()
      },
      ...prev
    ])
  }

  return (
    <div className="h-screen flex flex-col bg-[#F5F7FA]">
      <TopHeader sessionTime={sessionTime} dbrName="Sarah Johnson" />

      <div className="flex flex-1 overflow-hidden">
        <DBRActionPanel
          orchestratorResponse={orchestratorResponse}
          draftText={draftText}
          onDraftChange={setDraftText}
          onApprove={handleApprove}
          onEdit={handleEdit}
          onReject={handleReject}
          loading={loading}
        />

        <ChatPanel
          messages={messages}
          inputMessage={inputMessage}
          onInputChange={setInputMessage}
          onSend={handleSend}
          loading={loading}
          orchestratorResponse={orchestratorResponse}
        />

        <AIOrchestrationTimeline activities={activities} />
      </div>
    </div>
  )
}
