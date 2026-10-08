// 사이트에 표시되는 내용. 새 게시물은 items 맨 위에 한 줄 추가한다.
// link를 비워 두면 채널 주소로 연결된다.
const CONTENT = {
  mail: "contact@choicelab.cloud",

  channels: {
    instagram: { url: "https://www.instagram.com/choice_lab_/", handle: "@choice_lab_" },
    youtube: { url: "https://www.youtube.com/@choice-lab-b", handle: "@choice-lab-b" }
  },

  stay: {
    series: "제주 중문 숙소 베스트 20",
    items: [
      { title: "제주 부영호텔&리조트", meta: "실제 후기 3,269건 분석", img: "assets/img/stay-booyoung-jeju.jpg", link: "" },
      { title: "WE호텔 제주", meta: "실제 후기 1,291건 분석", img: "assets/img/stay-we-hotel-jeju.jpg", link: "" },
      { title: "파르나스 호텔 제주", meta: "실제 후기 1,502건 분석", img: "assets/img/stay-parnas-jeju.jpg", link: "" }
    ]
  },

  things: {
    items: [
      { title: "기계식 vs 전자식, 더 정확한 시계는?", img: "assets/img/things-watch.jpg", link: "" },
      { title: "노이즈캔슬링, 언제 켜야 할까?", img: "assets/img/things-noise-cancelling.jpg", link: "" },
      { title: "샤프심은 왜 딱 이만큼만 나올까?", img: "assets/img/things-mechanical-pencil.jpg", link: "" }
    ]
  }
};
