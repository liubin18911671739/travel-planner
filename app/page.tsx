'use client'

import { CardTitle } from "@/components/ui/card"
import { CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CardContent } from "@/components/ui/card"
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { mockJobs } from '@/lib/mock-data'
import type { Job } from '@/lib/types'
import {
  Plus,
  ChevronDown,
  CheckCircle,
  PlayCircle,
  Clock,
  XCircle,
  RefreshCw,
} from 'lucide-react'
import JobStatusCard from '@/components/JobStatusCard'

type FilterType = 'all' | 'running' | 'done' | 'failed'

export default function ItineraryPage() {
  const [jobs, setJobs] = useState(mockJobs)
  const [filter, setFilter] = useState<FilterType>('all')
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleCreateJob = () => {
    toast({
      title: '创建任务',
      description: '新任务已开始处理',
    })
  }

  const handleRefresh = () => {
    setIsLoading(true)
    // Simulate a refresh operation
    setTimeout(() => {
      setJobs(mockJobs)
      setIsLoading(false)
    }, 1000)
  }

  const toggleJobExpanded = (jobId: string) => {
    setExpandedJobs((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(jobId)) {
        newSet.delete(jobId)
      } else {
        newSet.add(jobId)
      }
      return newSet
    })
  }

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'all') return true
    return job.status === filter
  })

  const getStatusIcon = (status: Job['status']) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'running':
        return <PlayCircle className="w-4 h-4 text-blue-600" />
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />
    }
  }

  const getStatusText = (status: Job['status']) => {
    switch (status) {
      case 'done':
        return '已完成'
      case 'running':
        return '运行中'
      case 'pending':
        return '等待中'
      case 'failed':
        return '失败'
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-6 md:px-8 md:py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              行程生成器
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              创建和管理研学行程
            </p>
          </div>
          <Button
            onClick={handleCreateJob}
            className="gap-2 rounded-xl h-11 px-6"
            size="default"
          >
            <Plus className="w-4 h-4" />
            <span className="font-medium">新建</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-border bg-card px-4 md:px-8">
        <div className="flex gap-6">
          <button
            onClick={() => setFilter('all')}
            className={`py-4 px-2 text-sm font-medium transition-colors relative ${
              filter === 'all'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            全部
            {filter === 'all' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setFilter('running')}
            className={`py-4 px-2 text-sm font-medium transition-colors relative ${
              filter === 'running'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            进行中
            {filter === 'running' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setFilter('done')}
            className={`py-4 px-2 text-sm font-medium transition-colors relative ${
              filter === 'done'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            已完成
            {filter === 'done' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => setFilter('failed')}
            className={`py-4 px-2 text-sm font-medium transition-colors relative ${
              filter === 'failed'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            失败
            {filter === 'failed' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-background">
        <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl mx-auto space-y-4">
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job) => (
              <Card
                key={job.id}
                className="hover:shadow-md transition-shadow border border-border"
              >
                <div className="p-5 md:p-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <h3 className="text-base md:text-lg font-semibold text-foreground mb-1">
                        {job.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {mounted
                          ? new Date(job.updatedAt).toLocaleString('zh-CN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : job.updatedAt.replace('T', ' ').slice(0, 16)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      <span className="text-sm font-medium">
                        {getStatusText(job.status)}
                      </span>
                    </div>
                  </div>

                  {job.status === 'running' && (
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">进度</span>
                        <span className="font-medium">{job.progress}%</span>
                      </div>
                      <Progress value={job.progress} className="h-2" />
                    </div>
                  )}

                  <button
                    onClick={() => toggleJobExpanded(job.id)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>
                      查看日志 ({job.logs.length})
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        expandedJobs.has(job.id) ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {expandedJobs.has(job.id) && (
                    <div className="mt-4 p-4 bg-muted/40 rounded-lg border border-border">
                      <div className="space-y-2 font-mono text-xs">
                        {job.logs.map((log) => (
                          <div key={log.id} className="flex gap-3">
                            <span className="text-muted-foreground">
                              [{log.timestamp}]
                            </span>
                            <span
                              className={
                                log.level === 'error'
                                  ? 'text-red-600'
                                  : log.level === 'warning'
                                    ? 'text-yellow-600'
                                    : 'text-foreground'
                              }
                            >
                              {log.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">暂无任务</p>
              <Button onClick={handleCreateJob}>创建新任务</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
