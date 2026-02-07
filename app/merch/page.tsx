'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Download, RefreshCw } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { JobStatusCard } from '@/components/job-status-card'
import { useToast } from '@/hooks/use-toast'
import type { Job, JobLog } from '@/lib/types'

type ProductType = 'mug' | 'phone_case' | 'tshirt'
type Density = 'sparse' | 'medium' | 'dense'
type Style = 'flat' | 'vintage' | 'ink' | 'modern_minimal'
type ColorMood = 'warm' | 'cool' | 'natural' | 'elegant' | 'vibrant'

type MerchDetail = {
  id: string
  name: string
  pattern: { storagePath: string; url: string } | null
  mockups: Array<{ storagePath: string; url: string }>
}

export default function MerchStudioPage() {
  const [productType, setProductType] = useState<ProductType>('mug')
  const [themeKeywords, setThemeKeywords] = useState('北京,长城,文化')
  const [colorMood, setColorMood] = useState<ColorMood>('warm')
  const [density, setDensity] = useState<Density>('medium')
  const [styleLock, setStyleLock] = useState<Style>('flat')
  const [jobId, setJobId] = useState<string | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [designId, setDesignId] = useState<string | null>(null)
  const [detail, setDetail] = useState<MerchDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const loadDetail = async (id: string) => {
    const response = await fetch(`/api/merch/${id}`)
    if (!response.ok) return
    const data = await response.json()
    setDetail(data)
  }

  useEffect(() => {
    if (!jobId) return
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/merch/status?jobId=${jobId}`)
        if (!response.ok) return
        const data = await response.json()

        const logs: JobLog[] = (data.logs || []).map(
          (
            log: { level: 'info' | 'warning' | 'error'; message: string; timestamp: string },
            index: number
          ) => ({
            id: `${index + 1}`,
            timestamp: new Date(log.timestamp).toLocaleTimeString('zh-CN'),
            message: log.message,
            level: log.level,
          })
        )

        setJob({
          id: data.jobId,
          name: '商品设计生成',
          status: data.status,
          progress: data.progress,
          logs,
          createdAt: '',
          updatedAt: new Date().toISOString(),
        })

        if (data.status === 'done') {
          clearInterval(timer)
          const id = data.result?.designId
          if (id) {
            setDesignId(id)
            await loadDetail(id)
          }
          setLoading(false)
        }

        if (data.status === 'failed') {
          clearInterval(timer)
          setLoading(false)
          toast({
            title: '生成失败',
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

  const startGenerate = async () => {
    const keywords = themeKeywords
      .split(',')
      .map((text) => text.trim())
      .filter(Boolean)

    setLoading(true)
    setJob(null)
    setDesignId(null)
    setDetail(null)

    try {
      const response = await fetch('/api/merch/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productType,
          themeKeywords: keywords,
          colorMood,
          density,
          styleLock,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || '创建任务失败')
      }

      const data = await response.json()
      setJobId(data.jobId)
      toast({ title: '任务已创建', description: '开始轮询生成进度' })
    } catch (error) {
      setLoading(false)
      toast({
        title: '请求失败',
        description: (error as Error).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b border-border bg-card sticky top-0 z-30 shadow-sm">
        <div className="px-4 py-5 md:px-8 md:py-7">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            商品设计工作室
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            真实链路：生成任务 -&gt; 轮询状态 -&gt; 获取 pattern/mockup URL
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 md:px-8 md:py-10 max-w-5xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>生成参数</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>产品类型</Label>
                <RadioGroup
                  value={productType}
                  onValueChange={(value) => setProductType(value as ProductType)}
                  className="grid grid-cols-1 md:grid-cols-3 gap-3"
                >
                  <label className="border rounded-lg p-3 flex items-center gap-2">
                    <RadioGroupItem value="mug" />
                    水杯
                  </label>
                  <label className="border rounded-lg p-3 flex items-center gap-2">
                    <RadioGroupItem value="phone_case" />
                    手机壳
                  </label>
                  <label className="border rounded-lg p-3 flex items-center gap-2">
                    <RadioGroupItem value="tshirt" />
                    T 恤
                  </label>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>主题关键词（逗号分隔）</Label>
                <Input value={themeKeywords} onChange={(e) => setThemeKeywords(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>色彩</Label>
                  <Input value={colorMood} onChange={(e) => setColorMood(e.target.value as ColorMood)} />
                </div>
                <div className="space-y-2">
                  <Label>密度</Label>
                  <Input value={density} onChange={(e) => setDensity(e.target.value as Density)} />
                </div>
                <div className="space-y-2">
                  <Label>风格</Label>
                  <Input value={styleLock} onChange={(e) => setStyleLock(e.target.value as Style)} />
                </div>
              </div>

              <Button onClick={startGenerate} disabled={loading} className="w-full gap-2">
                <Sparkles className="w-4 h-4" />
                {loading ? '生成中...' : '开始生成'}
              </Button>
            </CardContent>
          </Card>

          {job && <JobStatusCard job={job} />}

          {designId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>设计结果</span>
                  <Button variant="outline" size="sm" onClick={() => loadDetail(designId)} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    刷新 URL
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {detail?.pattern?.url ? (
                  <div className="space-y-2">
                    <Label>图案</Label>
                    <Image
                      src={detail.pattern.url}
                      alt="pattern"
                      width={1024}
                      height={1024}
                      unoptimized
                      className="w-full max-w-md rounded-lg border"
                    />
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => window.open(detail.pattern?.url, '_blank')}
                    >
                      <Download className="w-4 h-4" />
                      下载图案
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">图案尚未就绪</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(detail?.mockups || []).map((mockup, index) => (
                    <div key={mockup.storagePath} className="border rounded-lg p-3 space-y-2">
                      <Image
                        src={mockup.url}
                        alt={`mockup-${index + 1}`}
                        width={1024}
                        height={1024}
                        unoptimized
                        className="w-full rounded border"
                      />
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => window.open(mockup.url, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                        下载效果图 {index + 1}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
