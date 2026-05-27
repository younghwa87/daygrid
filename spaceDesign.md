당신은 React Native + Expo 시니어 개발자입니다.
DayGrid 스타일의 하루 그리드 화면에
"여백 시각화(Empty Space Design)" 기능을 구현해주세요.

======================
[ 핵심 철학 ]
======================
기존 캘린더 앱:
빈 시간 = 아무것도 없는 회색 공간 (죽은 공간)

이 앱:
빈 시간 = 적극적으로 디자인된 살아있는 공간

원칙 3가지:

1. 여백이 많을수록 더 아름다운 UI
2. 빈 시간은 "없음"이 아니라 "자유"를 의미
3. 과밀한 일정은 시각적으로 불편하게 표현
   → 자연스럽게 오버스케줄링 방지

======================
[ 기술 스택 ]
======================

- React Native + Expo (Managed Workflow)
- TypeScript
- React Native Reanimated 3 (애니메이션)
- Expo Linear Gradient (그라데이션)
- 설치: npx expo install react-native-reanimated
  npx expo install expo-linear-gradient

======================
[ 구현 범위 ]
======================
아래 4가지를 순서대로 구현해주세요.
각 단계 완료 후 코드 확인 받고 다음으로 넘어가세요.

1단계: 여백 블록 컴포넌트 (EmptyBlock)
2단계: 숨쉬는 애니메이션 (Breathing Animation)
3단계: 여백 밀도 계산 시스템
4단계: 하루 그리드 통합

======================
[ 데이터 구조 ]
======================
파일 위치: src/types/schedule.ts 에 추가

// 하루 그리드의 각 시간 슬롯
interface TimeSlot {
hour: number // 0 ~ 23
type: 'scheduled' // 일정 있음
| 'free' // 완전한 자유 시간
| 'buffer' // 일정 사이 짧은 여백 (1시간 이하)
| 'deep_free' // 긴 여백 (3시간 이상)
schedule?: Schedule // type이 scheduled일 때만
freeBlockId?: string // 연속된 여백 그룹 ID
freeBlockLength?: number // 연속 여백 길이 (시간)
}

// 여백 블록 (연속된 빈 시간 묶음)
interface FreeBlock {
id: string
startHour: number
endHour: number
durationHours: number
quality: 'micro' // 1시간 미만
| 'short' // 1~2시간
| 'medium' // 2~4시간
| 'long' // 4시간 이상
label: string // "30분 여백" | "황금 여유 시간" | "깊은 휴식 구간"
}

======================
[ 1단계: EmptyBlock 컴포넌트 ]
======================
파일 위치: src/components/EmptyBlock.tsx

Props:
interface EmptyBlockProps {
freeBlock: FreeBlock
onPress?: () => void // 탭 시 새 일정 추가
onLongPress?: () => void // 롱프레스 시 "이 시간 지키기" 설정
}

quality별 시각 디자인:

