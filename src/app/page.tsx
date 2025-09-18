'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

// API 응답 타입 정의
interface ParticipateResponse {
  success: boolean;
  prize?: { name: string; imageUrl: string };
  participationCodeId?: string;
  error?: string;
}

interface ClaimResponse {
  success: boolean;
  message?: string;
  error?: string;
}

type EventState = 'idle' | 'playing-entering' | 'playing-closing' | 'playing-shaking' | 'playing-reveal' | 'finished' | 'claiming';

// Lottie 애니메이션 데이터 임포트 (public 폴더에 있다고 가정)
import introLottie from '../../public/lottie/intro.json';
import skyIndigoLottie from '../../public/lottie/Sky Indigo.json';
import confettiLottie from '../../public/lottie/confetti.json';
import confetti2Lottie from '../../public/lottie/Confetti 2.json';
import Image from 'next/image'; // Image 컴포넌트 임포트

// 상품 데이터 정의 - 상품 단위 컨테이너 구조로 변경
const products = [
  {
    id: 'galaxy-folder',
    name: '갤럭시 폴더7',
    quantity: '1명',
    imageUrl: '/images/GalaxyFolder7.png',
    position: { top: '25%', left: '50%' }, // 선물박스 중심 기준으로 상단 중앙
    containerWidth: 240, // 브라우저 벗어나지 않도록 크기 축소
    containerHeight: 280, // 브라우저 벗어나지 않도록 크기 축소
    imageSize: { width: 240, height: 240 }, // 실제 이미지 크기도 축소
    speechBubblePosition: 'bottom', // 말풍선 위치: bottom/top
    animation: 'floating-product-1',
    textStyle: 'galaxy-text'
  },
  {
    id: 'cuckoo-food',
    name: '쿠쿠 음식물처리기',
    quantity: '2명',
    imageUrl: '/images/CuckooFood DisposalMachine.png',
    position: { top: '20%', left: '75%' }, // 선물박스 중심 기준으로 우상단
    containerWidth: 220, // 크기 축소로 균형 맞춤
    containerHeight: 270, // 크기 축소로 균형 맞춤
    imageSize: { width: 220, height: 220 }, // 실제 이미지 크기도 축소
    speechBubblePosition: 'top', // 말풍선 위치: 위쪽
    animation: 'floating-product-2',
    textStyle: 'cuckoo-text'
  },
  {
    id: 'canon-multifunction',
    name: '캐논복합기',
    quantity: '3명',
    imageUrl: '/images/Canon-multifunction-device.png',
    position: { top: '35%', left: '25%' }, // 선물박스 중심 기준으로 좌측
    containerWidth: 220, // 크기 축소로 균형 맞춤
    containerHeight: 270, // 크기 축소로 균형 맞춤
    imageSize: { width: 220, height: 220 }, // 실제 이미지 크기도 축소
    speechBubblePosition: 'top', // 박스 방향 고려하여 말풍선 위쪽
    animation: 'floating-product-3',
    textStyle: 'canon-text'
  },
  {
    id: 'shinsegae-gift',
    name: '신세계상품권 5만원권',
    quantity: '100명',
    imageUrl: '/images/Shinsegae-gift-certificate.png',
    position: { top: '70%', left: '70%' }, // 선물박스 중심 기준으로 우하단
    containerWidth: 220, // 상품 컨테이너의 기본 너비
    containerHeight: 290, // 상품 컨테이너의 기본 높이
    imageSize: { width: 220, height: 220 }, // 실제 이미지 크기
    speechBubblePosition: 'bottom', // 말풍선 위치: 아래쪽
    animation: 'floating-product-4',
    textStyle: 'shinsegae-text'
  },
  {
    id: 'megacoffee',
    name: '메가커피 교환권',
    quantity: '100% 당첨',
    imageUrl: '/images/megacoffee.png',
    position: { top: '75%', left: '30%' }, // 선물박스 중심 기준으로 좌하단
    containerWidth: 200, // 상품 컨테이너의 기본 너비
    containerHeight: 270, // 상품 컨테이너의 기본 높이
    imageSize: { width: 200, height: 200 }, // 실제 이미지 크기
    speechBubblePosition: 'bottom', // 말풍선 위치: 아래쪽
    animation: 'floating-product-5',
    textStyle: 'megacoffee-text'
  },
];

