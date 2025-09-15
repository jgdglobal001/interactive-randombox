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
  const [authenticated, setAuthenticated] = useState(false)
  const [password, setPassword] = useState('')

  // 페이지 로드시 세션 확인
  useEffect(() => {
    const session = localStorage.getItem('adminSession')
    const sessionTime = localStorage.getItem('adminSessionTime')
    const now = Date.now()
    
    // 세션이 24시간 이내면 자동 로그인
    if (session && sessionTime && (now - parseInt(sessionTime)) < 24 * 60 * 60 * 1000) {
      setAuthenticated(true)
      fetchCodes()
    }
  }, [])

  const handleLogin = () => {
    // 간단한 비밀번호 확인 (배포시에는 더 안전한 방법 사용)
    if (password === 'admin2024!') {
      const sessionTime = Date.now().toString()
      localStorage.setItem('adminSession', 'authenticated')
      localStorage.setItem('adminSessionTime', sessionTime)
      setAuthenticated(true)
      fetchCodes()
    } else {
      alert('잘못된 비밀번호입니다.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminSession')
    localStorage.removeItem('adminSessionTime')
    setAuthenticated(false)
    setCodes([])
  }

  const fetchCodes = async () => {
    try {
      setLoading(true)
      // 인증 헤더와 함께 API 호출
      const res = await fetch('/api/admin/codes', {
        headers: {
          'Authorization': `Bearer admin2024!`
        }
      })
      
      if (!res.ok) {
        console.error('API 응답 오류:', res.status, res.statusText)
        const errorData = await res.text()
        console.error('에러 데이터:', errorData)
        alert(`서버 오류: ${res.status} - ${res.statusText}`)
        return
      }
      
      const data: ApiResponse = await res.json()
      if (data.success && data.codes) {
        setCodes(data.codes)
      } else {
        console.error('API 오류:', data.error)
        alert(data.error || '코드를 불러오는 데 실패했습니다.')
      }
    } catch (error) {
      console.error('네트워크 오류:', error)
      alert('네트워크 오류가 발생했습니다.')
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

  // 로그인하지 않은 경우 로그인 UI 표시
  if (!authenticated) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-3xl font-bold mb-6">관리자 로그인</h1>
        <div className="max-w-md mx-auto">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="관리자 비밀번호"
            className="w-full p-3 border border-gray-300 rounded-md mb-4"
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button
            onClick={handleLogin}
            className="w-full px-6 py-3 bg-blue-500 text-white font-bold rounded-md hover:bg-blue-600"
          >
            로그인
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">관리자 대시보드</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
        >
          로그아웃
        </button>
      </div>
      
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