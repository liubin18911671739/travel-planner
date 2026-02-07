'use client'

import { useEffect, useState } from 'react'
import { Save, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

type UserSettings = {
  brandName: string
  brandColor: string
  notifications: boolean
  autoSave: boolean
}

const DEFAULT_SETTINGS: UserSettings = {
  brandName: '研学行程生成器',
  brandColor: '#2c5aa0',
  notifications: true,
  autoSave: true,
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const loadSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/settings')
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || '加载失败')
      }

      const data = await response.json()
      setSettings({ ...DEFAULT_SETTINGS, ...(data.settings || {}) })
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
    loadSettings().catch(console.error)
  }, [])

  const handleSave = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || '保存失败')
      }

      toast({
        title: '保存成功',
        description: '设置已写入数据库',
      })
    } catch (error) {
      toast({
        title: '保存失败',
        description: (error as Error).message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b border-border bg-card sticky top-0 z-30">
        <div className="px-4 py-4 md:px-6 md:py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">设置</h1>
            <p className="text-sm text-muted-foreground">最小可用设置持久化</p>
          </div>
          <Button variant="outline" onClick={loadSettings} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 md:px-6 md:py-8 max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>品牌设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brandName">品牌名称</Label>
                <Input
                  id="brandName"
                  value={settings.brandName}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, brandName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandColor">品牌颜色</Label>
                <div className="flex gap-2">
                  <Input
                    id="brandColor"
                    type="color"
                    className="w-20 h-10 cursor-pointer"
                    value={settings.brandColor}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, brandColor: e.target.value }))
                    }
                  />
                  <Input
                    value={settings.brandColor}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, brandColor: e.target.value }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>行为偏好</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">启用通知</p>
                  <p className="text-xs text-muted-foreground">接收任务完成通知</p>
                </div>
                <Switch
                  checked={settings.notifications}
                  onCheckedChange={(value) =>
                    setSettings((prev) => ({ ...prev, notifications: value }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自动保存</p>
                  <p className="text-xs text-muted-foreground">自动保存页面编辑状态</p>
                </div>
                <Switch
                  checked={settings.autoSave}
                  onCheckedChange={(value) =>
                    setSettings((prev) => ({ ...prev, autoSave: value }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} className="gap-2" disabled={loading}>
            <Save className="w-4 h-4" />
            保存设置
          </Button>
        </div>
      </div>
    </div>
  )
}
