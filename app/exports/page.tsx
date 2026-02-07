'use client'

import { Download, FileText, Download as DownloadIcon, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

const exportHistory = [
  {
    id: '1',
    name: '北京研学行程 - 2024年2月',
    type: 'PDF',
    size: 5120,
    createdAt: '2024-02-06T10:30:00Z',
  },
  {
    id: '2',
    name: '上海科技馆参访 - PowerPoint',
    type: 'PPTX',
    size: 8192,
    createdAt: '2024-02-05T14:20:00Z',
  },
  {
    id: '3',
    name: '西安历史文化行程',
    type: 'DOCX',
    size: 2048,
    createdAt: '2024-02-04T09:15:00Z',
  },
]

export default function ExportsPage() {
  const { toast } = useToast()

  const handleExport = (format: 'pdf' | 'pptx' | 'docx') => {
    toast({
      title: '导出开始',
      description: `正在导出 ${format.toUpperCase()} 文件...`,
    })
  }

  const handleDownload = (fileName: string) => {
    toast({
      title: '下载中',
      description: `${fileName} 正在下载`,
    })
  }

  const handleDelete = (id: string) => {
    toast({
      title: '删除成功',
      description: '导出文件已删除',
    })
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-30">
        <div className="px-4 py-4 md:px-6 md:py-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              导出与交付
            </h1>
            <p className="text-sm text-muted-foreground">
              导出行程为各种格式并查看历史记录
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 md:px-6 md:py-8 max-w-4xl mx-auto space-y-6">
          {/* Export Options */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4">导出为</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary">
                <CardContent className="pt-6">
                  <div
                    className="text-center space-y-4"
                    onClick={() => handleExport('pdf')}
                  >
                    <div className="text-5xl">📄</div>
                    <div>
                      <h3 className="font-semibold text-foreground">PDF</h3>
                      <p className="text-xs text-muted-foreground">
                        打印友好格式
                      </p>
                    </div>
                    <Button className="w-full gap-2">
                      <Download className="w-4 h-4" />
                      导出为 PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary">
                <CardContent className="pt-6">
                  <div
                    className="text-center space-y-4"
                    onClick={() => handleExport('pptx')}
                  >
                    <div className="text-5xl">📊</div>
                    <div>
                      <h3 className="font-semibold text-foreground">PowerPoint</h3>
                      <p className="text-xs text-muted-foreground">
                        演示文稿格式
                      </p>
                    </div>
                    <Button className="w-full gap-2">
                      <Download className="w-4 h-4" />
                      导出为 PPTX
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary">
                <CardContent className="pt-6">
                  <div
                    className="text-center space-y-4"
                    onClick={() => handleExport('docx')}
                  >
                    <div className="text-5xl">📝</div>
                    <div>
                      <h3 className="font-semibold text-foreground">Word</h3>
                      <p className="text-xs text-muted-foreground">
                        可编辑文档
                      </p>
                    </div>
                    <Button className="w-full gap-2">
                      <Download className="w-4 h-4" />
                      导出为 DOCX
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Export History */}
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4">导出历史</h2>
            {exportHistory.length > 0 ? (
              <div className="space-y-3">
                {exportHistory.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="w-5 h-5 text-primary" />
                          <div className="flex-1">
                            <h3 className="font-medium text-foreground">
                              {item.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.createdAt).toLocaleString(
                                'zh-CN'
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {(item.size / 1024).toFixed(1)} KB
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(item.name)}
                          >
                            <DownloadIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="pt-12 pb-12">
                  <div className="text-center">
                    <p className="text-muted-foreground">暂无导出记录</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