export default function HomePage() {
  const [code, setCode] = useState('');
  const [eventState, setEventState] = useState<EventState>('idle');
  const [showRibbonAndText, setShowRibbonAndText] = useState(true); // 새 상태 추가: 리본과 문구 표시 여부

  // 이벤트 상태 변경 시 리본/문구 숨김 로직 (useEffect로 구현)
  useEffect(() => {
    if (eventState === 'playing-closing' || eventState === 'playing-shaking') {
      setShowRibbonAndText(false);
    } else {
      setShowRibbonAndText(true);
    }
  }, [eventState]);

  // 리본과 문구 요소를 조건부 렌더링 (예: Ribbon과 Text 컴포넌트가 별도로 있다면)
  // 만약 Lottie 내부 레이어로 구현되어 있다면, CSS 클래스 토글 사용
  const ribbonRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ribbon = ribbonRef.current;
    const text = textRef.current;
    if (ribbon) ribbon.style.opacity = showRibbonAndText ? '1' : '0';
    if (text) text.style.opacity = showRibbonAndText ? '1' : '0';
    // Lottie segments 제한 (예: 전체 270프레임 중 190~196 숨김 구간)
    // lottieRef.current?.setCurrentFrame(showRibbonAndText ? 270 : 190);
  }, [showRibbonAndText]);
  const [prize, setPrize] = useState<{ name: string; imageUrl: string } | null>(null);
  const [participationCodeId, setParticipationCodeId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [containerSize, setContainerSize] = useState({ width: 1000, height: 1000 }); // 초기값 설정으로 hydration 에러 방지
  const [isClient, setIsClient] = useState(false); // 클라이언트 사이드인지 확인
  const [enteringProductIndex, setEnteringProductIndex] = useState(-1); // 상품 입장 애니메이션용
  const [enteredProducts, setEnteredProducts] = useState<Set<number>>(new Set()); // 이미 들어간 상품들 추적
  const [productPositions, setProductPositions] = useState<any>({}); // 상품 위치 상태
  const [showConfetti, setShowConfetti] = useState(false); // 메가커피 이미지 시점(프레임 127)에만 터지게 설정
  const lottieRef = useRef<any>(null); // 메인 Lottie 애니메이션 인스턴스 참조
  const skyIndigoRef = useRef<any>(null); // Sky Indigo 백그라운드 애니메이션 참조
  const confettiRef = useRef<any>(null); // 폭죽1 Lottie 참조
  const confetti2Ref = useRef<any>(null); // 폭죽2 Lottie 참조
  const pingPongDirectionRef = useRef<number>(1); // idle 핑퐁 재생용 방향 상태

  // intro Lottie 완료 시 핑퐁 및 상태 전환을 위한 콜백
  const handleIntroComplete = useCallback(() => {
    if (eventState === 'idle') {
      const lottie = lottieRef.current;
      if (!lottie) return;
      pingPongDirectionRef.current = -pingPongDirectionRef.current;
      lottie.setDirection(pingPongDirectionRef.current);
      // 방향에 맞춰 세그먼트 순서를 바꿔 점프 없이 자연스럽게 왕복
      if (pingPongDirectionRef.current === 1) {
        lottie.playSegments([190, 196], true);
      } else {
        lottie.playSegments([196, 190], true);
      }
    } else if (eventState === 'playing-closing') {
      setEventState('playing-shaking');
    } else if (eventState === 'playing-shaking') {
      // This will be handled by the timeout in the effect
    } else if (eventState === 'playing-reveal') {
      setEventState('finished');
    }
  }, [eventState]);

  // 초기 애니메이션 설정 (원하는 프레임으로 바로 이동)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (lottieRef.current) {
        const lottie = lottieRef.current;
        console.log('Lottie ref found:', lottie);
        // 즉시 190 프레임으로 이동하고 정지
        lottie.goToAndStop(190, true);
        
        // 약간의 딜레이 후 190-196 구간만 무한 왕복 시작
        setTimeout(() => {
          if (lottie) {
            console.log('Starting 190-196 ping-pong loop with speed control');
            // 애니메이션 속도 설정 (0.5 = 절반 속도, 1.0 = 기본 속도, 2.0 = 2배 속도)
            lottie.setSpeed(0.25); // 더 느리게 설정
            // 190-196 구간만 왕복 재생 (direction: 1은 정방향)
            lottie.setDirection(1); // 기본 정방향 설정
            lottie.playSegments([190, 196], true); // 무한 반복
          }
        }, 300);
      } else {
        console.log('Lottie ref not found');
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [isClient]);

  // Lottie 애니메이션 프레임 구간
  const animationSegments = {
    idle: [190, 196], // 뚜껑이 열려있고 상품이 둥둥 떠다니는 초기 화면 (지속적인 움직임)
    'playing-entering': [190, 196], // 상품이 박스 안으로 들어가는 화면 (임시로 idle과 동일)
    'playing-closing': [197, 204], // 뚜껑이 닫히는 화면
    'playing-shaking': [14, 127], // 박스가 흔들리는 구간 (14-127프레임)
    'playing-reveal': [127, 190], // 뚜껑이 열리면서 상품이 보이는 구간 (127-190프레임)
  };
  
  // 상품이 보여지는 시점을 추적하는 상태
  const [showPrize, setShowPrize] = useState(false);



  // 컨테이너 크기 감지 및 상품 크기 계산
  const updateContainerSize = () => {
    const container = document.querySelector('.lottie-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    }
  };

  useEffect(() => {
    // 클라이언트 사이드임을 표시
    setIsClient(true);

    // 초기 크기 설정 (약간의 딜레이를 주어 DOM이 완전히 렌더링된 후 실행)
    const timer = setTimeout(() => {
      updateContainerSize();
    }, 100);

    // 창 크기 변경 시 크기 재계산
    window.addEventListener('resize', updateContainerSize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateContainerSize);
    };
  }, []);

  // 상품 위치 계산 useEffect (Hydration Error 방지)
  useEffect(() => {
    if (isClient) {
      const newPositions: any = {};
      products.forEach((product, index) => {
        const containerSize = getResponsiveContainerSize(product.containerWidth, product.containerHeight, product.id);
        const finalContainerSize = {
          ...containerSize,
          isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
          isTablet: typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerWidth < 1024 : false
        };
        newPositions[product.id] = getResponsiveProductPosition(product.position, product.id, finalContainerSize);
      });
      setProductPositions(newPositions);
    }
  }, [isClient, containerSize]);

  // 상품 크기를 컨테이너 크기에 따라 동적으로 계산하는 함수
  const getResponsiveProductSize = (baseWidth: number, baseHeight: number) => {
    // 기본 컨테이너 크기 (데스크톱 기준) - 1000px로 조정
    const baseContainerWidth = 1000; // 1000px로 조정
    const baseContainerHeight = 1000;

    // 현재 컨테이너 크기 (초기 렌더링 시 기본값 사용)
    const currentWidth = containerSize.width || baseContainerWidth;
    const currentHeight = containerSize.height || baseContainerHeight;

    // 컨테이너 크기에 따라 상품 크기 조정 (비율 유지)
    const scaleFactor = Math.min(currentWidth / baseContainerWidth, currentHeight / baseContainerHeight);

    return {
      width: Math.max(baseWidth * scaleFactor, 120), // 1000px에 맞춰 최소 크기 조정
      height: Math.max(baseHeight * scaleFactor, 120),
      scaleFactor
    };
  };

  // 상품의 반응형 위치 조정 함수 (UI 요소 침범 방지)
  const getResponsiveProductPosition = (originalPosition: { top: string; left: string }, productId: string, containerSize: { width: number; height: number; isMobile: boolean; isTablet: boolean }) => {
    let top = originalPosition.top;
    let left = originalPosition.left;

    // 실제 브라우저 창 너비로 디바이스 타입 재판단
    const browserWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const actualIsMobile = browserWidth < 768;
    const actualIsTablet = browserWidth >= 768 && browserWidth < 1024;

    // 디버깅: 실제 브라우저 너비로 확인
    console.log('실제 디바이스 감지:', {
      browserWidth: browserWidth,
      actualIsMobile: actualIsMobile,
      actualIsTablet: actualIsTablet,
      product: productId,
      originalPosition: originalPosition
    });

    if (actualIsMobile) {
      // 실제 모바일 감지 확인
      console.log('실제 모바일 감지됨:', browserWidth, 'px');

      // 모바일에서도 원래 위치 비율 유지 (선물박스 중심 배치)
      // 단지 크기만 축소하고 위치는 데스크톱과 동일한 균형 유지

      // 원래 위치 그대로 사용 (브라우저/태블릿과 동일한 배치)
      // top과 left는 원래 값 유지

      console.log('모바일 위치 유지:', {
        productId: productId,
        originalTop: top,
        originalLeft: left,
        message: '원래 위치 비율 유지로 선물박스 중심 배치'
      });

    } else if (actualIsTablet) {
      // 실제 태블릿에서만 실행되는지 확인
      console.log('실제 태블릿 감지됨:', browserWidth, 'px');

      // 태블릿에서 메가커피와 신세계 상품권 위치 조정
      const topValue = parseFloat(top);
      if (topValue < 18) {
        top = '20%';
      }
      if (topValue > 75) {
        top = '70%';
      }

      // 메가커피와 신세계 상품권만 태블릿에서 조정 (좌우로만 이동)
      if (productId === 'megacoffee') {
        console.log('태블릿 메가커피 위치 조정:', top, left, '→ 75%, 15%');
        // top은 유지, left만 좌측으로 10 이동
        left = '15%'; // 좌측으로 10 이동
      } else if (productId === 'shinsegae-gift') {
        console.log('태블릿 신세계 위치 조정:', top, left, '→ 72%, 85%');
        // top은 유지, left만 우측으로 10 이동
        left = '85%'; // 우측으로 10 이동
      }
      // 다른 상품들은 태블릿에서도 원래 위치 유지
    }

    return { top, left };
  };

  // 상품 컨테이너의 반응형 크기 계산 (상품 단위 컨테이너용)
  const getResponsiveContainerSize = (containerWidth: number, containerHeight: number, productId: string) => {
    // 기본 컨테이너 크기 (데스크톱 기준)
    const baseContainerWidth = 1000;
    const baseContainerHeight = 1000;

    // 현재 컨테이너 크기
    const currentWidth = containerSize.width || baseContainerWidth;
    const currentHeight = containerSize.height || baseContainerHeight;

    // 컨테이너 크기에 따라 상품 컨테이너 크기 조정 (비율 유지)
    let scaleFactor = Math.min(currentWidth / baseContainerWidth, currentHeight / baseContainerHeight);

    // 실제 브라우저 창 너비를 측정하여 정확한 디바이스 감지
    const browserWidth = typeof window !== 'undefined' ? window.innerWidth : currentWidth;
    const isMobile = browserWidth < 768;
    const isTablet = browserWidth >= 768 && browserWidth < 1024;

    if (isMobile) {
      // 모바일에서는 더 적극적인 크기 축소
      scaleFactor *= 0.8;

      // 특정 상품들은 더 많이 축소하여 UI 보호
      if (['galaxy-folder', 'canon-multifunction', 'cuckoo-food'].includes(productId)) {
        scaleFactor *= 0.85;
      }
      
      // 메가커피도 모바일에서 축소
      if (productId === 'megacoffee') {
        scaleFactor *= 0.7;
      }
    } else if (isTablet) {
      // 태블릿에서는 중간 정도 축소
      scaleFactor *= 0.9;
      
      // 메가커피도 태블릿에서 축소
      if (productId === 'megacoffee') {
        scaleFactor *= 0.8;
      }
    }

    return {
      width: Math.max(containerWidth * scaleFactor, 100), // 최소 크기 더 축소
      height: Math.max(containerHeight * scaleFactor, 110),
      scaleFactor,
      isMobile,
      isTablet
    };
  };

  // 상품 입장 애니메이션 useEffect
  useEffect(() => {
    if (eventState === 'playing-entering') {
      // 상품들이 순서대로 박스 안으로 들어가는 애니메이션
      const enterProductsSequentially = async () => {
        for (let i = 0; i < products.length; i++) {
          setEnteringProductIndex(i);
          
          // 애니메이션 완료 후 해당 상품을 entered 상태로 추가
          setTimeout(() => {
            setEnteredProducts(prev => new Set([...prev, i]));
          }, 750); // 애니메이션 시간과 맞춤 (0.75초)
          
          await new Promise(resolve => setTimeout(resolve, 500)); // 각 상품 간격 0.5초
        }

        // 모든 상품이 들어간 후 다음 단계로
        setTimeout(() => {
          setEnteringProductIndex(-1);
          setEventState('playing-closing');
        }, 500);
      };

      enterProductsSequentially();
    }
  }, [eventState]);

  // Lottie 애니메이션 제어 useEffect
  useEffect(() => {
    const lottie = lottieRef.current;
    if (!lottie) return;

    if (eventState === 'idle') {
      // 190 → 196 → 190 핑퐁 루프 시작
      lottie.setSpeed(0.9); // 속도 0.9로 설정
      pingPongDirectionRef.current = 1;
      lottie.setDirection(pingPongDirectionRef.current);
      lottie.playSegments([190, 196], true);
      return;
    }

    // idle 외 상태 처리
    switch (eventState) {
      case 'playing-entering':
        // 상품 입장 중에는 Lottie 애니메이션 유지
        break;
      case 'playing-closing':
        lottie.playSegments(animationSegments['playing-closing'], false);
        break;
      case 'playing-shaking':
        // 14-127 구간 재생 후 자동으로 playing-reveal로 전환
        console.log('14-127 구간 재생 시작');
        lottie.setSpeed(1.5);
        
        // 14-127 구간 재생이 끝나면 playing-reveal 상태로 전환
        const timer = setTimeout(() => {
          setShowPrize(true); // 상품 보이기
          setEventState('playing-reveal');
        }, ((127 - 14) * (1000 / 24) / 1.5)); // 100% 지점에서 전환
        
        // 애니메이션 재생
        lottie.playSegments(animationSegments['playing-shaking'], false);
        
        return () => clearTimeout(timer);
        
      case 'playing-reveal':
        // 127-190 구간 재생 (뚜껑이 열리는 애니메이션)
        console.log('127-190 구간 재생 시작');
        console.log('폭죽 시작!!!'); // 디버그 로그 추가
        setShowConfetti(true); // 폭죽 애니메이션 시작
        console.log('showConfetti 설정됨:', true); // 상태 확인 로그
        lottie.setSpeed(1.5);
        lottie.playSegments(animationSegments['playing-reveal'], false);
        
        // 127-190 구간이 끝나면 finished 상태로 전환
        const revealTimer = setTimeout(() => {
          setEventState('finished');
        }, ((190 - 127) * (1000 / 24) / 1.5));
        
        return () => clearTimeout(revealTimer);
        break;
      default:
        break;
    }
  }, [eventState]);

  // Sky Indigo 백그라운드 애니메이션 속도 설정
  useEffect(() => {
    if (skyIndigoRef.current) {
      skyIndigoRef.current.setSpeed(2); // 구름 속도를 매우 느리게
    }
  }, []);

  // 폭죽 애니메이션 속도 설정 및 재생
  useEffect(() => {
    console.log('showConfetti changed:', showConfetti);
    if (showConfetti) {
      console.log('Playing confetti...');
      // Wait for animation to load and then reset to beginning and play
      setTimeout(() => {
        console.log('Inside setTimeout for confetti - 500ms delay');
        if (confettiRef.current) {
          console.log('Resetting and playing confetti1');
          confettiRef.current.goToAndStop(0);
          confettiRef.current.setSpeed(1);
          confettiRef.current.play();
        } else {
          console.log('confettiRef is still null - retrying...');
          // 추가 재시도
          setTimeout(() => {
            if (confettiRef.current) {
              console.log('Retry: Resetting and playing confetti1');
              confettiRef.current.goToAndStop(0);
              confettiRef.current.setSpeed(1);
              confettiRef.current.play();
            }
          }, 200);
        }
        if (confetti2Ref.current) {
          console.log('Resetting and playing confetti2');
          confetti2Ref.current.goToAndStop(0);
          confetti2Ref.current.setSpeed(1);
          confetti2Ref.current.play();
        } else {
          console.log('confetti2Ref is still null - retrying...');
          // 추가 재시도
          setTimeout(() => {
            if (confetti2Ref.current) {
              console.log('Retry: Resetting and playing confetti2');
              confetti2Ref.current.goToAndStop(0);
              confetti2Ref.current.setSpeed(1);
              confetti2Ref.current.play();
            }
          }, 200);
        }
      }, 500);
    }
  }, [showConfetti]);

  const handleParticipate = async () => {
    if (!code) {
      alert('참여 코드를 입력해주세요.');
      return;
    }

    try {
      // TODO: 실제 Workers 백엔드 API URL로 변경해야 합니다.
      const response = await fetch('/api/participate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data: ParticipateResponse = await response.json();

      if (data.success) {
        setPrize(data.prize || null);
        setParticipationCodeId(data.participationCodeId || null);
        setEventState('playing-entering'); // 상품 입장 애니메이션 시작
      } else {
        alert(`이벤트 참여 실패: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('Participation API error:', error);
      alert('이벤트 참여 중 오류가 발생했습니다.');
    }
  };

  const handleClaimPrize = async () => {
    console.log('=== 메가커피 교환권 발송 시작 ===');
    console.log('phoneNumber:', phoneNumber);

    if (!phoneNumber) {
      alert('휴대폰 번호를 입력해주세요.');
      return;
    }

    try {
      console.log('기프트쇼 API 호출 시작...');
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });
      console.log('API 응답 받음:', response.status);
      
      const data: ClaimResponse = await response.json();
      console.log('API 응답 데이터:', data);

      if (data.success) {
        alert(data.message || '상품이 성공적으로 발송되었습니다.');
        setEventState('claiming');
      } else {
        alert(`상품 수령 실패: ${data.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('Claim API error:', error);
      alert('상품 수령 중 오류가 발생했습니다.');
    }
  };

  const handleReset = () => {
    setEventState('idle');
    setCode('');
    setPrize(null);
    setParticipationCodeId(null);
    setPhoneNumber('');
    setEnteringProductIndex(-1);
    setEnteredProducts(new Set()); // 들어간 상품들 리셋
    setShowPrize(false); // 상품 숨기기
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden flex items-center justify-center">
      {/* Sky Indigo 백그라운드 애니메이션 - 브라우저 전체 커버 */}
      <div className="fixed inset-0 z-0 w-screen h-screen sky-indigo-pink">
        <Lottie
          animationData={skyIndigoLottie}
          loop={true}
          autoplay={true}
          style={{
            height: '100%',
            width: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0
          }}
          rendererSettings={{
            preserveAspectRatio: 'none'
          }}
          lottieRef={skyIndigoRef}
        />
      </div>

      {/* 폭죽 애니메이션 - 가장 간단하게 */}
      {showConfetti && (
        <>
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              zIndex: 2147483647,
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh'
            }}
          >
            <Lottie
              animationData={confettiLottie}
              loop={false}
              autoplay={true}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%'
              }}
            />
          </div>
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              zIndex: 2147483647,
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh'
            }}
          >
            <Lottie
              animationData={confetti2Lottie}
              loop={false}
              autoplay={true}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%'
              }}
            />
          </div>
        </>
      )}

      {/* 기존 선물상자 Lottie 애니메이션 - 중앙 정렬 */}
      <div className="absolute inset-0 flex items-center justify-center lottie-container z-10">
        <div className="w-full h-full max-w-[1000px] max-h-[1000px]">
          <Lottie
            animationData={introLottie}
            loop={false}
            autoplay={false}
            onComplete={handleIntroComplete}
            style={{ height: '100%', width: '100%' }}
            lottieRef={lottieRef}
          />
        </div>
      </div>

      {/* 상품 단위 컨테이너 구조로 변경 */}
      {products.map((product, index) => {
        // 이미 들어간 상품은 렌더링하지 않음
        if (enteredProducts.has(index) && enteringProductIndex !== index) {
          return null;
        }
        // 클라이언트 사이드에서만 실제 크기 계산 (hydration 에러 방지)
        const finalContainerSize = isClient
          ? (() => {
              const containerSize = getResponsiveContainerSize(product.containerWidth, product.containerHeight, product.id);
              // 실제 브라우저 너비를 사용한 정확한 디바이스 감지
              const browserWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
              const actualIsMobile = browserWidth < 768;
              const actualIsTablet = browserWidth >= 768 && browserWidth < 1024;
              return {
                ...containerSize,
                isMobile: actualIsMobile,
                isTablet: actualIsTablet
              };
            })()
          : {
              width: product.containerWidth,
              height: product.containerHeight,
              scaleFactor: 1,
              isMobile: false,
              isTablet: false
            };

        // 모바일에서는 항상 원래 위치 사용 (선물박스 중심 배치 유지)
        const isMobileDevice = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
        const responsivePosition = (isClient && productPositions[product.id] && !isMobileDevice)
          ? productPositions[product.id]
          : product.position;

        return (
          <div
            key={product.id}
            className={`product-unit ${product.animation} visible ${enteringProductIndex === index ? 'entering' : ''}`}
            style={{
              position: 'absolute',
              top: responsivePosition.top,
              left: responsivePosition.left,
              width: `${finalContainerSize.width}px`,
              height: `${finalContainerSize.height}px`,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: product.speechBubblePosition === 'top' ? 'column-reverse' : 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center' // 텍스트 가운데 정렬
            }}
          >
            {/* 상품 이미지 */}
            <div
              className="product-image-container"
              style={{
                position: 'relative',
                width: `${product.imageSize.width * finalContainerSize.scaleFactor}px`,
                height: `${product.imageSize.height * finalContainerSize.scaleFactor}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill={true}
                sizes="(max-width: 768px) 200px, 240px"
                style={{
                  objectFit: 'contain'
                }}
                className="product-image"
              />
            </div>

            {/* 말풍선 */}
            <div
              className={`speech-bubble ${product.textStyle}`}
              style={{
                marginTop: product.speechBubblePosition === 'bottom' ? `${Math.max(product.imageSize.height * finalContainerSize.scaleFactor * 0.04, 5)}px` : '0', // 이미지 높이의 4% (최소 10px)
                marginBottom: product.speechBubblePosition === 'top' ? `${Math.max(product.imageSize.height * finalContainerSize.scaleFactor * 0.04, 5)}px` : '0', // 이미지 높이의 4% (최소 10px)
                padding: `${Math.max(8 * finalContainerSize.scaleFactor, 6)}px ${Math.max(16 * finalContainerSize.scaleFactor, 12)}px`,
                minWidth: product.id === 'megacoffee' ? 
                  `${Math.max(140 * finalContainerSize.scaleFactor, 100)}px !important` :
                  `${Math.max(120 * finalContainerSize.scaleFactor, 80)}px`,
                fontSize: `${Math.max(0.875 * finalContainerSize.scaleFactor, 0.6)}rem`,
                // 기존 말풍선 디자인 유지 (배포 환경 호환성을 위해 !important 추가)
                // 메가커피는 강제로 스타일 적용
                backgroundColor: product.id === 'megacoffee' ? '#fce7f3' : (
                  product.id === 'galaxy-folder' ? '#dbeafe' :
                  product.id === 'cuckoo-food' ? '#fef3c7' :
                  product.id === 'canon-multifunction' ? '#d1fae5' :
                  product.id === 'shinsegae-gift' ? '#f3e8ff' : 'white'
                ),
                border: `${Math.max(2 * finalContainerSize.scaleFactor, 1)}px solid ${{
                  'galaxy-folder': '#3b82f6',
                  'cuckoo-food': '#f59e0b',
                  'canon-multifunction': '#059669',
                  'shinsegae-gift': '#8b5cf6',
                  'megacoffee': '#db2777'
                }[product.id] || '#e5e7eb'} !important`,
                borderRadius: `${Math.max(20 * finalContainerSize.scaleFactor, 12)}px`,
                boxShadow: product.id === 'megacoffee' ? 
                  '0 4px 12px rgba(219, 39, 119, 0.15) !important' : 
                  '0 4px 12px rgba(0, 0, 0, 0.15)',
                fontWeight: '600'
              }}
            >
              <p
                className="product-name"
                style={{
                  color: product.id === 'galaxy-folder' ? '#1e40af' :
                         product.id === 'cuckoo-food' ? '#92400e' :
                         product.id === 'canon-multifunction' ? '#064e3b' :
                         product.id === 'shinsegae-gift' ? '#6b21a8' :
                         product.id === 'megacoffee' ? '#831843' : '#000000',
                  fontWeight: '600',
                  margin: '0',
                  lineHeight: '1.2',
                  fontSize: '0.875rem'
                }}
              >
                {product.name}
              </p>
              <p
                className="product-quantity"
                style={{
                  color: product.id === 'galaxy-folder' ? '#1e40af' :
                         product.id === 'cuckoo-food' ? '#92400e' :
                         product.id === 'canon-multifunction' ? '#064e3b' :
                         product.id === 'shinsegae-gift' ? '#6b21a8' :
                         product.id === 'megacoffee' ? '#831843' : '#6b7280',
                  fontWeight: '800', // 더 굵게 강조
                  margin: '2px 0 0 0',
                  lineHeight: '1.2',
                  fontSize: '0.75rem',
                  WebkitTextStroke: product.id === 'galaxy-folder' ? '0.75px #4c63d2' : // 파란색보다 옅게 (얇게)
                                    product.id === 'cuckoo-food' ? '0.75px #b8653a' : // 갈색보다 옅게 (얇게)
                                    product.id === 'canon-multifunction' ? '0.75px #2d6a4f' : // 초록색보다 옅게 (얇게)
                                    product.id === 'shinsegae-gift' ? '0.75px #8b5cf6' : // 보라색보다 옅게 (얇게)
                                    product.id === 'megacoffee' ? '0.75px #be185d' : '0.75px #9ca3af' // 분홍색보다 옅게 (얇게)
                }}
              >
                &ldquo;{product.quantity}&rdquo;
              </p>
            </div>
          </div>
        );
      })}
        
      {eventState === 'idle' && (
        <div className="text-center bg-white bg-opacity-80 p-6 rounded-lg shadow-lg z-20 mt-12 text-appear-delayed">
          <div className="text-center mb-4">
            <h1
              className="text-4xl md:text-5xl font-black mb-1"
              style={{
                background: 'linear-gradient(135deg, #ffd700, #ffed4e, #fbbf24)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                animation: 'pulse 2s infinite',
                fontWeight: '900',
                textShadow: '1px 1px 2px rgba(0, 0, 139, 0.9), 0 0 25px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.4)',
                fontSize: 'clamp(1.2rem, 6vw, 3rem)', // 480px부터 더 빠르게 줄어듦
                filter: 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.7)) brightness(1.1)'
              }}
            >
              <span className="fly-in-left" style={{ background: 'none', color: '#ffd700', WebkitBackgroundClip: 'initial', backgroundClip: 'initial', display: 'inline-block' }}>🎉</span>
              <span className="fly-in-top" style={{ display: 'inline-block', animationDelay: '1.3s' }}>리</span>
              <span className="fly-in-bottom" style={{ display: 'inline-block', animationDelay: '1.4s' }}>뷰</span>
              <span style={{ display: 'inline-block' }}>&nbsp;</span>
              <span className="fly-in-left" style={{ display: 'inline-block', animationDelay: '1.5s' }}>이</span>
              <span className="fly-in-right" style={{ display: 'inline-block', animationDelay: '1.6s' }}>벤</span>
              <span className="fly-in-top" style={{ display: 'inline-block', animationDelay: '1.7s' }}>트</span>
              <span className="fly-in-bottom" style={{ display: 'inline-block', animationDelay: '1.8s' }}>에</span>
              <span style={{ display: 'inline-block' }}>&nbsp;</span>
              <span className="fly-in-left" style={{ display: 'inline-block', animationDelay: '1.9s' }}>참</span>
              <span className="fly-in-right" style={{ display: 'inline-block', animationDelay: '2.0s' }}>여</span>
              <span className="fly-in-top" style={{ display: 'inline-block', animationDelay: '2.1s' }}>하</span>
              <span className="fly-in-bottom" style={{ display: 'inline-block', animationDelay: '2.2s' }}>세</span>
              <span className="fly-in-left" style={{ display: 'inline-block', animationDelay: '2.3s' }}>요</span>
              <span className="fly-in-right" style={{ display: 'inline-block', animationDelay: '2.4s' }}>!</span>
              <span className="fly-in-right" style={{ background: 'none', color: '#ffd700', WebkitBackgroundClip: 'initial', backgroundClip: 'initial', display: 'inline-block', animationDelay: '1.2s' }}>🎁</span>
            </h1>


          </div>
          <div className="flex flex-col items-center gap-8" style={{ transform: 'translateY(-5px)' }}>
            <div className="relative fade-in-place" style={{ opacity: 0 }}>
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-2xl animate-pulse">🎫</span>
              </div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="참여 코드를 입력하세요"
                className="w-full max-w-[350px] md:max-w-[320px] lg:max-w-[300px] pl-16 pr-6 py-20 text-center text-2xl font-semibold border-2 border-transparent rounded-full bg-gradient-to-r from-purple-100 via-pink-50 to-purple-100 focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-purple-400 transition-all duration-500 shadow-2xl hover:shadow-purple-300/50 transform hover:scale-105 hover:shadow-3xl backdrop-blur-sm"
                style={{
                  fontSize: 'clamp(1.1rem, 4.5vw, 1.6rem)', // 480px부터 더 빠르게 줄어듦
                  fontWeight: '700',
                  letterSpacing: '0.025em',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(248,250,252,0.8))',
                  boxShadow: '0 8px 32px rgba(147, 51, 234, 0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(147, 51, 234, 0.2)'
                }}
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <span className="text-sm text-gray-500 animate-bounce">✨</span>
              </div>
            </div>
          </div>

          <div className="mt-40 fade-in-place" style={{ transform: 'translateY(-20px)', marginTop: '40px !important', opacity: 0 }}>
            <button
              onClick={handleParticipate}
              className="px-16 py-8 text-white font-black text-2xl rounded-full transform hover:scale-110 transition-all duration-300 shadow-2xl animate-pulse scale-pulse"
              style={{
                fontSize: 'clamp(1rem, 4vw, 1.5rem)', // 480px부터 더 빠르게 줄어듦
                fontWeight: '900',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                letterSpacing: '0.05em',
                color: '#ffffff',
                background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%) !important',
                border: 'none !important',
                boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3) !important'
              }}
            >
              🎉 참여하기 🎉
            </button>
          </div>

          {showRibbonAndText ? (
            <div className="text-sm text-gray-600 text-center fade-in-up" style={{ marginTop: '10px !important', transform: 'translateY(-20px)', opacity: 0 }}>
              <span
                className="inline-block"
                style={{
                  animation: 'pulse 2s infinite',
                  fontSize: 'clamp(0.9rem, 3.5vw, 1.2rem)' // 480px부터 더 빠르게 줄어듦
                }}
              >
                💫
              </span>
              <span
                className="font-medium"
                style={{
                  color: '#fafad2',
                  fontWeight: '600',
                  fontSize: 'clamp(0.8rem, 3.3vw, 1.1rem)' // 480px부터 더 빠르게 줄어듦
                }}
              >
                <span className="typewriter" style={{ animationDelay: '3.6s' }}>지</span>
                <span className="typewriter" style={{ animationDelay: '3.65s' }}>금</span>
                <span className="typewriter" style={{ animationDelay: '3.7s' }}>&nbsp;</span>
                <span className="typewriter" style={{ animationDelay: '3.75s' }}>바</span>
                <span className="typewriter" style={{ animationDelay: '3.8s' }}>로</span>
                <span className="typewriter" style={{ animationDelay: '3.85s' }}>&nbsp;</span>
                <span className="typewriter" style={{ animationDelay: '3.9s' }}>참</span>
                <span className="typewriter" style={{ animationDelay: '3.95s' }}>여</span>
                <span className="typewriter" style={{ animationDelay: '4.0s' }}>하</span>
                <span className="typewriter" style={{ animationDelay: '4.05s' }}>여</span>
                <span className="typewriter" style={{ animationDelay: '4.1s' }}>&nbsp;</span>
                <span className="typewriter" style={{ animationDelay: '4.15s', color: '#34d399' }}>&ldquo;</span>
                <span className="typewriter" style={{ animationDelay: '4.2s', color: '#34d399' }}>특</span>
                <span className="typewriter" style={{ animationDelay: '4.25s', color: '#34d399' }}>별</span>
                <span className="typewriter" style={{ animationDelay: '4.3s', color: '#34d399' }}>한</span>
                <span className="typewriter" style={{ animationDelay: '4.35s', color: '#34d399' }}>&nbsp;</span>
                <span className="typewriter" style={{ animationDelay: '4.4s', color: '#34d399' }}>선</span>
                <span className="typewriter" style={{ animationDelay: '4.45s', color: '#34d399' }}>물</span>
                <span className="typewriter" style={{ animationDelay: '4.5s', color: '#34d399' }}>&rdquo;</span>
                <span className="typewriter" style={{ animationDelay: '4.55s' }}>&nbsp;</span>
                <span className="typewriter" style={{ animationDelay: '4.6s' }}>을</span>
                <span className="typewriter" style={{ animationDelay: '4.65s' }}>&nbsp;</span>
                <span className="typewriter" style={{ animationDelay: '4.7s' }}>만</span>
                <span className="typewriter" style={{ animationDelay: '4.75s' }}>나</span>
                <span className="typewriter" style={{ animationDelay: '4.8s' }}>보</span>
                <span className="typewriter" style={{ animationDelay: '4.85s' }}>세</span>
                <span className="typewriter" style={{ animationDelay: '4.9s' }}>요</span>
                <span className="typewriter" style={{ animationDelay: '4.95s' }}>!</span>
              </span>
              <span
                className="inline-block"
                style={{
                  animation: 'pulse 2s infinite',
                  fontSize: '1.2rem'
                }}
              >
                💫
              </span>
            </div>
          ) : null}
        </div>
      )}

      {(eventState === 'playing-reveal' || eventState === 'finished') && showPrize && prize && (
        <div className="text-center p-8 animate-fade-in z-20">
          <div className="relative">
            {/* Celebration Background Effect - moved behind text */}
            
            {/* Main Congratulations Message */}
            <div className="relative z-10">
              <h1 
                className="text-5xl md:text-6xl font-black mb-6 animate-bounce"
                style={{
                  fontFamily: '"Nunito", "Poppins", "Inter", sans-serif',
                  fontWeight: '800',
                  letterSpacing: '0.02em'
                }}
              >
                <span className="inline-block animate-spin" style={{animationDuration: '3s', color: '#ffd700'}}>🎉</span>
                <span 
                  className="mx-2"
                  style={{
                    color: '#00008B',
                    display: 'inline-block',
                    zIndex: 9999,
                    position: 'relative'
                  }}
                >
                  <span className="wiggle-char-1" style={{display: 'inline-block'}}>당</span>
                  <span className="wiggle-char-2" style={{display: 'inline-block'}}>첨</span>
                  <span className="wiggle-char-3" style={{display: 'inline-block'}}>을</span>
                  <span style={{display: 'inline-block'}}>&nbsp;</span>
                  <span className="wiggle-char-4" style={{display: 'inline-block'}}>축</span>
                  <span className="wiggle-char-5" style={{display: 'inline-block'}}>하</span>
                  <span className="wiggle-char-1" style={{display: 'inline-block'}}>드</span>
                  <span className="wiggle-char-2" style={{display: 'inline-block'}}>립</span>
                  <span className="wiggle-char-3" style={{display: 'inline-block'}}>니</span>
                  <span className="wiggle-char-4" style={{display: 'inline-block'}}>다</span>
                  <span className="wiggle-char-5" style={{display: 'inline-block'}}>!</span>
                </span>
                <span className="inline-block animate-spin" style={{animationDuration: '3s', animationDirection: 'reverse', color: '#ffd700'}}>🎉</span>
              </h1>
              
              {/* Prize Name with Enhanced Styling */}
              <div className="mb-6">
                <p 
                  className="text-lg font-semibold mb-2"
                  style={{
                    fontFamily: '"Nunito", "Poppins", "Inter", sans-serif',
                    color: '#1e40af',
                    fontWeight: '700'
                  }}
                >
                  🏆 당첨 상품 🏆
                </p>
                <p 
                  className="text-3xl md:text-4xl font-black px-6 py-3 rounded-full inline-block"
                  style={{
                    fontFamily: '"Nunito", "Poppins", "Inter", sans-serif',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                    boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                    transform: 'scale(1)',
                    animation: 'prize-pulse 2s ease-in-out infinite'
                  }}
                >
                  ✨ {prize.name} ✨
                </p>
              </div>
            </div>
          </div>
          {prize.imageUrl && (
            <div className="mb-6">
              <img 
                src={prize.imageUrl} 
                alt={prize.name} 
                className="mx-auto w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 object-contain prize-image-glow" 
              />
            </div>
          )}
          
          {/* Enhanced Question Text */}
          <div className="mb-5 mt-[-40px]">
            <p 
              className="text-lg md:text-xl lg:text-2xl font-bold mb-2"
              style={{
                fontFamily: '"Nunito", "Poppins", "Inter", sans-serif',
                color: '#00FF00',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                fontWeight: '700',
                fontSize: 'clamp(1rem, 4vw, 1.5rem)'
              }}
            >
              🎁 상품을 받으시겠습니까? 🎁
            </p>
            <p 
              className="text-xs md:text-sm lg:text-base mb-2"
              style={{
                fontFamily: '"Nunito", "Poppins", "Inter", sans-serif',
                color: '#FFF8DC',
                fontWeight: '600',
                fontSize: 'clamp(0.75rem, 3vw, 1rem)'
              }}
            >
              휴대폰 번호를 입력하시면 상품을 발송해드립니다!
            </p>
          </div>
          
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="휴대폰 번호를 입력하세요"
                className="px-4 py-3 md:py-4 rounded-full w-64 md:w-80 lg:w-96 text-center text-base md:text-lg font-semibold border-2 bg-gradient-to-r from-blue-50 to-indigo-50 focus:outline-none focus:ring-4 transition-all duration-300"
                style={{
                  fontFamily: '"Nunito", "Poppins", "Inter", sans-serif',
                  fontSize: 'clamp(0.9rem, 3vw, 1.1rem)',
                  fontWeight: '600',
                  color: '#1e40af',
                  borderColor: '#FF00FF'
                }}
              />
            </div>
            
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={handleClaimPrize}
                className="px-6 md:px-8 lg:px-10 py-2 md:py-3 lg:py-4 text-white font-black text-base md:text-lg lg:text-xl rounded-full transform hover:scale-110 transition-all duration-300 shadow-2xl animate-pulse scale-pulse"
                style={{
                  fontSize: 'clamp(0.9rem, 4vw, 1.2rem)',
                  fontWeight: '900',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                  letterSpacing: '0.05em',
                  color: '#ffffff',
                  backgroundColor: '#2563eb',
                  border: 'none',
                  boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)'
                }}
              >
                🎉 당첨상품 받기! 🎉
              </button>
            </div>
            
          </div>
        </div>
      )}

      {eventState === 'claiming' && showPrize && (
        <div className="text-center bg-white bg-opacity-90 p-8 rounded-2xl shadow-2xl animate-fade-in z-20">
          <h1 
            className="text-2xl md:text-3xl lg:text-4xl font-black mb-6"
            style={{
              fontFamily: '"Nunito", "Poppins", "Inter", sans-serif',
              color: '#4B0082',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
              fontSize: 'clamp(1.2rem, 5vw, 2rem)',
              letterSpacing: '0.02em'
            }}
          >
            🎉 당첨 상품이 발송되었습니다! 🎉
          </h1>
          <p 
            className="text-lg md:text-xl lg:text-2xl mb-6"
            style={{
              fontFamily: '"Nunito", "Poppins", "Inter", sans-serif',
              color: '#F0E68C',
              fontWeight: '700',
              textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
              fontSize: 'clamp(1rem, 4vw, 1.5rem)',
              letterSpacing: '0.01em'
            }}
          >
            📱 휴대폰 메시지를 확인해주세요! 📱
          </p>
        </div>
      )}
    </main>
  )
}
