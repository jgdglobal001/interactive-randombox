import json

def hide_badge_layer(data):
    """
    로티 파일에서 badge_03 레이어의 opacity를 0으로 설정
    """
    def process_layers(obj):
        if isinstance(obj, dict):
            # badge_03 레이어 찾기
            if obj.get('nm') == 'badge_03' and obj.get('ty') == 0:
                # opacity 값을 0으로 설정
                if 'ks' in obj and 'o' in obj['ks']:
                    obj['ks']['o']['a'] = 0  # 애니메이션 없음
                    obj['ks']['o']['k'] = 0  # 투명도 0
            
            # 하위 객체들도 검사
            for value in obj.values():
                process_layers(value)
        elif isinstance(obj, list):
            for item in obj:
                process_layers(item)

    process_layers(data)
    return data

# intro.json 파일 수정
file_path = 'public/lottie/intro.json'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        lottie_data = json.load(f)

    print("원본 파일 읽기 완료")

    # badge 레이어 숨기기 적용
    modified_data = hide_badge_layer(lottie_data)

    # 변경된 파일 저장
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(modified_data, f, indent=4)

    print(f"배지 레이어 숨기기 완료! '{file_path}'에 저장되었습니다.")

except FileNotFoundError:
    print(f"Error: 파일을 찾을 수 없습니다 - '{file_path}'")
except json.JSONDecodeError:
    print(f"Error: JSON 파일을 파싱할 수 없습니다 - '{file_path}'")
except Exception as e:
    print(f"예상치 못한 오류 발생: {e}")