micro (1시간 미만):
배경: 흰색 (#FFFFFF)
테두리: 점선 1px, 색상 #E8E8E8
텍스트: 없음 (너무 작음)
애니메이션: 없음

short (1~2시간):
배경: 매우 연한 민트 (#F0FDF9)
테두리: 실선 0.5px, 색상 #D1FAE5
텍스트: "여유 {N}시간" — 12px, 색상 #6EE7B7
애니메이션: 매우 약한 숨쉬기

medium (2~4시간):
배경: LinearGradient
시작: #F0FDF9 (연한 민트)
끝: #EFF6FF (연한 파랑)
방향: 위→아래
테두리: 없음
텍스트: "황금 여유 시간 ✦" — 13px, 색상 #34D399
서브텍스트: "집중하기 좋은 시간이에요" — 11px, 색상 #A7F3D0
애니메이션: 중간 강도 숨쉬기 + 웨이브

long (4시간 이상):
배경: LinearGradient
시작: #ECFDF5
중간: #EFF6FF
끝: #F5F3FF
방향: 위→아래
테두리: 없음
텍스트: "깊은 여유 구간 ✦✦" — 14px, 색상 #10B981
서브텍스트: "오늘의 선물 같은 시간" — 12px, 색상 #6EE7B7
애니메이션: 강한 숨쉬기 + 웨이브 + 파티클

레이아웃:

- 높이: durationHours × 60px (1시간 = 60px)
- 좌측: 시간 레이블 (다른 블록과 동일)
- 내부: 중앙 정렬 텍스트
- 우측 하단: "+" 아이콘 (새 일정 추가)

======================
[ 2단계: 숨쉬기 애니메이션 ]
======================
파일 위치: src/components/animations/BreathingAnimation.tsx

Reanimated 3으로 구현

① 기본 숨쉬기 (short용)

- opacity: 0.6 → 1.0 → 0.6 반복
- duration: 3000ms
- easing: Easing.inOut(Easing.sine)
- 배경 opacity만 변화 (텍스트는 고정)

② 웨이브 숨쉬기 (medium용)

- 배경 그라데이션 위치가 천천히 이동
- translateY: 0 → -4 → 0 반복
- duration: 4000ms
- scaleX: 1.0 → 1.01 → 1.0 (미세한 팽창)

③ 풀 브리딩 (long용)

- 웨이브 숨쉬기 +
- 파티클 3~5개 떠오르기:
  작은 원형 도형 (4px)
  색상: #34D399, #60A5FA, #A78BFA
  위에서 아래로 천천히 떠오름
  opacity: 0 → 0.6 → 0 (페이드인아웃)
  각 파티클 시작 시간 랜덤 offset

성능 주의사항:

- useAnimatedStyle 사용 (JS 스레드 X)
- runOnUI 내에서만 애니메이션 실행
- 화면 밖 블록은 애니메이션 일시정지
  (useIsFocused + visibility 체크)

======================
[ 3단계: 여백 밀도 계산 시스템 ]
======================
파일 위치: src/utils/freeBlockCalculator.ts

구현할 함수:

① calculateFreeBlocks(schedules, date): FreeBlock[]
입력: 하루 일정 배열, 날짜
출력: 연속된 여백 구간 배열

알고리즘: 1. 0시~23시 배열 생성 (24칸) 2. 각 일정의 startHour~endHour를 'scheduled'로 표시 3. 연속된 빈 시간을 그룹핑 4. 각 그룹의 durationHours 계산 5. quality 분류 (micro/short/medium/long) 6. label 자동 생성

엣지 케이스 처리: - 자정 넘어가는 일정 (23시~01시) - 30분 단위 일정 (0.5시간) - 하루 일정이 0개인 경우 → 전체 하루가 1개 FreeBlock

② getDayFreeTimeSummary(schedules, date): Summary
반환:
totalFreeHours: number // 총 여백 시간
totalScheduledHours: number // 총 일정 시간
longestFreeBlock: FreeBlock // 가장 긴 여백
freeRatio: number // 여백 비율 (0~1)
message: string // "오늘 하루의 47%가 자유 시간이에요"

③ getFreeBlockLabel(block: FreeBlock): string
durationHours 기준 라벨 반환:
0.5 이하 → "" (표시 안 함)
0.5~1 → "{N}분 여백"
1~2 → "여유 {N}시간"
2~3 → "황금 집중 시간"
3~4 → "황금 여유 시간 ✦"
4~6 → "깊은 여유 구간 ✦✦"
6 이상 → "오늘의 선물 같은 시간 ✦✦✦"

엣지 케이스 (구현 완료):
- 자정 넘어가는 일정(overflow): 다음 날 0시~종료시각을 별도 블록으로 분리 표시
  → isOverflow: true 플래그로 구분
  → freeBlockCalculator에서 overflow 블록도 점유 시간으로 계산 (여백에서 제외)
  → getSchedulesByDate()에서 전날 endTime > 1440 인 일정을 자동으로 overflow 변환

======================
[ 4단계: 하루 그리드 통합 ]
======================
파일 위치: src/components/DayGrid.tsx 수정

기존 그리드에 EmptyBlock 통합:

렌더링 로직:
const timeSlots = buildTimeSlots(schedules, freeBlocks);

return (
<ScrollView>
{timeSlots.map((slot) => {
if (slot.type === 'scheduled') {
return <ScheduleBlock key={slot.hour} schedule={slot.schedule} />;
}
if (slot.type === 'free' && isFirstOfGroup(slot)) {
return <EmptyBlock key={slot.freeBlockId} freeBlock={getFreeBlock(slot.freeBlockId)} />;
}
return null; // 같은 그룹의 나머지 슬롯은 스킵
})}
</ScrollView>
);

하단 요약 바 추가:
위치: 화면 하단 고정
내용:
왼쪽: "오늘 여백 {N}시간"
가운데: 프로그레스 바
[일정████░░░░░░여백] 비율 표시
오른쪽: "가장 긴 여백 {N}시간"

색상 규칙:
여백 비율 < 30%: 프로그레스 바 빨강 → "오늘 너무 빡빡해요"
여백 비율 30~50%: 주황 → "조금 여유를 만들어보세요"
여백 비율 50~70%: 초록 → "균형 잡힌 하루예요 ✦"
여백 비율 > 70%: 파랑 → "여유로운 하루네요"

======================
[ 추가 UX 디테일 ]
======================

① EmptyBlock 탭 동작:
탭 → 새 일정 추가 바텀시트 열기
(해당 시간대 자동 입력)

② EmptyBlock 롱프레스 동작:
롱프레스 → "이 시간 지키기" 옵션
→ 해당 여백을 "보호 시간"으로 설정
→ 보호된 여백: 자물쇠 아이콘 + 골드 테두리
→ 이 시간에 일정 추가 시 경고 알림

③ 여백 → 일정 전환 애니메이션:
새 일정 추가 시:
EmptyBlock이 ScheduleBlock으로 모핑
→ 배경색이 민트에서 일정 색상으로 크로스페이드
→ 높이가 일정 길이에 맞게 리사이즈
→ duration: 400ms, easing: spring

④ 다크모드 여백 색상:
micro: #1C1C1E (거의 검정)
short: #0D2018 (매우 어두운 초록)
medium: 그라데이션 #0D2018 → #0D1B2A
long: 그라데이션 #0D2018 → #0D1B2A → #1A0D2E

======================
[ 파일 구조 ]
======================
생성할 파일:
src/
├── components/
│ ├── EmptyBlock.tsx ← 여백 블록 컴포넌트
│ └── animations/
│ └── BreathingAnimation.tsx ← 숨쉬기 애니메이션
├── utils/
│ └── freeBlockCalculator.ts ← 여백 계산 로직
└── types/
└── schedule.ts ← TimeSlot, FreeBlock 타입 추가

수정할 파일:
src/
└── components/
└── DayGrid.tsx ← EmptyBlock 통합 + 하단 요약 바

======================
[ 구현 순서 ]
======================

1. 타입 정의 추가 (schedule.ts)
2. freeBlockCalculator.ts 구현 및 단위 테스트
3. BreathingAnimation.tsx 구현
4. EmptyBlock.tsx 구현
5. DayGrid.tsx 통합
6. 다크모드 대응
7. 실기기(Android) 성능 테스트

각 단계마다 완성 코드 보여주고
다음 단계 진행 전 확인 받아주세요.

======================
[ 완료 기준 ]
======================
아래 항목 모두 충족 시 구현 완료:

[ ] micro 여백: 점선 테두리 표시
[ ] short 여백: 연한 민트 + 약한 숨쉬기
[ ] medium 여백: 그라데이션 + 웨이브 + 라벨
[ ] long 여백: 풀 브리딩 + 파티클 + 특별 라벨
[ ] 하단 요약 바: 여백 비율 + 상태 메시지
[ ] 탭 → 새 일정 추가 연결
[ ] 롱프레스 → 보호 시간 설정
[ ] 여백→일정 모핑 애니메이션
[ ] 다크모드 색상 대응
[ ] Reanimated 성능 (JS 스레드 미사용)

======================
[ 주간 히트맵 밀도 계산 ]
======================
파일 위치: src/screens/WeeklyHeatmapScreen.tsx

calcDensity(daySchedules, hour) 함수

설계 원칙:
- 일정은 시간 겹침이 불가능한 구조 (hasOverlap 체크)
- 따라서 "겹치는 일정 수" 기반 계산은 최대 density 2에서 멈춤 → 사용 불가
- 해당 시간대의 점유된 분(minutes) 기준으로 계산

밀도 기준 (시간당 점유 분):
| 점유 시간 | density | 레이블  |
|---------|---------|--------|
| 0분     | 0       | 여유    |
| 1~15분  | 1       | 가벼움  |
| 16~30분 | 2       | 보통    |
| 31~45분 | 3       | 바쁨    |
| 46~60분 | 4       | 과부하  |

구현:
function calcDensity(daySchedules, hour) {
  const s0 = hour * 60;
  const s1 = s0 + 60;
  const occupied = daySchedules.reduce(
    (sum, s) => sum + Math.max(0, Math.min(s.endTime, s1) - Math.max(s.startTime, s0)),
    0
  );
  if (occupied === 0) return 0;
  if (occupied <= 15) return 1;
  if (occupied <= 30) return 2;
  if (occupied <= 45) return 3;
  return 4;
}

주의: overflow 일정(전날에서 이어지는 블록)도 동일하게 점유 시간에 포함됨
