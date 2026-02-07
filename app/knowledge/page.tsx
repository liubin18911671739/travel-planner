'use client'

import React from "react"

import { useState, useCallback } from 'react'
import {
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  FolderOpen,
  Plus,
  X,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { mockKnowledgeFiles } from '@/lib/mock-data'
import type { KnowledgeFile, KnowledgePack } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

export default function KnowledgePage() {
  const [files, setFiles] = useState<KnowledgeFile[]>(mockKnowledgeFiles)
  const [selectedFile, setSelectedFile] = useState<KnowledgeFile | null>(null)
  const [dragging, setDragging] = useState(false)
  const [packs, setPacks] = useState<KnowledgePack[]>([
    {
      id: '1',
      name: '北京历史线',
      description: '北京历史文化相关知识库',
      fileIds: ['1', '2'],
      createdAt: '2024-01-20T10:00:00Z',
    },
    {
      id: '2',
      name: '自然科学线',
      description: '自然博物馆相关知识库',
      fileIds: ['5'],
      createdAt: '2024-01-21T14:30:00Z',
    },
  ])
  const [showPackDialog, setShowPackDialog] = useState(false)
  const [newPackName, setNewPackName] = useState('')
  const [newPackDescription, setNewPackDescription] = useState('')
  const [selectedPackFileIds, setSelectedPackFileIds] = useState<string[]>([])
  const { toast } = useToast()

  const getStatusBadge = (status: KnowledgeFile['status']) => {
    const variants = {
      pending: { label: '待处理', variant: 'secondary' as const },
      indexing: { label: '索引中', variant: 'default' as const },
      ready: { label: '就绪', variant: 'default' as const },
      failed: { label: '失败', variant: 'destructive' as const },
    }
    const config = variants[status]
    return (
      <Badge
        variant={config.variant}
        className={
          status === 'ready'
            ? 'bg-green-100 text-green-800 border-green-300'
            : status === 'indexing'
              ? 'bg-blue-100 text-blue-800 border-blue-300'
              : ''
        }
      >
        {config.label}
      </Badge>
    )
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)

      const droppedFiles = Array.from(e.dataTransfer.files)
      const validFiles = droppedFiles.filter((file) => {
        const validTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'image/jpeg',
          'image/png',
        ]
        return validTypes.includes(file.type)
      })

      if (validFiles.length === 0) {
        toast({
          title: '文件类型不支持',
          description: '请上传 PDF、DOCX、TXT 或图片文件',
          variant: 'destructive',
        })
        return
      }

      // Simulate upload
      toast({
        title: '上传中',
        description: `正在上传 ${validFiles.length} 个文件...`,
      })

      // Mock API call
      setTimeout(() => {
        const newFiles: KnowledgeFile[] = validFiles.map((file, index) => ({
          id: `${Date.now()}-${index}`,
          name: file.name,
          type: file.type.split('/')[1].toUpperCase(),
          size: file.size,
          uploadedAt: new Date().toISOString(),
          status: 'pending' as const,
        }))

        setFiles((prev) => [...newFiles, ...prev])
        toast({
          title: '上传成功',
          description: `${validFiles.length} 个文件已上传`,
        })
      }, 1000)
    },
    [toast]
  )

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles) return

    const validFiles = Array.from(selectedFiles).filter((file) => {
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
      ]
      return validTypes.includes(file.type)
    })

    if (validFiles.length === 0) {
      toast({
        title: '文件类型不支持',
        description: '请上传 PDF、DOCX、TXT 或图片文件',
        variant: 'destructive',
      })
      return
    }

    toast({
      title: '上传中',
      description: `正在上传 ${validFiles.length} 个文件...`,
    })

    setTimeout(() => {
      const newFiles: KnowledgeFile[] = validFiles.map((file, index) => ({
        id: `${Date.now()}-${index}`,
        name: file.name,
        type: file.type.split('/')[1].toUpperCase(),
        size: file.size,
        uploadedAt: new Date().toISOString(),
        status: 'pending' as const,
      }))

      setFiles((prev) => [...newFiles, ...prev])
      toast({
        title: '上传成功',
        description: `${validFiles.length} 个文件已上传`,
      })
    }, 1000)
  }

  const handleReindex = async (fileId: string) => {
    toast({
      title: '重新索引',
      description: '正在重新索引文件...',
    })

    // Mock API call
    setTimeout(() => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: 'indexing' as const } : f
        )
      )

      setTimeout(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: 'ready' as const,
                  lastIndexedAt: new Date().toISOString(),
                }
              : f
          )
        )
        toast({
          title: '索引完成',
          description: '文件已重新索引',
        })
      }, 2000)
    }, 500)
  }

  const handleDelete = async (fileId: string) => {
    toast({
      title: '删除中',
      description: '正在删除文件...',
    })

    // Mock API call
    setTimeout(() => {
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
      setSelectedFile(null)
      toast({
        title: '删除成功',
        description: '文件已删除',
      })
    }, 500)
  }

  const handleCreatePack = () => {
    if (!newPackName.trim()) {
      toast({
        title: '名称不能为空',
        variant: 'destructive',
      })
      return
    }

    const newPack: KnowledgePack = {
      id: `${Date.now()}`,
      name: newPackName,
      description: newPackDescription,
      fileIds: selectedPackFileIds,
      createdAt: new Date().toISOString(),
    }

    setPacks((prev) => [...prev, newPack])
    setShowPackDialog(false)
    setNewPackName('')
    setNewPackDescription('')
    setSelectedPackFileIds([])

    toast({
      title: '创建成功',
      description: `知识包"${newPackName}"已创建`,
    })
  }

  const handleDeletePack = (packId: string) => {
    setPacks((prev) => prev.filter((p) => p.id !== packId))
    toast({
      title: '删除成功',
      description: '知识包已删除',
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-30 shadow-sm">
        <div className="px-4 py-5 md:px-8 md:py-7">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                知识库管理
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                上传和管理教学知识库文件
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="bg-card border-primary/20 hover:border-primary/40 transition-colors shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    总文件
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    {files.length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-green-200 hover:border-green-300 transition-colors shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    就绪
                  </p>
                  <p className="text-3xl font-bold text-green-600">
                    {files.filter((f) => f.status === 'ready').length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-blue-200 hover:border-blue-300 transition-colors shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    索引中
                  </p>
                  <p className="text-3xl font-bold text-blue-600">
                    {files.filter((f) => f.status === 'indexing').length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-accent/40 hover:border-accent/60 transition-colors shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    知识包
                  </p>
                  <p className="text-3xl font-bold text-accent-foreground">
                    {packs.length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 md:px-8 md:py-10 max-w-7xl mx-auto space-y-8">
          {/* Upload Panel */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Upload className="w-5 h-5" />
                上传文件
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 md:p-12 text-center transition-all ${
                  dragging
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-border hover:border-primary/50 hover:bg-secondary/30'
                }`}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-base font-medium text-foreground mb-2">
                  拖拽文件到这里上传
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  支持 PDF、DOCX、TXT 和图片文件
                </p>
                <div>
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <label htmlFor="file-upload">
                    <Button asChild className="shadow-md cursor-pointer">
                      <span>
                        <Plus className="w-4 h-4 mr-2" />
                        选择文件
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Files Table */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                文件列表
              </CardTitle>
            </CardHeader>
            <CardContent>
              {files.length > 0 ? (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-bold">文件名</TableHead>
                        <TableHead className="font-bold hidden md:table-cell">
                          类型
                        </TableHead>
                        <TableHead className="font-bold hidden md:table-cell">
                          大小
                        </TableHead>
                        <TableHead className="font-bold">状态</TableHead>
                        <TableHead className="font-bold hidden lg:table-cell">
                          上传时间
                        </TableHead>
                        <TableHead className="font-bold text-right">
                          操作
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map((file) => (
                        <TableRow
                          key={file.id}
                          className="hover:bg-secondary/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedFile(file)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[200px] md:max-w-none">
                                {file.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline" className="font-medium">
                              {file.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {formatFileSize(file.size)}
                          </TableCell>
                          <TableCell>{getStatusBadge(file.status)}</TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {formatDate(file.uploadedAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedFile(file)
                              }}
                              className="hover:bg-primary/10"
                            >
                              <Info className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无文件，请上传知识库文件</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Knowledge Packs */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FolderOpen className="w-5 h-5" />
                  知识包
                </CardTitle>
                <Button
                  onClick={() => setShowPackDialog(true)}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  新建知识包
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {packs.map((pack) => (
                  <Card
                    key={pack.id}
                    className="hover:shadow-md transition-shadow border-l-4 border-l-accent"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base font-bold">
                            {pack.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {pack.description}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePack(pack.id)}
                          className="h-8 w-8 p-0 hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {pack.fileIds.length} 个文件
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {packs.length === 0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无知识包，创建知识包以组织您的文件</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* File Detail Sheet */}
      <Sheet open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedFile && (
            <>
              <SheetHeader className="space-y-4">
                <SheetTitle className="text-xl font-bold flex items-center gap-3">
                  <FileText className="w-6 h-6 text-primary" />
                  {selectedFile.name}
                </SheetTitle>
                <SheetDescription className="text-left space-y-3">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedFile.status)}
                    <Badge variant="outline" className="font-medium">
                      {selectedFile.type}
                    </Badge>
                  </div>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-8 space-y-6">
                {/* File Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    文件信息
                  </h3>
                  <div className="space-y-3 bg-muted/30 rounded-lg p-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        文件大小
                      </span>
                      <span className="text-sm font-medium">
                        {formatFileSize(selectedFile.size)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        上传时间
                      </span>
                      <span className="text-sm font-medium">
                        {formatDate(selectedFile.uploadedAt)}
                      </span>
                    </div>
                    {selectedFile.chunkCount !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          块数量
                        </span>
                        <span className="text-sm font-medium">
                          {selectedFile.chunkCount}
                        </span>
                      </div>
                    )}
                    {selectedFile.lastIndexedAt && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          最后索引
                        </span>
                        <span className="text-sm font-medium">
                          {formatDate(selectedFile.lastIndexedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    操作
                  </h3>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 bg-transparent"
                      onClick={() => handleReindex(selectedFile.id)}
                      disabled={selectedFile.status === 'indexing'}
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${selectedFile.status === 'indexing' ? 'animate-spin' : ''}`}
                      />
                      {selectedFile.status === 'indexing'
                        ? '索引中...'
                        : '重新索引'}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive bg-transparent"
                      onClick={() => handleDelete(selectedFile.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                      删除文件
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Pack Dialog */}
      <Dialog open={showPackDialog} onOpenChange={setShowPackDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              创建新知识包
            </DialogTitle>
            <DialogDescription>
              将相关文件组织到知识包中，方便在生成行程时选用
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="pack-name" className="font-medium">
                知识包名称
              </Label>
              <Input
                id="pack-name"
                placeholder="例如：北京历史线"
                value={newPackName}
                onChange={(e) => setNewPackName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pack-description" className="font-medium">
                描述
              </Label>
              <Textarea
                id="pack-description"
                placeholder="简要描述这个知识包的内容..."
                value={newPackDescription}
                onChange={(e) => setNewPackDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label className="font-medium">选择文件</Label>
              <div className="max-h-64 overflow-y-auto border rounded-lg p-3 space-y-2">
                {files
                  .filter((f) => f.status === 'ready')
                  .map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center space-x-3 p-2 rounded hover:bg-secondary/50"
                    >
                      <Checkbox
                        id={`file-${file.id}`}
                        checked={selectedPackFileIds.includes(file.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedPackFileIds((prev) => [
                              ...prev,
                              file.id,
                            ])
                          } else {
                            setSelectedPackFileIds((prev) =>
                              prev.filter((id) => id !== file.id)
                            )
                          }
                        }}
                      />
                      <label
                        htmlFor={`file-${file.id}`}
                        className="flex-1 text-sm font-medium cursor-pointer truncate"
                      >
                        {file.name}
                      </label>
                      <Badge variant="outline" className="text-xs">
                        {file.type}
                      </Badge>
                    </div>
                  ))}

                {files.filter((f) => f.status === 'ready').length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    暂无可用文件
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPackDialog(false)
                setNewPackName('')
                setNewPackDescription('')
                setSelectedPackFileIds([])
              }}
            >
              取消
            </Button>
            <Button onClick={handleCreatePack} className="gap-2">
              <Plus className="w-4 h-4" />
              创建知识包
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
