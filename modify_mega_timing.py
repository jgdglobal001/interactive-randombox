import json

def modify_mega_coffee_timing(data):
    """
    메가커피 이미지가 128프레임에 나타나도록 타이밍 조정
    """
    def process_layers(layers):
        for layer in layers:
            if isinstance(layer, dict):
                # 레이어 이름 확인
                layer_name = layer.get('nm', '')

                # 메가커피 관련 레이어 찾기 (이름에 'mega', 'coffee', '메가', '커피' 등이 포함된 레이어)
                if any(keyword in layer_name.lower() for keyword in ['mega', 'coffee', '메가', '커피']):
                    print(f"메가커피 레이어 발견: {layer_name}")

                    # 현재 타이밍 정보 출력
                    current_ip = layer.get('ip', 0)
                    current_op = layer.get('op', 0)
                    print(f"현재 타이밍 - 시작: {current_ip}, 종료: {current_op}")

                    # 타이밍 조정: 128프레임에 시작하도록 설정
                    layer['ip'] = 128

                    # 종료 타이밍은 적절하게 설정 (예: 애니메이션 끝까지)
                    if current_op > 128:
                        layer['op'] = current_op  # 기존 종료 시간 유지
                    else:
                        layer['op'] = 225  # 전체 애니메이션 끝까지

                    print(f"수정된 타이밍 - 시작: {layer['ip']}, 종료: {layer['op']}")
                    return True

                # 하위 레이어들도 확인
                if 'layers' in layer:
                    if process_layers(layer['layers']):
                        return True

        return False

    # 메인 컴포지션 찾기
    if 'layers' in data:
        found = process_layers(data['layers'])
        if not found:
            print("메가커피 레이어를 찾을 수 없습니다. 수동으로 레이어 이름을 확인해주세요.")

    return data

# intro.json 파일 타이밍 변경
file_path = 'public/lottie/intro.json'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        lottie_data = json.load(f)

    print("원본 파일 읽기 완료")

    # 메가커피 타이밍 변경 적용
    modified_data = modify_mega_coffee_timing(lottie_data)

    # 변경된 파일 저장
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(modified_data, f, indent=4, ensure_ascii=False)

    print(f"타이밍 변경 완료! '{file_path}'에 저장되었습니다.")

except FileNotFoundError:
    print(f"Error: 파일을 찾을 수 없습니다 - '{file_path}'")
except json.JSONDecodeError:
    print(f"Error: JSON 파일을 파싱할 수 없습니다 - '{file_path}'")
except Exception as e:
    print(f"예상치 못한 오류 발생: {e}")
