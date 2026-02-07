'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import type { Job } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface JobStatusCardProps {
  job: Job
}

export function JobStatusCard({ job }: JobStatusCardProps) {
  const [logsExpanded, setLogsExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const getStatusIcon = () => {
    switch (job.status) {
      case 'done':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
    }
  }

  const getStatusBadgeVariant = ():
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline' => {
    switch (job.status) {
      case 'done':
        return 'default'
      case 'failed':
        return 'destructive'
      case 'running':
        return 'default'
      case 'pending':
        return 'secondary'
    }
  }

  const getStatusLabel = () => {
    switch (job.status) {
      case 'done':
        return '完成'
      case 'failed':
        return '失败'
      case 'running':
        return '运行中'
      case 'pending':
        return '待处理'
    }
  }

  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-primary/30">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <CardTitle className="text-lg font-bold tracking-tight">
                {job.name}
              </CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant={getStatusBadgeVariant()}
                className="font-medium shadow-sm"
              >
                {getStatusLabel()}
              </Badge>
              <span className="text-sm text-muted-foreground font-medium">
                {job.progress}%
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Progress value={job.progress} className="h-2.5 shadow-inner" />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            更新时间:{' '}
            {mounted
              ? new Date(job.updatedAt).toLocaleString('zh-CN')
              : job.updatedAt.replace('T', ' ').replace('Z', '')}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLogsExpanded(!logsExpanded)}
            className="h-auto py-1 px-2 text-xs font-medium hover:bg-secondary"
          >
            {logsExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 mr-1.5" />
                隐藏日志
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 mr-1.5" />
                查看日志
              </>
            )}
          </Button>
        </div>

        {logsExpanded && (
          <ScrollArea className="border rounded-lg bg-muted/40 max-h-48 shadow-inner">
            <div className="p-4 font-mono text-xs space-y-1.5">
              {job.logs.map((log) => (
                <div key={log.id} className="flex gap-3 leading-relaxed">
                  <span className="text-muted-foreground min-w-fit font-medium">
                    [{log.timestamp}]
                  </span>
                  <span
                    className={
                      log.level === 'error'
                        ? 'text-red-600 font-medium'
                        : log.level === 'warning'
                          ? 'text-yellow-600 font-medium'
                          : 'text-foreground'
                    }
                  >
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
