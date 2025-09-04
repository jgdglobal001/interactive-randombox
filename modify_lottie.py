import json
import re

def change_blue_to_yellow(data):
    """
    로티 파일에서 파란색 계열의 색상을 노란색으로 변경
    """
    def process_color_values(obj):
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key == 'k' and isinstance(value, list):
                    # 그라데이션 색상 값 찾기
                    if len(value) >= 20:  # 그라데이션 색상 배열
                        # 파란색 계열 색상들을 노란색으로 변경
                        for i in range(0, len(value), 4):  # R, G, B, A 패턴
                            if i + 2 < len(value):
                                r, g, b = value[i], value[i+1], value[i+2]
                                # 파란색 계열인지 확인 (파란색 성분이 높고 빨강/초록이 낮음)
                                if b > 0.6 and r < 0.7 and g < 0.6:
                                    # 파란색을 노란색으로 변경
                                    value[i] = 0.992   # R: 노란색
                                    value[i+1] = 0.961 # G: 노란색
                                    value[i+2] = 0.522 # B: 노란색 (약간의 파랑 섞음)
                else:
                    process_color_values(value)
        elif isinstance(obj, list):
            for item in obj:
                process_color_values(item)

    process_color_values(data)
    return data

# Sky Indigo.json 파일 색상 변경
file_path = 'public/lottie/Sky Indigo.json'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        lottie_data = json.load(f)

    print("원본 파일 읽기 완료")

    # 색상 변경 적용
    modified_data = change_blue_to_yellow(lottie_data)

    # 변경된 파일 저장
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(modified_data, f, indent=4)

    print(f"색상 변경 완료! '{file_path}'에 저장되었습니다.")

except FileNotFoundError:
    print(f"Error: 파일을 찾을 수 없습니다 - '{file_path}'")
except json.JSONDecodeError:
    print(f"Error: JSON 파일을 파싱할 수 없습니다 - '{file_path}'")
except Exception as e:
    print(f"예상치 못한 오류 발생: {e}")