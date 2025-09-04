'use client'

import { useState, useEffect } from 'react'

// API 응답 타입 정의
interface ApiResponse {
  success: boolean;
  codes?: ParticipationCode[];
  message?: string;
  error?: string;
}

interface ParticipationCode {
  id: string
  code: string
  isUsed: boolean
  createdAt: string
  usedAt: string | null
}

export default function AdminPage() {
  const [codes, setCodes] = useState<ParticipationCode[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCodes = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/codes')
      const data: ApiResponse = await res.json()
      if (data.success && data.codes) {
        setCodes(data.codes)
      }
    } catch (error) {
      console.error('Failed to fetch codes:', error)
      alert('코드를 불러오는 데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const generateCode = async () => {
    try {
      const res = await fetch('/api/admin/codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 1 }),
      })
      const data: ApiResponse = await res.json()
      if (data.success) {
        alert('새로운 코드가 생성되었습니다.')
        fetchCodes() // 목록 새로고침
      }
    } catch (error) {
      console.error('Failed to generate code:', error)
      alert('코드 생성에 실패했습니다.')
    }
  }

  useEffect(() => {
    fetchCodes()
  }, [])

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">관리자 대시보드</h1>
      
      <div className="mb-6">
        <button
          onClick={generateCode}
          className="px-6 py-2 bg-blue-500 text-white font-bold rounded-md hover:bg-blue-600"
        >
          참여 코드 1개 생성
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">참여 코드 목록</h2>
        {loading ? (
          <p>로딩 중...</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="p-2 border-b">코드</th>
                <th className="p-2 border-b">사용 여부</th>
                <th className="p-2 border-b">생성일</th>
                <th className="p-2 border-b">사용일</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((code) => (
                <tr key={code.id}>
                  <td className="p-2 border-b font-mono">{code.code}</td>
                  <td className="p-2 border-b">{code.isUsed ? '✅ 사용됨' : '미사용'}</td>
                  <td className="p-2 border-b">{new Date(code.createdAt).toLocaleString()}</td>
                  <td className="p-2 border-b">{code.usedAt ? new Date(code.usedAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}