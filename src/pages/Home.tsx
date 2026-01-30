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
  LogOut,
  Sparkles
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
    <div className="bg-gradient-to-r from-[#8c58d0] via-[#9b6dd9] to-[#8c58d0] border-b border-purple-300 px-6 py-4 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <div className="bg-white px-4 py-2 rounded-xl flex items-center justify-center shadow-md transform hover:scale-105 transition-transform">
          <img
            src="https://asset.lyzr.app/cYA89SWL"
            alt="Varo"
            className="h-8 object-contain"
          />
        </div>
        <Badge className="ml-2 bg-white/20 text-white border-white/30 backdrop-blur-sm">
          <Sparkles className="w-3 h-3 mr-1" />
          DBR Co-Pilot
        </Badge>
      </div>

      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20">
        <UserCircle className="w-5 h-5 text-white" />
        <span className="font-medium text-white">Customer #12345</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20">
          <Clock className="w-4 h-4 text-white" />
          <span className="text-sm text-white font-medium">{sessionTime}</span>
        </div>
        <div className="flex items-center gap-2 text-white">
          <User className="w-4 h-4" />
          <span className="text-sm font-medium">{dbrName}</span>
        </div>
        <Button variant="ghost" size="sm" className="gap-2 text-white hover:bg-white/20">
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
      <div className="w-[30%] bg-gradient-to-br from-gray-50 to-purple-50/30 p-6 flex flex-col">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#8c58d0]" />
          DBR Action Panel
        </h2>
        <Card className="bg-white shadow-md border-purple-100 hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8">
              <Bot className="w-12 h-12 text-purple-300 mb-3" />
              <p className="text-gray-500 text-center">Waiting for customer message...</p>
              <p className="text-xs text-gray-400 mt-2">AI will analyze and suggest actions</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-[30%] bg-gradient-to-br from-gray-50 to-purple-50/30 p-6 flex flex-col gap-4 overflow-y-auto">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-[#8c58d0]" />
        DBR Action Panel
      </h2>

      {/* Recommendation Card */}
      <Card className="bg-white shadow-lg border-l-4 border-l-[#8c58d0] hover:shadow-xl transition-all">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-white">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="text-gray-900">AI Recommendation</span>
            <Badge className="bg-gradient-to-r from-[#8c58d0] to-[#9b6dd9] text-white border-0 shadow-md">
              {result.next_action.replace('_', ' ')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* Confidence Meter */}
          <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-lg border border-purple-100">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-700 font-medium">Confidence Score</span>
              <span className="font-bold text-[#8c58d0] text-lg">{confidence}%</span>
            </div>
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#8c58d0] to-[#9b6dd9] rounded-full transition-all duration-500 shadow-md"
                style={{ width: `${confidence}%` }}
              />
            </div>
          </div>

          {/* Playbook */}
          <div className="pt-2">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-8 h-8 bg-gradient-to-br from-[#8c58d0] to-[#9b6dd9] rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Playbook Matched</p>
                <p className="text-sm font-semibold text-gray-900">{result.resolution_plan.playbook_matched}</p>
              </div>
            </div>
          </div>

          {/* Why Suggested */}
          <div className="pt-2">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="flex items-center gap-2 text-sm text-[#8c58d0] hover:text-[#9b6dd9] font-medium transition-colors"
            >
              {showReasoning ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Why this was suggested
            </button>
            {showReasoning && (
              <div className="mt-3 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg text-sm text-gray-700 border border-purple-100 shadow-inner animate-in slide-in-from-top-2 duration-300">
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
          className="flex-1 bg-gradient-to-r from-[#8c58d0] to-[#9b6dd9] hover:from-[#7a4aba] hover:to-[#8c58d0] text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-2" />Approve</>}
        </Button>
        <Button
          onClick={onEdit}
          disabled={loading}
          variant="outline"
          className="flex-1 border-purple-200 text-[#8c58d0] hover:bg-purple-50 hover:border-[#8c58d0] shadow-md hover:shadow-lg transition-all"
        >
          <Edit2 className="w-4 h-4 mr-2" />
          Edit
        </Button>
        <Button
          onClick={onReject}
          disabled={loading}
          variant="outline"
          className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-400 shadow-md hover:shadow-lg transition-all"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Reject
        </Button>
      </div>

      {/* Editable Response Field */}
      <Card className="bg-white shadow-lg border-purple-100 hover:shadow-xl transition-shadow">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-white">
          <CardTitle className="text-sm font-semibold text-gray-900">Draft Response</CardTitle>
          <CardDescription className="text-xs flex items-center gap-2">
            <span className={draftText.length > 450 ? 'text-orange-600 font-medium' : 'text-gray-500'}>
              {draftText.length}/500 characters
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Textarea
            value={draftText}
            onChange={(e) => onDraftChange(e.target.value)}
            maxLength={500}
            className="min-h-[150px] text-sm border-purple-200 focus:border-[#8c58d0] focus:ring-[#8c58d0] transition-colors"
            placeholder="AI-generated response will appear here..."
          />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-white shadow-lg border-purple-100 hover:shadow-xl transition-shadow">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-white">
          <CardTitle className="text-sm font-semibold text-gray-900">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-4">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2 border-gray-200 hover:bg-purple-50 hover:border-[#8c58d0] transition-all">
            <MessageSquare className="w-4 h-4 text-[#8c58d0]" />
            Request Clarification
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2 border-gray-200 hover:bg-purple-50 hover:border-[#8c58d0] transition-all">
            <AlertTriangle className="w-4 h-4 text-[#8c58d0]" />
            Escalate Manually
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2 border-gray-200 hover:bg-purple-50 hover:border-[#8c58d0] transition-all">
            <UserCircle className="w-4 h-4 text-[#8c58d0]" />
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
    if (!sentiment) return 'bg-gray-100 text-gray-700 border-gray-200'
    if (sentiment === 'frustrated' || sentiment === 'angry') return 'bg-red-100 text-red-700 border-red-200'
    if (sentiment === 'neutral') return 'bg-gray-100 text-gray-700 border-gray-200'
    return 'bg-green-100 text-green-700 border-green-200'
  }

  const getUrgencyColor = (urgency?: string) => {
    if (!urgency) return 'bg-gray-100 text-gray-700 border-gray-200'
    if (urgency === 'critical' || urgency === 'high') return 'bg-red-100 text-red-700 border-red-200'
    if (urgency === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-green-100 text-green-700 border-green-200'
  }

  return (
    <div className="w-[40%] bg-white border-x border-purple-100 flex flex-col shadow-xl">
      <div className="bg-gradient-to-r from-white to-purple-50 border-b border-purple-100 px-6 py-4 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Chat</h2>
        {result && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs border-purple-200 text-gray-700 shadow-sm">
              {result.conversation_analysis.intent.replace('_', ' ')}
            </Badge>
            <Badge className={`text-xs border shadow-sm ${getSentimentColor(result.conversation_analysis.sentiment)}`}>
              {result.conversation_analysis.sentiment}
            </Badge>
            <Badge className={`text-xs border shadow-sm ${getUrgencyColor(result.conversation_analysis.urgency)}`}>
              {result.conversation_analysis.urgency}
            </Badge>
            <Badge variant="outline" className={`text-xs shadow-sm ${result.scope_assessment.in_scope ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
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
              className={`flex ${msg.sender === 'customer' ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-4 duration-300`}
            >
              <div
                className={`max-w-[75%] rounded-xl px-4 py-3 shadow-md hover:shadow-lg transition-all ${
                  msg.sender === 'customer'
                    ? 'bg-gradient-to-br from-gray-100 to-gray-50 text-gray-900 border border-gray-200'
                    : msg.sender === 'system'
                    ? 'bg-gradient-to-br from-yellow-50 to-orange-50 text-gray-700 border border-yellow-200'
                    : 'bg-gradient-to-br from-[#8c58d0] to-[#9b6dd9] text-white shadow-lg'
                }`}
              >
                {msg.isAiDraft && (
                  <Badge className="mb-2 bg-white text-[#8c58d0] text-xs border-0 shadow-sm">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Draft
                  </Badge>
                )}
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                <p
                  className={`text-xs mt-2 ${
                    msg.sender === 'customer' ? 'text-gray-500' : msg.sender === 'system' ? 'text-gray-600' : 'text-white/80'
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
      <div className="border-t border-purple-100 p-4 bg-gradient-to-r from-white to-purple-50">
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
            className="flex-1 border-purple-200 focus:border-[#8c58d0] focus:ring-[#8c58d0] shadow-sm"
          />
          <Button
            onClick={onSend}
            disabled={loading || !inputMessage.trim()}
            className="bg-gradient-to-r from-[#8c58d0] to-[#9b6dd9] hover:from-[#7a4aba] hover:to-[#8c58d0] text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
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
          <Badge className="bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 border-blue-200 gap-1 shadow-sm">
            <Loader2 className="w-3 h-3 animate-spin" />
            Thinking
          </Badge>
        )
      case 'completed':
        return (
          <Badge className="bg-gradient-to-r from-green-100 to-green-50 text-green-700 border-green-200 gap-1 shadow-sm">
            <CheckCircle className="w-3 h-3" />
            Completed
          </Badge>
        )
      case 'awaiting_approval':
        return (
          <Badge className="bg-gradient-to-r from-orange-100 to-orange-50 text-orange-700 border-orange-200 gap-1 shadow-sm">
            <Clock className="w-3 h-3" />
            Awaiting DBR Approval
          </Badge>
        )
      case 'error':
        return (
          <Badge className="bg-gradient-to-r from-red-100 to-red-50 text-red-700 border-red-200 gap-1 shadow-sm">
            <XCircle className="w-3 h-3" />
            Error
          </Badge>
        )
    }
  }

  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="w-[30%] bg-gradient-to-br from-gray-50 to-purple-50/30 p-6 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Bot className="w-5 h-5 text-[#8c58d0]" />
          AI Orchestration Timeline
        </h2>
        <Badge variant="outline" className="text-xs bg-white border-purple-200 text-[#8c58d0] shadow-sm">
          <Sparkles className="w-3 h-3 mr-1" />
          Orchestrator Active
        </Badge>
      </div>

      <div className="space-y-4">
        {activities.length === 0 ? (
          <Card className="bg-white shadow-md border-purple-100 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8">
                <Clock className="w-12 h-12 text-purple-300 mb-3" />
                <p className="text-gray-500 text-center text-sm">No agent activity yet</p>
                <p className="text-xs text-gray-400 mt-2">Timeline will appear here</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          activities.map((activity, idx) => (
            <div key={activity.id} className="relative">
              {/* Timeline Connector - Purple gradient */}
              {idx < activities.length - 1 && (
                <div className="absolute left-6 top-20 bottom-0 w-0.5 bg-gradient-to-b from-[#8c58d0] to-purple-300 -mb-4 opacity-50" />
              )}

              <Card className="bg-white relative shadow-md hover:shadow-xl border-l-4 border-l-[#8c58d0] transition-all animate-in slide-in-from-left-4 duration-300">
                <CardHeader className="pb-3 bg-gradient-to-r from-purple-50/50 to-white">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#8c58d0] to-[#9b6dd9] rounded-xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                        <activity.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-bold text-gray-900">{activity.agentName}</CardTitle>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {activity.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(activity.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <TrendingUp className="w-4 h-4 text-[#8c58d0] mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-1">Trigger Reason</p>
                      <p className="text-sm text-gray-900">{activity.triggerReason}</p>
                    </div>
                  </div>

                  {activity.confidence !== undefined && (
                    <div className="bg-gradient-to-br from-purple-50 to-white p-3 rounded-lg border border-purple-100">
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-gray-600 font-medium">Confidence</span>
                        <span className="font-bold text-[#8c58d0]">
                          {Math.round(activity.confidence * 100)}%
                        </span>
                      </div>
                      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#8c58d0] to-[#9b6dd9] rounded-full transition-all duration-500"
                          style={{ width: `${activity.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {activity.output && (
                    <div>
                      <button
                        onClick={() =>
                          setExpandedId(expandedId === activity.id ? null : activity.id)
                        }
                        className="flex items-center gap-1 text-xs text-[#8c58d0] hover:text-[#9b6dd9] font-medium transition-colors"
                      >
                        {expandedId === activity.id ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                        Output Summary
                      </button>
                      {expandedId === activity.id && (
                        <div className="mt-2 p-3 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg text-xs text-gray-700 border border-purple-100 shadow-inner animate-in slide-in-from-top-2 duration-300">
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
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-purple-50/20">
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
