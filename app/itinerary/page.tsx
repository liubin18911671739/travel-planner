'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  Calendar,
  Download,
  Share2,
  ChevronDown,
  ChevronUp,
  FileText,
  Presentation,
  Sparkles,
  Database,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { JobStatusCard } from '@/components/job-status-card'
import { Separator } from '@/components/ui/separator'
import type { Job } from '@/lib/types'

interface ItineraryFormData {
  destination: string
  days: number
  startDate: string
  language: string
  theme: string
  ageGroup: string
  peopleCount: string
  intensity: string
  riskLevel: string
  budget: string
  accommodation: string
  dining: string
  mustVisit: string
  constraints: string
  timeWindows: string
  rainyDayPlan: boolean
  useKnowledgeBase: boolean
  autoCreateProducts: boolean
}

export default function ItineraryPage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedJob, setGeneratedJob] = useState<Job | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [expandedDays, setExpandedDays] = useState<number[]>([])
  const { toast } = useToast()

  const { register, handleSubmit, watch, setValue } =
    useForm<ItineraryFormData>({
      defaultValues: {
        days: 3,
        language: 'zh',
        theme: 'comprehensive',
        ageGroup: 'middle-school',
        peopleCount: '30-50',
        intensity: 'medium',
        riskLevel: 'low',
        accommodation: 'standard',
        dining: 'mixed',
        rainyDayPlan: true,
        useKnowledgeBase: false,
        autoCreateProducts: false,
      },
    })

  const formData = watch()

  const onSubmit = (data: ItineraryFormData) => {
    setIsGenerating(true)
    setShowResults(false)

    // Create mock job
    const mockJob: Job = {
      id: `job-${Date.now()}`,
      name: `生成${data.destination}研学行程`,
      status: 'running',
      progress: 0,
      logs: [
        {
          id: '1',
          timestamp: new Date().toLocaleTimeString('zh-CN'),
          message: '开始生成行程...',
          level: 'info',
        },
        {
          id: '2',
          timestamp: new Date().toLocaleTimeString('zh-CN'),
          message: '分析目的地信息...',
          level: 'info',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setGeneratedJob(mockJob)

    // Simulate progress
    let progress = 0
    const interval = setInterval(() => {
      progress += 10
      setGeneratedJob((prev) => {
        if (!prev) return null
        return {
          ...prev,
          progress,
          logs: [
            ...prev.logs,
            {
              id: `${prev.logs.length + 1}`,
              timestamp: new Date().toLocaleTimeString('zh-CN'),
              message: `正在处理... ${progress}%`,
              level: 'info',
            },
          ],
        }
      })

      if (progress >= 100) {
        clearInterval(interval)
        setGeneratedJob((prev) => {
          if (!prev) return null
          return {
            ...prev,
            status: 'done',
            progress: 100,
            logs: [
              ...prev.logs,
              {
                id: `${prev.logs.length + 1}`,
                timestamp: new Date().toLocaleTimeString('zh-CN'),
                message: '生成完成!',
                level: 'info',
              },
            ],
          }
        })
        setIsGenerating(false)
        setShowResults(true)
        toast({
          title: '行程生成成功',
          description: '您的研学行程已经生成完成',
        })
      }
    }, 800)
  }

  const toggleDay = (day: number) => {
    setExpandedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  // Mock generated itinerary days
  const generatedDays = Array.from({ length: formData.days || 3 }, (_, i) => ({
    day: i + 1,
    title: `第 ${i + 1} 天 - ${formData.destination}文化体验`,
    description: `探索${formData.destination}的历史文化遗产，参观重要景点和博物馆`,
    activities: [
      '上午: 参观历史遗迹',
      '中午: 当地特色午餐',
      '下午: 互动体验活动',
      '晚上: 总结分享会',
    ],
  }))

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-30 shadow-sm">
        <div className="px-4 py-5 md:px-8 md:py-7">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              行程生成器
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              智能生成专业研学行程方案
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 md:px-8 md:py-10 max-w-5xl mx-auto space-y-6">
          {/* Sticky Summary Card */}
          <Card className="sticky top-0 z-20 shadow-md border-l-4 border-l-primary bg-card">
            <CardContent className="pt-5 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">
                    目的地
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {formData.destination || '未设置'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">
                    天数
                  </p>
                  <p className="text-sm font-bold text-primary">
                    {formData.days} 天
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">
                    主题
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {formData.theme === 'comprehensive'
                      ? '综合'
                      : formData.theme === 'history'
                        ? '历史'
                        : formData.theme === 'geography'
                          ? '地理'
                          : formData.theme === 'nature'
                            ? '自然'
                            : formData.theme === 'museum'
                              ? '博物馆'
                              : '红色研学'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">
                    人群
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {formData.ageGroup === 'primary'
                      ? '小学'
                      : formData.ageGroup === 'middle-school'
                        ? '初中'
                        : '高中'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">
                    预算
                  </p>
                  <p className="text-sm font-bold text-green-600">
                    {formData.budget || '未设置'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">
                    状态
                  </p>
                  <Badge
                    variant={
                      isGenerating
                        ? 'default'
                        : showResults
                          ? 'default'
                          : 'outline'
                    }
                    className="text-xs"
                  >
                    {isGenerating ? '生成中' : showResults ? '已完成' : '待生成'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold">
                  行程配置
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {/* 基本信息 */}
                  <AccordionItem value="basic">
                    <AccordionTrigger className="text-base font-semibold hover:no-underline">
                      基本信息
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="destination">
                            目的地 <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="destination"
                            placeholder="例如: 北京"
                            {...register('destination', { required: true })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="days">
                            天数 <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={formData.days?.toString()}
                            onValueChange={(v) =>
                              setValue('days', parseInt(v))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                                <SelectItem key={d} value={d.toString()}>
                                  {d} 天
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="startDate">出发日期 (可选)</Label>
                          <Input
                            id="startDate"
                            type="date"
                            {...register('startDate')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="language">行程语言</Label>
                          <Select
                            value={formData.language}
                            onValueChange={(v) => setValue('language', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="zh">中文</SelectItem>
                              <SelectItem value="en">英文</SelectItem>
                              <SelectItem value="both">中英双语</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* 研学主题 */}
                  <AccordionItem value="theme">
                    <AccordionTrigger className="text-base font-semibold hover:no-underline">
                      研学主题
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="theme">选择主题</Label>
                        <Select
                          value={formData.theme}
                          onValueChange={(v) => setValue('theme', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="history">历史文化</SelectItem>
                            <SelectItem value="geography">地理探索</SelectItem>
                            <SelectItem value="nature">自然科学</SelectItem>
                            <SelectItem value="museum">博物馆参观</SelectItem>
                            <SelectItem value="red-tourism">
                              红色研学
                            </SelectItem>
                            <SelectItem value="comprehensive">
                              综合主题
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* 人群画像 */}
                  <AccordionItem value="demographics">
                    <AccordionTrigger className="text-base font-semibold hover:no-underline">
                      人群画像
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="ageGroup">年龄段</Label>
                          <Select
                            value={formData.ageGroup}
                            onValueChange={(v) => setValue('ageGroup', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="primary">
                                小学 (6-12岁)
                              </SelectItem>
                              <SelectItem value="middle-school">
                                初中 (13-15岁)
                              </SelectItem>
                              <SelectItem value="high-school">
                                高中 (16-18岁)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="peopleCount">人数</Label>
                          <Select
                            value={formData.peopleCount}
                            onValueChange={(v) => setValue('peopleCount', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10-30">10-30人</SelectItem>
                              <SelectItem value="30-50">30-50人</SelectItem>
                              <SelectItem value="50-100">50-100人</SelectItem>
                              <SelectItem value="100+">100人以上</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="intensity">体力强度</Label>
                          <Select
                            value={formData.intensity}
                            onValueChange={(v) => setValue('intensity', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">低强度</SelectItem>
                              <SelectItem value="medium">中等强度</SelectItem>
                              <SelectItem value="high">高强度</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="riskLevel">风险偏好</Label>
                          <Select
                            value={formData.riskLevel}
                            onValueChange={(v) => setValue('riskLevel', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">保守型</SelectItem>
                              <SelectItem value="medium">平衡型</SelectItem>
                              <SelectItem value="high">冒险型</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* 预算 */}
                  <AccordionItem value="budget">
                    <AccordionTrigger className="text-base font-semibold hover:no-underline">
                      预算配置
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="budget">人均预算 (元)</Label>
                          <Input
                            id="budget"
                            type="number"
                            placeholder="例如: 3000"
                            {...register('budget')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accommodation">住宿偏好</Label>
                          <Select
                            value={formData.accommodation}
                            onValueChange={(v) => setValue('accommodation', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="budget">经济型</SelectItem>
                              <SelectItem value="standard">标准型</SelectItem>
                              <SelectItem value="premium">舒适型</SelectItem>
                              <SelectItem value="luxury">豪华型</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dining">餐饮偏好</Label>
                          <Select
                            value={formData.dining}
                            onValueChange={(v) => setValue('dining', v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="simple">简餐</SelectItem>
                              <SelectItem value="mixed">混合</SelectItem>
                              <SelectItem value="local">特色美食</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* 约束条件 */}
                  <AccordionItem value="constraints">
                    <AccordionTrigger className="text-base font-semibold hover:no-underline">
                      约束条件
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="mustVisit">
                            必去景点 (每行一个)
                          </Label>
                          <Textarea
                            id="mustVisit"
                            placeholder="例如:&#10;故宫&#10;长城&#10;天坛"
                            rows={3}
                            {...register('mustVisit')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="constraints">禁忌/特殊要求</Label>
                          <Textarea
                            id="constraints"
                            placeholder="例如: 不安排晚上外出活动、避免过于拥挤的景点"
                            rows={2}
                            {...register('constraints')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="timeWindows">时间窗口限制</Label>
                          <Textarea
                            id="timeWindows"
                            placeholder="例如: 上午9点后出发、下午4点前返回酒店"
                            rows={2}
                            {...register('timeWindows')}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="rainyDayPlan"
                            checked={formData.rainyDayPlan}
                            onCheckedChange={(checked) =>
                              setValue('rainyDayPlan', checked as boolean)
                            }
                          />
                          <Label htmlFor="rainyDayPlan" className="font-normal">
                            包含雨天备选方案
                          </Label>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card className="shadow-sm">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium text-sm">使用知识库增强</p>
                        <p className="text-xs text-muted-foreground">
                          从知识库中提取相关信息优化行程
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={formData.useKnowledgeBase}
                      onCheckedChange={(checked) =>
                        setValue('useKnowledgeBase', checked)
                      }
                    />
                  </div>

                  {formData.useKnowledgeBase && (
                    <div className="pl-4 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        已选择知识库源:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">北京旅游指南.pdf</Badge>
                        <Badge variant="secondary">历史背景资料.docx</Badge>
                        <Badge variant="outline" className="cursor-pointer">
                          + 选择更多
                        </Badge>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 p-4 rounded-lg border">
                    <Checkbox
                      id="autoCreateProducts"
                      checked={formData.autoCreateProducts}
                      onCheckedChange={(checked) =>
                        setValue('autoCreateProducts', checked as boolean)
                      }
                    />
                    <Label
                      htmlFor="autoCreateProducts"
                      className="font-normal text-sm"
                    >
                      生成后自动创建商品图案
                    </Label>
                  </div>
                </div>

                <Separator />

                <Button
                  type="submit"
                  size="lg"
                  className="w-full gap-2 shadow-lg text-base font-semibold"
                  disabled={isGenerating || !formData.destination}
                >
                  <Sparkles className="w-5 h-5" />
                  {isGenerating ? '正在生成...' : '生成行程'}
                </Button>
              </CardContent>
            </Card>
          </form>

          {/* Job Status */}
          {generatedJob && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">生成进度</h2>
              <JobStatusCard job={generatedJob} />
            </div>
          )}

          {/* Results Section */}
          {showResults && (
            <div className="space-y-6">
              <Card className="shadow-md border-l-4 border-l-green-500">
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <span className="text-2xl">✓</span>
                    行程生成完成
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Button variant="default" className="gap-2">
                      <Share2 className="w-4 h-4" />
                      分享页面
                    </Button>
                    <Button variant="outline" className="gap-2 bg-transparent">
                      <FileText className="w-4 h-4" />
                      下载 PDF
                    </Button>
                    <Button variant="outline" className="gap-2 bg-transparent">
                      <Presentation className="w-4 h-4" />
                      下载 PPTX
                    </Button>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold text-lg mb-3">行程预览</h3>
                    <div className="space-y-3">
                      {generatedDays.map((day) => (
                        <Card
                          key={day.day}
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => toggleDay(day.day)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge className="bg-primary text-primary-foreground">
                                  第 {day.day} 天
                                </Badge>
                                <h4 className="font-semibold">{day.title}</h4>
                              </div>
                              {expandedDays.includes(day.day) ? (
                                <ChevronUp className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                          </CardHeader>
                          {expandedDays.includes(day.day) && (
                            <CardContent className="space-y-3">
                              <p className="text-sm text-muted-foreground">
                                {day.description}
                              </p>
                              <div className="space-y-2">
                                <p className="text-sm font-semibold">
                                  活动安排:
                                </p>
                                <ul className="space-y-1.5">
                                  {day.activities.map((activity, idx) => (
                                    <li
                                      key={idx}
                                      className="text-sm pl-4 border-l-2 border-primary/30"
                                    >
                                      {activity}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
