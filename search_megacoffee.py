#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
메가커피 아이스 아메리카노 상품 검색 스크립트
기프트쇼 API를 호출해서 메가커피 관련 상품을 찾습니다.
"""

import requests
import json
from urllib.parse import urlencode

def search_megacoffee_products():
    """기프트쇼 API에서 메가커피 상품 검색"""
    
    # 기프트쇼 API 설정
    auth_key = 'REAL10f8dc85d32c4ff4b2594851a845c15f'
    auth_token = 'VUUiyDeKaWdeJYjlyGIuwQ=='
    api_url = 'https://bizapi.giftishow.com/bizApi/goods'
    
    # 요청 데이터
    request_data = {
        'api_code': '0101',  # 상품 리스트 API 코드
        'custom_auth_code': auth_key,
        'custom_auth_token': auth_token,
        'dev_yn': 'N',  # 상용환경
        'start': '1',   # 시작 페이지
        'size': '100'   # 한 번에 100개씩 조회
    }
    
    print("🔍 기프트쇼 API 호출 중...")
    print(f"URL: {api_url}")
    print(f"요청 데이터: {request_data}")
    print("-" * 50)
    
    try:
        # API 호출
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        }
        
        response = requests.post(
            api_url,
            data=urlencode(request_data),
            headers=headers,
            timeout=30
        )
        
        print(f"응답 상태: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ HTTP 오류: {response.status_code}")
            print(f"응답 내용: {response.text}")
            return
        
        # JSON 응답 파싱
        result = response.json()
        print(f"✅ API 응답 성공")
        print(f"응답 코드: {result.get('code', 'N/A')}")
        print(f"응답 메시지: {result.get('message', 'N/A')}")
        
        if result.get('code') != '0000':
            print(f"❌ API 오류: [{result.get('code')}] {result.get('message')}")
            return
        
        # 상품 리스트 추출
        goods_list = result.get('result', {}).get('goodsList', [])
        total_products = result.get('result', {}).get('listNum', 0)
        
        print(f"📦 전체 상품 수: {total_products}")
        print(f"📦 조회된 상품 수: {len(goods_list)}")
        print("-" * 50)
        
        # 메가커피 관련 상품 필터링
        megacoffee_products = []
        for product in goods_list:
            goods_name = product.get('goodsName', '').lower()
            brand_name = product.get('brandName', '').lower()
            
            if ('메가커피' in goods_name or '메가커피' in brand_name or 
                'mega' in goods_name or 'mega' in brand_name):
                megacoffee_products.append(product)
        
        print(f"☕ 메가커피 관련 상품: {len(megacoffee_products)}개")
        
        # 아이스 아메리카노 찾기
        iced_americano = []
        americano_products = []
        
        for product in megacoffee_products:
            goods_name = product.get('goodsName', '').lower()
            
            # 아메리카노 상품 분류
            if '아메리카노' in goods_name or 'americano' in goods_name:
                americano_products.append(product)
                
                # 아이스 아메리카노 분류
                if ('아이스' in goods_name and '아메리카노' in goods_name) or \
                   ('ice' in goods_name and 'americano' in goods_name) or \
                   '아이스아메리카노' in goods_name or \
                   'iced americano' in goods_name:
                    iced_americano.append(product)
        
        print(f"🧊 아이스 아메리카노: {len(iced_americano)}개")
        print(f"☕ 아메리카노 전체: {len(americano_products)}개")
        print("=" * 50)
        
        # 결과 출력
        if iced_americano:
            print("\n🧊 아이스 아메리카노 상품 (최우선 추천):")
            print("=" * 50)
            for i, product in enumerate(iced_americano, 1):
                print_product_info(product, i)
        
        if americano_products:
            print("\n☕ 아메리카노 전체 상품:")
            print("=" * 50)
            for i, product in enumerate(americano_products, 1):
                if product not in iced_americano:  # 중복 제거
                    print_product_info(product, i)
        
        if megacoffee_products:
            print("\n🏪 기타 메가커피 상품:")
            print("=" * 50)
            for i, product in enumerate(megacoffee_products, 1):
                if product not in americano_products:  # 중복 제거
                    print_product_info(product, i)
        
        # 추천 상품 코드 출력
        if iced_americano:
            print("\n" + "="*50)
            print("🎯 추천 상품 코드 (아이스 아메리카노):")
            for product in iced_americano:
                print(f"   {product.get('goodsCode')} - {product.get('goodsName')}")
        elif americano_products:
            print("\n" + "="*50)
            print("🎯 추천 상품 코드 (아메리카노):")
            for product in americano_products[:3]:  # 상위 3개만
                print(f"   {product.get('goodsCode')} - {product.get('goodsName')}")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ 네트워크 오류: {e}")
    except json.JSONDecodeError as e:
        print(f"❌ JSON 파싱 오류: {e}")
        print(f"응답 내용: {response.text}")
    except Exception as e:
        print(f"❌ 예상치 못한 오류: {e}")

def print_product_info(product, index):
    """상품 정보 출력"""
    print(f"\n{index}. 📦 {product.get('goodsName', 'N/A')}")
    print(f"   🆔 상품코드: {product.get('goodsCode', 'N/A')}")
    print(f"   🏢 브랜드: {product.get('brandName', 'N/A')}")
    print(f"   💰 할인가: {product.get('discountPrice', 'N/A')}원")
    print(f"   🏷️ 정가: {product.get('salePrice', 'N/A')}원")
    print(f"   💵 실제가: {product.get('realPrice', 'N/A')}원")
    print(f"   ⏰ 유효기간: {product.get('limitDay', 'N/A')}일")
    print(f"   📂 카테고리: {product.get('categoryName1', 'N/A')}")
    print(f"   🏪 교환처: {product.get('affiliate', 'N/A')}")

if __name__ == "__main__":
    print("🔍 메가커피 아이스 아메리카노 상품 검색")
    print("=" * 50)
    search_megacoffee_products()
