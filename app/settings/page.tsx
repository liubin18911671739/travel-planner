'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    brandName: '研学行程生成器',
    brandColor: '#2c5aa0',
    apiKey: '',
    notifications: true,
    autoSave: true,
  })
  const { toast } = useToast()

  const handleSave = () => {
    toast({
      title: '保存成功',
      description: '您的设置已保存',
    })
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-30">
        <div className="px-4 py-4 md:px-6 md:py-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              设置
            </h1>
            <p className="text-sm text-muted-foreground">
              管理您的账户和应用设置
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 md:px-6 md:py-8 max-w-2xl mx-auto space-y-6">
          {/* Branding Settings */}
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
                    handleInputChange('brandName', e.target.value)
                  }
                  placeholder="输入品牌名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandColor">品牌颜色</Label>
                <div className="flex gap-2">
                  <Input
                    id="brandColor"
                    type="color"
                    value={settings.brandColor}
                    onChange={(e) =>
                      handleInputChange('brandColor', e.target.value)
                    }
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    value={settings.brandColor}
                    onChange={(e) =>
                      handleInputChange('brandColor', e.target.value)
                    }
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Settings */}
          <Card>
            <CardHeader>
              <CardTitle>API 设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API 密钥</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={settings.apiKey}
                  onChange={(e) => handleInputChange('apiKey', e.target.value)}
                  placeholder="输入您的 API 密钥"
                />
                <p className="text-xs text-muted-foreground">
                  保持此密钥安全，不要与他人分享
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle>通知设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">启用通知</p>
                  <p className="text-xs text-muted-foreground">
                    接收任务完成和错误通知
                  </p>
                </div>
                <Switch
                  checked={settings.notifications}
                  onCheckedChange={(value) =>
                    handleInputChange('notifications', value)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">自动保存</p>
                  <p className="text-xs text-muted-foreground">
                    自动保存您的工作进度
                  </p>
                </div>
                <Switch
                  checked={settings.autoSave}
                  onCheckedChange={(value) =>
                    handleInputChange('autoSave', value)
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Plan Settings */}
          <Card>
            <CardHeader>
              <CardTitle>订阅计划</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-accent/5">
                <div>
                  <p className="font-semibold text-foreground">专业版</p>
                  <p className="text-sm text-muted-foreground">¥99/月</p>
                </div>
                <Button>升级计划</Button>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex gap-2">
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              保存设置
            </Button>
            <Button variant="outline">取消</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
