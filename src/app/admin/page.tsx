'use client'

import { useState, useEffect, useRef } from 'react'

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
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk'>('individual')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [previewCodes, setPreviewCodes] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer admin2024!`
        },
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

  // 파일 선택 처리
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/plain') {
      setUploadFile(file)
      previewFile(file)
    } else {
      alert('텍스트 파일(.txt)만 업로드 가능합니다.')
    }
  }

  // 파일 미리보기
  const previewFile = async (file: File) => {
    try {
      const text = await file.text()
      const codes = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
      setPreviewCodes(codes)
    } catch (error) {
      console.error('파일 읽기 오류:', error)
      alert('파일을 읽는 중 오류가 발생했습니다.')
    }
  }

  // 일괄 업로드
  const handleBulkUpload = async () => {
    if (!uploadFile || previewCodes.length === 0) {
      alert('업로드할 파일을 선택해주세요.')
      return
    }

    setUploading(true)
    try {
      const res = await fetch('/api/admin/codes/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer admin2024!`
        },
        body: JSON.stringify({ codes: previewCodes }),
      })
      const data: ApiResponse = await res.json()
      if (data.success) {
        alert(`${previewCodes.length}개의 코드가 성공적으로 업로드되었습니다.`)
        setUploadFile(null)
        setPreviewCodes([])
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        fetchCodes() // 목록 새로고침
      } else {
        alert(`업로드 실패: ${data.error}`)
      }
    } catch (error) {
      console.error('일괄 업로드 오류:', error)
      alert('일괄 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  // 검색 필터링된 코드 목록
  const filteredCodes = codes.filter(code =>
    code.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

      {/* 탭 메뉴 */}
      <div className="mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('individual')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'individual'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            개별 생성
          </button>
          <button
            onClick={() => setActiveTab('bulk')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'bulk'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            파일 업로드
          </button>
        </div>
      </div>

      {/* 개별 생성 탭 */}
      {activeTab === 'individual' && (
        <div className="mb-6">
          <button
            onClick={generateCode}
            className="px-6 py-2 bg-blue-500 text-white font-bold rounded-md hover:bg-blue-600"
          >
            참여 코드 1개 생성
          </button>
        </div>
      )}

      {/* 파일 업로드 탭 */}
      {activeTab === 'bulk' && (
        <div className="mb-6 p-6 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">텍스트 파일 업로드</h3>
          <p className="text-gray-600 mb-4">
            .txt 파일에 한 줄에 하나씩 참여코드를 입력해주세요.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            onChange={handleFileSelect}
            className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />

          {previewCodes.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium mb-2">미리보기 ({previewCodes.length}개 코드)</h4>
              <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded border text-sm">
                {previewCodes.slice(0, 10).map((code, index) => (
                  <div key={index} className="py-1">{code}</div>
                ))}
                {previewCodes.length > 10 && (
                  <div className="py-1 text-gray-500">... 외 {previewCodes.length - 10}개</div>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleBulkUpload}
            disabled={uploading || previewCodes.length === 0}
            className="px-6 py-2 bg-green-500 text-white font-bold rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {uploading ? '업로드 중...' : `${previewCodes.length}개 코드 업로드`}
          </button>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">참여 코드 목록</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              총 {codes.length}개 코드
              {searchTerm && ` (검색 결과: ${filteredCodes.length}개)`}
            </span>
          </div>
        </div>

        {/* 검색 입력창 */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="코드 번호로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <p>로딩 중...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3 border-b font-semibold text-gray-700">순번</th>
                  <th className="p-3 border-b font-semibold text-gray-700">코드</th>
                  <th className="p-3 border-b font-semibold text-gray-700">사용 여부</th>
                  <th className="p-3 border-b font-semibold text-gray-700">생성일</th>
                  <th className="p-3 border-b font-semibold text-gray-700">사용일</th>
                </tr>
              </thead>
              <tbody>
                {filteredCodes.map((code, index) => (
                  <tr key={code.id} className="hover:bg-gray-50">
                    <td className="p-3 border-b text-gray-600 font-medium">
                      {searchTerm ?
                        codes.findIndex(c => c.id === code.id) + 1 :
                        index + 1
                      }
                    </td>
                    <td className="p-3 border-b font-mono text-blue-600 font-semibold">
                      {code.code}
                    </td>
                    <td className="p-3 border-b">
                      {code.isUsed ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          ✅ 사용됨
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          미사용
                        </span>
                      )}
                    </td>
                    <td className="p-3 border-b text-gray-600">
                      {new Date(code.createdAt).toLocaleString('ko-KR')}
                    </td>
                    <td className="p-3 border-b text-gray-600">
                      {code.usedAt ? new Date(code.usedAt).toLocaleString('ko-KR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCodes.length === 0 && searchTerm && (
              <div className="text-center py-8 text-gray-500">
                "{searchTerm}"에 대한 검색 결과가 없습니다.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}