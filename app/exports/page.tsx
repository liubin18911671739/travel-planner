'use client'

import { useEffect, useState } from 'react'
import { Download, RefreshCw, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

type ExportItem = {
  artifactId: string
  kind: string
  ownerType: 'itinerary' | 'merch'
  ownerId: string
  ownerName: string
  fileSize: number
  createdAt: string
}

export default function ExportsPage() {
  const [items, setItems] = useState<ExportItem[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const loadItems = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/exports')
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || '加载失败')
      }
      const data = await response.json()
      setItems(data.items || [])
    } catch (error) {
      toast({
        title: '加载失败',
        description: (error as Error).message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems().catch(console.error)
  }, [])

  const downloadArtifact = async (artifactId: string) => {
    try {
      const response = await fetch(`/api/exports/artifacts/${artifactId}/download`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || '下载失败')
      }

      const data = await response.json()
      window.open(data.url, '_blank')
    } catch (error) {
      toast({
        title: '下载失败',
        description: (error as Error).message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b border-border bg-card sticky top-0 z-30">
        <div className="px-4 py-4 md:px-6 md:py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">导出与交付</h1>
            <p className="text-sm text-muted-foreground">统一读取 artifacts 并下载</p>
          </div>
          <Button variant="outline" onClick={loadItems} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 md:px-6 md:py-8 max-w-5xl mx-auto space-y-4">
          {items.map((item) => (
            <Card key={item.artifactId}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-medium">{item.ownerName}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString('zh-CN')} ·{' '}
                        {(item.fileSize / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.ownerType}</Badge>
                    <Badge>{item.kind}</Badge>
                    <Button size="sm" className="gap-2" onClick={() => downloadArtifact(item.artifactId)}>
                      <Download className="w-4 h-4" />
                      下载
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {items.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>暂无导出内容</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">请先在行程或商品页面创建任务。</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
