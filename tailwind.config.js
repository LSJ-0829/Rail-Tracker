/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f5f5f7", // 페이지 배경(밝은 회색)
        ink: "#1d1d1f", // 본문 글자
        sub: "#6e6e73", // 보조 글자
        hair: "#d2d2d7", // 구분선
        accent: "#0071e3", // 주 버튼
        link: "#0066cc", // 텍스트 링크
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"Apple SD Gothic Neo"',
          "Pretendard",
          '"Noto Sans KR"',
          '"Helvetica Neue"',
          "sans-serif",
        ],
      },
      letterSpacing: {
        tightest: "-0.03em",
      },
    },
  },
  plugins: [],
};
