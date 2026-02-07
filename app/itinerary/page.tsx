'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Sparkles, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { JobStatusCard } from '@/components/job-status-card'
import type { Job, JobLog } from '@/lib/types'

type ItineraryFormData = {
  destination: string
  durationDays: number
  budget: string
  difficulty: string
}

type KnowledgePack = {
  id: string
  name: string
  description: string | null
}

type ItineraryDetail = {
  id: string
  name: string
  destination: string
  durationDays: number
  content: {
    days?: Array<{
      day: number
      title: string
      description: string
      activities?: Array<{ time: string; activity: string; location: string }>
    }>
  } | null
  artifacts: Array<{ kind: string; url: string | null }>
}

export default function ItineraryPage() {
  const [packs, setPacks] = useState<KnowledgePack[]>([])
  const [selectedPackIds, setSelectedPackIds] = useState<string[]>([])
  const [job, setJob] = useState<Job | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [itineraryId, setItineraryId] = useState<string | null>(null)
  const [itinerary, setItinerary] = useState<ItineraryDetail | null>(null)
  const [creating, setCreating] = useState(false)
  const { toast } = useToast()

  const { register, handleSubmit } = useForm<ItineraryFormData>({
    defaultValues: {
      destination: '',
      durationDays: 3,
      budget: '',
      difficulty: 'medium',
    },
  })

  const loadPacks = async () => {
    const response = await fetch('/api/knowledge/packs')
    if (!response.ok) return
    const data = await response.json()
    setPacks(data.packs || [])
  }

  const loadItinerary = async (id: string) => {
    const response = await fetch(`/api/itineraries/${id}`)
    if (!response.ok) {
      return
    }
    const data = await response.json()
    setItinerary(data)
  }

  useEffect(() => {
    loadPacks().catch(console.error)
  }, [])

  useEffect(() => {
    if (!jobId) return
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/itineraries/status?jobId=${jobId}`)
        if (!response.ok) return
        const data = await response.json()
        const logs: JobLog[] = (data.logs || []).map(
          (
            log: { level: 'info' | 'warning' | 'error'; message: string; timestamp: string },
            index: number
          ) => ({
            id: `${index + 1}`,
            level: log.level,
            message: log.message,
            timestamp: new Date(log.timestamp).toLocaleTimeString('zh-CN'),
          })
        )

        const nextJob: Job = {
          id: data.jobId,
          name: '行程生成任务',
          status: data.status,
          progress: data.progress,
          logs,
          createdAt: '',
          updatedAt: new Date().toISOString(),
        }
        setJob(nextJob)

        if (data.status === 'done') {
          const id = data.result?.itineraryId
          if (id) {
            setItineraryId(id)
            await loadItinerary(id)
          }
          setCreating(false)
          clearInterval(timer)
          toast({ title: '行程生成完成', description: '已获取最新结果' })
        }

        if (data.status === 'failed') {
          setCreating(false)
          clearInterval(timer)
          toast({
            title: '行程生成失败',
            description: data.error || '请稍后重试',
            variant: 'destructive',
          })
        }
      } catch (error) {
        console.error(error)
      }
    }, 2000)

    return () => clearInterval(timer)
  }, [jobId, toast])

  const onSubmit = async (formData: ItineraryFormData) => {
    setCreating(true)
    setItinerary(null)
    setItineraryId(null)
    setJob(null)

    try {
      const response = await fetch('/api/itineraries/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: formData.destination,
          durationDays: Number(formData.durationDays),
          knowledgePackIds: selectedPackIds,
          settings: {
            budget: formData.budget || undefined,
            difficulty: formData.difficulty || undefined,
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || '创建任务失败')
      }

      const data = await response.json()
      setJobId(data.jobId)
    } catch (error) {
      setCreating(false)
      toast({
        title: '请求失败',
        description: (error as Error).message,
        variant: 'destructive',
      })
    }
  }

  const downloadables = useMemo(
    () => (itinerary?.artifacts || []).filter((item) => item.url),
    [itinerary]
  )

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b border-border bg-card sticky top-0 z-30 shadow-sm">
        <div className="px-4 py-5 md:px-8 md:py-7">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            行程生成器
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            真实 API 链路：创建任务、轮询状态、展示导出结果
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 md:px-8 md:py-10 max-w-5xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>创建行程</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="destination">目的地</Label>
                    <Input
                      id="destination"
                      placeholder="例如：北京"
                      {...register('destination', { required: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="durationDays">天数</Label>
                    <Input
                      id="durationDays"
                      type="number"
                      min={1}
                      max={30}
                      {...register('durationDays', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="budget">预算</Label>
                    <Input id="budget" placeholder="例如：3000/人" {...register('budget')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">难度</Label>
                    <Input id="difficulty" placeholder="low/medium/high" {...register('difficulty')} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>知识包选择</Label>
                  <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-auto">
                    {packs.length === 0 && (
                      <p className="text-sm text-muted-foreground">暂无知识包</p>
                    )}
                    {packs.map((pack) => (
                      <label key={pack.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={selectedPackIds.includes(pack.id)}
                          onCheckedChange={(checked) => {
                            setSelectedPackIds((prev) =>
                              checked
                                ? [...prev, pack.id]
                                : prev.filter((id) => id !== pack.id)
                            )
                          }}
                        />
                        <span>{pack.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button type="submit" disabled={creating} className="w-full gap-2">
                  <Sparkles className="w-4 h-4" />
                  {creating ? '创建中...' : '生成行程'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {job && <JobStatusCard job={job} />}

          {itinerary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{itinerary.name}</span>
                  <Badge>{itinerary.destination}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(itinerary.content?.days || []).map((day) => (
                  <Card key={day.day}>
                    <CardHeader>
                      <CardTitle className="text-base">{day.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-muted-foreground">{day.description}</p>
                      {(day.activities || []).map((activity, idx) => (
                        <div key={`${day.day}-${idx}`} className="text-sm">
                          {activity.time} - {activity.activity}（{activity.location}）
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}

                {downloadables.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {downloadables.map((item, index) => (
                      <Button
                        key={`${item.kind}-${index}`}
                        variant="outline"
                        className="gap-2"
                        onClick={() => window.open(item.url as string, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                        下载 {item.kind.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {itineraryId && !itinerary && (
            <p className="text-sm text-muted-foreground">正在加载行程详情...</p>
          )}
        </div>
      </div>
    </div>
  )
}
