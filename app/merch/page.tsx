'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Sparkles,
  Save,
  Store,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { JobStatusCard } from '@/components/job-status-card'
import { cn } from '@/lib/utils'
import type { Job, JobLog } from '@/lib/types'

type ProductType = 'mug' | 'phone_case' | 'tshirt'
type StyleLock = 'flat' | 'vintage' | 'ink' | 'modern_minimal'
type DensityLevel = 'sparse' | 'medium' | 'dense'

const PRODUCT_TYPES = [
  { id: 'mug', name: '水杯', icon: '🥤', sizes: ['350ml', '500ml', '750ml'] },
  {
    id: 'phone_case',
    name: '手机壳',
    icon: '📱',
    sizes: ['iPhone 14', 'iPhone 15', 'Samsung S24'],
  },
  { id: 'tshirt', name: '体恤', icon: '👕', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
]

const COLOR_MOODS = [
  { value: 'warm', label: '温暖', colors: ['#E84A5F', '#FF847C', '#FECEA8'] },
  { value: 'cool', label: '清凉', colors: ['#2E86AB', '#A23B72', '#F18F01'] },
  { value: 'natural', label: '自然', colors: ['#50A05D', '#8DBE6C', '#F4E285'] },
  { value: 'elegant', label: '优雅', colors: ['#41337A', '#9B72AA', '#D2B7E5'] },
  { value: 'vibrant', label: '活力', colors: ['#FF6B35', '#F7931E', '#FDC830'] },
]

const STYLE_LOCKS = [
  { value: 'flat', label: '扁平风格', description: '简洁现代' },
  { value: 'vintage', label: '复古风格', description: '怀旧经典' },
  { value: 'ink', label: '水墨风格', description: '中国风' },
  { value: 'modern_minimal', label: '极简风格', description: '简约时尚' },
]

export default function MerchStudioPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [productType, setProductType] = useState<ProductType>('mug')
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [themeKeywords, setThemeKeywords] = useState('')
  const [colorMood, setColorMood] = useState('warm')
  const [density, setDensity] = useState<DensityLevel>('medium')
  const [styleLock, setStyleLock] = useState<StyleLock>('flat')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [autoSave, setAutoSave] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [currentJob, setCurrentJob] = useState<Job | null>(null)
  const [designId, setDesignId] = useState<string | null>(null)
  const { toast } = useToast()

  // Poll job status when generating
  useEffect(() => {
    if (!jobId || !isGenerating) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/merch/status?jobId=${jobId}`)
        if (!response.ok) return

        const data = await response.json()
        setCurrentJob({
          id: data.jobId,
          name: '商品设计生成',
          status: data.status,
          progress: data.progress,
          logs: data.logs || [],
          createdAt: '',
          updatedAt: '',
        })

        if (data.status === 'done') {
          clearInterval(pollInterval)
          setIsGenerating(false)
          setIsGenerated(true)
          setDesignId(data.result?.designId || null)
          toast({
            title: '生成成功',
            description: '图案已生成，请查看预览',
          })
        } else if (data.status === 'failed') {
          clearInterval(pollInterval)
          setIsGenerating(false)
          toast({
            title: '生成失败',
            description: data.error || '请重试',
            variant: 'destructive',
          })
        }
      } catch (error) {
        console.error('Failed to poll job status:', error)
      }
    }, 2000)

    return () => clearInterval(pollInterval)
  }, [jobId, isGenerating, toast])

  const steps = [
    { number: 1, title: '选择产品', description: '产品类型和尺寸' },
    { number: 2, title: '图案设置', description: '主题和风格' },
    { number: 3, title: '生成预览', description: '预览和下载' },
  ]

  const handleGenerate = async () => {
    setIsGenerating(true)
    setCurrentJob(null)
    setDesignId(null)

    const keywords = themeKeywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0)

    try {
      const response = await fetch('/api/merch/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productType,
          size: selectedSize,
          themeKeywords: keywords,
          colorMood,
          density,
          styleLock,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || '生成请求失败')
      }

      const data = await response.json()
      setJobId(data.jobId)
    } catch (error) {
      setIsGenerating(false)
      toast({
        title: '请求失败',
        description: (error as Error).message,
        variant: 'destructive',
      })
    }
  }

  const handleRegenerate = async () => {
    setIsGenerated(false)
    await handleGenerate()
  }

  const handleSaveToLibrary = () => {
    toast({
      title: '保存成功',
      description: '图案已保存到设计库',
    })
  }

  const handleDownload = (mockup: string) => {
    toast({
      title: '下载开始',
      description: `正在下载 ${mockup} 效果图`,
    })
  }

  const canProceedToStep2 = productType && selectedSize
  const canProceedToStep3 = themeKeywords.trim().length > 0

  const selectedProduct = PRODUCT_TYPES.find((p) => p.id === productType)

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-30 shadow-sm">
        <div className="px-4 py-5 md:px-8 md:py-7">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                <Sparkles className="w-7 h-7 text-accent" />
                商品设计工作室
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                生成独特的主题图案并应用到商品
              </p>
            </div>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center md:items-start flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className={cn(
                        'w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-sm',
                        currentStep > step.number
                          ? 'bg-primary text-primary-foreground'
                          : currentStep === step.number
                            ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                            : 'bg-secondary text-muted-foreground'
                      )}
                    >
                      {currentStep > step.number ? (
                        <Check className="w-4 h-4 md:w-5 md:h-5" />
                      ) : (
                        step.number
                      )}
                    </div>
                    <div className="hidden md:block">
                      <div
                        className={cn(
                          'font-semibold text-sm',
                          currentStep >= step.number
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        )}
                      >
                        {step.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {step.description}
                      </div>
                    </div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 flex-1 mx-2 transition-colors',
                      currentStep > step.number
                        ? 'bg-primary'
                        : 'bg-border'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 md:px-8 md:py-10 max-w-5xl mx-auto space-y-6">
          {/* Step 1: Choose Product */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">选择产品类型</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <RadioGroup
                    value={productType}
                    onValueChange={(value) => {
                      setProductType(value as ProductType)
                      setSelectedSize('')
                    }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {PRODUCT_TYPES.map((product) => (
                        <label
                          key={product.id}
                          className={cn(
                            'relative flex flex-col items-center p-6 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md',
                            productType === product.id
                              ? 'border-primary bg-primary/5 shadow-md'
                              : 'border-border bg-card hover:border-primary/40'
                          )}
                        >
                          <RadioGroupItem
                            value={product.id}
                            className="absolute top-4 right-4"
                          />
                          <span className="text-5xl mb-3">{product.icon}</span>
                          <span className="font-semibold text-lg">
                            {product.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </RadioGroup>

                  {selectedProduct && (
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">
                        选择尺寸规格
                      </Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {selectedProduct.sizes.map((size) => (
                          <Button
                            key={size}
                            variant={
                              selectedSize === size ? 'default' : 'outline'
                            }
                            onClick={() => setSelectedSize(size)}
                            className="h-auto py-3"
                          >
                            {size}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  size="lg"
                  onClick={() => setCurrentStep(2)}
                  disabled={!canProceedToStep2}
                  className="gap-2"
                >
                  下一步：图案设置
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Pattern Settings */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">主题关键词</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="keywords">
                      输入关键词（如：长城、故宫、北京、历史）
                    </Label>
                    <Input
                      id="keywords"
                      placeholder="输入主题关键词，用逗号分隔"
                      value={themeKeywords}
                      onChange={(e) => setThemeKeywords(e.target.value)}
                      className="text-base"
                    />
                    <p className="text-xs text-muted-foreground">
                      提示：关键词会影响图案的主题元素和风格
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">色彩基调</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup value={colorMood} onValueChange={setColorMood}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {COLOR_MOODS.map((mood) => (
                        <label
                          key={mood.value}
                          className={cn(
                            'flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md',
                            colorMood === mood.value
                              ? 'border-primary bg-primary/5 shadow-md'
                              : 'border-border bg-card hover:border-primary/40'
                          )}
                        >
                          <RadioGroupItem value={mood.value} />
                          <div className="flex-1">
                            <div className="font-semibold mb-2">
                              {mood.label}
                            </div>
                            <div className="flex gap-2">
                              {mood.colors.map((color, idx) => (
                                <div
                                  key={idx}
                                  className="w-8 h-8 rounded-full shadow-sm"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">图案密度</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>密度级别</Label>
                      <Badge variant="outline" className="font-medium">
                        {density === 'sparse'
                          ? '稀疏'
                          : density === 'medium'
                            ? '中等'
                            : '密集'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground min-w-fit">
                        稀疏
                      </span>
                      <Slider
                        value={[
                          density === 'sparse'
                            ? 0
                            : density === 'medium'
                              ? 50
                              : 100,
                        ]}
                        onValueChange={(value) => {
                          const val = value[0]
                          if (val < 33) setDensity('sparse')
                          else if (val < 67) setDensity('medium')
                          else setDensity('dense')
                        }}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground min-w-fit">
                        密集
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">风格锁定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RadioGroup value={styleLock} onValueChange={(v) => setStyleLock(v as StyleLock)}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {STYLE_LOCKS.map((style) => (
                        <label
                          key={style.value}
                          className={cn(
                            'flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md',
                            styleLock === style.value
                              ? 'border-primary bg-primary/5 shadow-md'
                              : 'border-border bg-card hover:border-primary/40'
                          )}
                        >
                          <RadioGroupItem value={style.value} className="mt-1" />
                          <div>
                            <div className="font-semibold mb-1">
                              {style.label}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {style.description}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setCurrentStep(1)}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一步
                </Button>
                <Button
                  size="lg"
                  onClick={() => setCurrentStep(3)}
                  disabled={!canProceedToStep3}
                  className="gap-2"
                >
                  下一步：生成预览
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Generate & Preview */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {!isGenerating && !isGenerated && (
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-xl">确认生成设置</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">产品</Label>
                        <div className="font-semibold">
                          {selectedProduct?.name} - {selectedSize}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">主题</Label>
                        <div className="font-semibold">{themeKeywords}</div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">色彩</Label>
                        <div className="font-semibold">
                          {
                            COLOR_MOODS.find((m) => m.value === colorMood)
                              ?.label
                          }
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">风格</Label>
                        <div className="font-semibold">
                          {
                            STYLE_LOCKS.find((s) => s.value === styleLock)
                              ?.label
                          }
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-4 border-t">
                      <Checkbox
                        id="auto-save"
                        checked={autoSave}
                        onCheckedChange={(checked) =>
                          setAutoSave(checked as boolean)
                        }
                      />
                      <label
                        htmlFor="auto-save"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        生成后自动保存到设计库
                      </label>
                    </div>
                  </CardContent>
                </Card>
              )}

              {isGenerating && currentJob && (
                <JobStatusCard job={currentJob} />
              )}

              {isGenerating && !currentJob && (
                <JobStatusCard
                  job={{
                    id: 'pending',
                    name: '商品设计生成',
                    status: 'running',
                    progress: 0,
                    logs: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }}
                />
              )}

              {isGenerated && (
                <>
                  <Card className="shadow-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">生成结果</CardTitle>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRegenerate}
                            className="gap-2 bg-transparent"
                          >
                            <Sparkles className="w-4 h-4" />
                            重新生成
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleSaveToLibrary}
                            className="gap-2"
                          >
                            <Save className="w-4 h-4" />
                            保存到设计库
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Pattern Preview */}
                      <div className="space-y-3">
                        <Label className="text-base font-semibold">
                          无缝图案
                        </Label>
                        <div className="w-full h-64 bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 rounded-xl border-2 border-dashed border-border flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <Sparkles className="w-12 h-12 mx-auto text-primary" />
                            <p className="text-sm text-muted-foreground">
                              生成的图案预览
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Mockups */}
                      <div className="space-y-3">
                        <Label className="text-base font-semibold">
                          商品效果图
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {['正面视图', '侧面视图', '场景展示'].map(
                            (mockup) => (
                              <Card
                                key={mockup}
                                className="border-2 hover:border-primary/40 transition-colors"
                              >
                                <CardContent className="p-4 space-y-3">
                                  <div className="w-full h-48 bg-gradient-to-br from-secondary to-muted rounded-lg flex items-center justify-center">
                                    <span className="text-4xl">
                                      {selectedProduct?.icon}
                                    </span>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="font-medium text-center">
                                      {mockup}
                                    </p>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full gap-2 bg-transparent"
                                      onClick={() => handleDownload(mockup)}
                                    >
                                      <Download className="w-4 h-4" />
                                      下载高清图
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Future Integration */}
                  <Card className="shadow-sm border-dashed bg-muted/30">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Store className="w-5 h-5 text-muted-foreground" />
                        <CardTitle className="text-lg text-muted-foreground">
                          未来扩展：电商集成
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          即将支持一键发布到：
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">
                            Printify
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Shopify
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            微信小店
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            抖音小店
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setCurrentStep(2)}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  上一步
                </Button>
                {!isGenerating && !isGenerated && (
                  <Button
                    size="lg"
                    onClick={handleGenerate}
                    className="gap-2 shadow-lg"
                  >
                    <Sparkles className="w-4 h-4" />
                    开始生成
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
