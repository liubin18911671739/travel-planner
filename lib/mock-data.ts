import type { Job, ItineraryItem, KnowledgeFile, MerchandiseTemplate } from './types'

export const mockJobs: Job[] = [
  {
    id: '1',
    name: '生成行程文档',
    status: 'running',
    progress: 65,
    logs: [
      {
        id: '1',
        timestamp: '2024-02-06 10:30:00',
        message: '开始生成行程文档...',
        level: 'info',
      },
      {
        id: '2',
        timestamp: '2024-02-06 10:30:15',
        message: '正在收集目的地信息...',
        level: 'info',
      },
      {
        id: '3',
        timestamp: '2024-02-06 10:30:30',
        message: '正在生成日程安排...',
        level: 'info',
      },
    ],
    createdAt: '2024-02-06T10:30:00Z',
    updatedAt: '2024-02-06T10:31:00Z',
  },
  {
    id: '2',
    name: '导出PDF文档',
    status: 'done',
    progress: 100,
    logs: [
      {
        id: '1',
        timestamp: '2024-02-06 10:20:00',
        message: '开始导出...',
        level: 'info',
      },
      {
        id: '2',
        timestamp: '2024-02-06 10:20:45',
        message: '导出完成',
        level: 'info',
      },
    ],
    createdAt: '2024-02-06T10:20:00Z',
    updatedAt: '2024-02-06T10:20:45Z',
  },
  {
    id: '3',
    name: '生成商品目录',
    status: 'failed',
    progress: 30,
    logs: [
      {
        id: '1',
        timestamp: '2024-02-06 10:10:00',
        message: '开始生成商品目录...',
        level: 'info',
      },
      {
        id: '2',
        timestamp: '2024-02-06 10:10:30',
        message: '网络连接失败',
        level: 'error',
      },
    ],
    createdAt: '2024-02-06T10:10:00Z',
    updatedAt: '2024-02-06T10:10:30Z',
  },
]

export const mockItineraryItems: ItineraryItem[] = [
  {
    id: '1',
    day: 1,
    title: '北京文化体验',
    description: '游览故宫、天坛等历史遗迹',
    location: '北京市',
    duration: '8小时',
  },
  {
    id: '2',
    day: 2,
    title: '长城徒步',
    description: '登临八达岭长城',
    location: '北京市',
    duration: '6小时',
  },
  {
    id: '3',
    day: 3,
    title: '博物馆参观',
    description: '国家博物馆深度参观',
    location: '北京市',
    duration: '4小时',
  },
]

export const mockKnowledgeFiles: KnowledgeFile[] = [
  {
    id: '1',
    name: '北京历史文化概览.pdf',
    type: 'PDF',
    size: 2048000,
    uploadedAt: '2024-01-15T10:00:00Z',
    status: 'ready',
    chunkCount: 42,
    lastIndexedAt: '2024-01-15T10:05:00Z',
  },
  {
    id: '2',
    name: '故宫博物院介绍.docx',
    type: 'DOCX',
    size: 1536000,
    uploadedAt: '2024-01-16T14:30:00Z',
    status: 'ready',
    chunkCount: 28,
    lastIndexedAt: '2024-01-16T14:35:00Z',
  },
  {
    id: '3',
    name: '长城研学指南.pdf',
    type: 'PDF',
    size: 3072000,
    uploadedAt: '2024-01-17T09:15:00Z',
    status: 'indexing',
    chunkCount: 0,
  },
  {
    id: '4',
    name: '天安门广场.txt',
    type: 'TXT',
    size: 512000,
    uploadedAt: '2024-01-18T11:20:00Z',
    status: 'ready',
    chunkCount: 15,
    lastIndexedAt: '2024-01-18T11:22:00Z',
  },
  {
    id: '5',
    name: '自然博物馆展品.jpg',
    type: 'JPG',
    size: 1024000,
    uploadedAt: '2024-01-19T16:45:00Z',
    status: 'ready',
    chunkCount: 8,
    lastIndexedAt: '2024-01-19T16:50:00Z',
  },
]

export const mockMerchandiseTemplates: MerchandiseTemplate[] = [
  {
    id: '1',
    name: '文化纪念品',
    category: '工艺品',
  },
  {
    id: '2',
    name: '教材套装',
    category: '教育产品',
  },
  {
    id: '3',
    name: '旅游指南',
    category: '出版物',
  },
  {
    id: '4',
    name: '品牌服装',
    category: '服装',
  },
]
