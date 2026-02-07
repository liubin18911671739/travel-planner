'use client'

import { useEffect, useMemo, useState } from 'react'
import { Upload, RefreshCw, Trash2, FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

type FileStatus = 'pending' | 'indexing' | 'ready' | 'failed'

type KnowledgeFile = {
  id: string
  name: string
  fileType: string
  fileSize: number
  status: FileStatus
  chunkCount: number
  uploadedAt: string
  lastIndexedAt?: string
}

type KnowledgePack = {
  id: string
  name: string
  description: string | null
  file_ids?: string[]
  fileCount?: number
}

export default function KnowledgePage() {
  const [files, setFiles] = useState<KnowledgeFile[]>([])
  const [packs, setPacks] = useState<KnowledgePack[]>([])
  const [loading, setLoading] = useState(false)
  const [packName, setPackName] = useState('')
  const [packDescription, setPackDescription] = useState('')
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const { toast } = useToast()

  const loadFiles = async () => {
    const response = await fetch('/api/knowledge/list')
    if (!response.ok) return
    const data = await response.json()
    setFiles(data.files || [])
  }

  const loadPacks = async () => {
    const response = await fetch('/api/knowledge/packs')
    if (!response.ok) return
    const data = await response.json()
    setPacks(data.packs || [])
  }

  const refreshAll = async () => {
    setLoading(true)
    await Promise.all([loadFiles(), loadPacks()])
    setLoading(false)
  }

  useEffect(() => {
    refreshAll().catch(console.error)
  }, [])

  const uploadFiles = async (selected: FileList) => {
    setLoading(true)
    try {
      for (const file of Array.from(selected)) {
        const formData = new FormData()
        formData.append('file', file)
        const response = await fetch('/api/knowledge/upload', {
          method: 'POST',
          body: formData,
        })
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || error.message || `上传失败: ${file.name}`)
        }
      }

      toast({ title: '上传成功', description: '文件已提交索引任务' })
      await refreshAll()
    } catch (error) {
      toast({
        title: '上传失败',
        description: (error as Error).message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const reindex = async (id: string) => {
    const response = await fetch(`/api/knowledge/${id}/reindex`, { method: 'POST' })
    if (!response.ok) {
      const error = await response.json()
      toast({
        title: '重索引失败',
        description: error.error || error.message || '请求失败',
        variant: 'destructive',
      })
      return
    }
    toast({ title: '已提交重索引任务' })
    await refreshAll()
  }

  const removeFile = async (id: string) => {
    const response = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const error = await response.json()
      toast({
        title: '删除失败',
        description: error.error || error.message || '请求失败',
        variant: 'destructive',
      })
      return
    }
    toast({ title: '删除成功' })
    await refreshAll()
  }

  const createPack = async () => {
    if (!packName.trim()) {
      toast({ title: '请输入知识包名称', variant: 'destructive' })
      return
    }
    const response = await fetch('/api/knowledge/packs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: packName.trim(),
        description: packDescription.trim() || undefined,
        fileIds: selectedFileIds,
      }),
    })
    if (!response.ok) {
      const error = await response.json()
      toast({
        title: '创建失败',
        description: error.error || error.message || '请求失败',
        variant: 'destructive',
      })
      return
    }

    setPackName('')
    setPackDescription('')
    setSelectedFileIds([])
    toast({ title: '创建成功' })
    await loadPacks()
  }

  const deletePack = async (id: string) => {
    const response = await fetch(`/api/knowledge/packs/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      const error = await response.json()
      toast({
        title: '删除失败',
        description: error.error || error.message || '请求失败',
        variant: 'destructive',
      })
      return
    }
    toast({ title: '删除成功' })
    await loadPacks()
  }

  const readyFiles = useMemo(() => files.filter((file) => file.status === 'ready'), [files])

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="border-b border-border bg-card sticky top-0 z-30 shadow-sm">
        <div className="px-4 py-5 md:px-8 md:py-7 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              知识库管理
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              真实 API 链路：上传/索引/知识包
            </p>
          </div>
          <Button variant="outline" onClick={refreshAll} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 md:px-8 md:py-10 max-w-6xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>上传文件</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="files">支持 PDF / DOCX / TXT / JPG / PNG</Label>
              <Input
                id="files"
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
                onChange={(event) => {
                  const selected = event.target.files
                  if (selected && selected.length > 0) {
                    uploadFiles(selected).catch(console.error)
                  }
                }}
              />
              <div className="text-xs text-muted-foreground">上传后会自动创建索引任务。</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>文件列表</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {files.map((file) => (
                <div key={file.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {file.fileType} · {(file.fileSize / 1024).toFixed(1)} KB · 上传于{' '}
                      {new Date(file.uploadedAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={file.status === 'failed' ? 'destructive' : 'secondary'}>
                      {file.status}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => reindex(file.id)} className="gap-1">
                      <RefreshCw className="w-3.5 h-3.5" />
                      重索引
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => removeFile(file.id)} className="gap-1">
                      <Trash2 className="w-3.5 h-3.5" />
                      删除
                    </Button>
                  </div>
                </div>
              ))}
              {files.length === 0 && <p className="text-sm text-muted-foreground">暂无文件</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                知识包
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>名称</Label>
                  <Input value={packName} onChange={(e) => setPackName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>描述</Label>
                  <Textarea value={packDescription} onChange={(e) => setPackDescription(e.target.value)} rows={2} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>选择文件（仅 ready）</Label>
                <div className="max-h-40 overflow-auto border rounded-lg p-3 space-y-2">
                  {readyFiles.map((file) => (
                    <label key={file.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedFileIds.includes(file.id)}
                        onCheckedChange={(checked) => {
                          setSelectedFileIds((prev) =>
                            checked ? [...prev, file.id] : prev.filter((id) => id !== file.id)
                          )
                        }}
                      />
                      <span>{file.name}</span>
                    </label>
                  ))}
                  {readyFiles.length === 0 && (
                    <p className="text-sm text-muted-foreground">暂无可选文件</p>
                  )}
                </div>
              </div>

              <Button onClick={createPack} className="gap-2">
                <Upload className="w-4 h-4" />
                创建知识包
              </Button>

              <div className="space-y-2">
                {packs.map((pack) => (
                  <div key={pack.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{pack.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {pack.description || '无描述'} · {pack.fileCount || 0} 个文件
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => deletePack(pack.id)}>
                      删除
                    </Button>
                  </div>
                ))}
                {packs.length === 0 && <p className="text-sm text-muted-foreground">暂无知识包</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
