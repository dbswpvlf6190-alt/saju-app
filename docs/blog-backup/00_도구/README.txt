사주랩 블로그 초안 도구 (두 컴퓨터 공유, OneDrive)

1) 데이터 받기:   python fetch_2027.py <띠key> "<이미지폴더>\data.json"
2) 사진 만들기:   python make_blog_images.py "<이미지폴더>\data.json" "<이미지폴더>"
   (PYTHONIOENCODING=utf-8, 글꼴은 윈도우 기본 batang·malgun)
3) 순서:          queue.json (위에서부터, done=초안 만든 날짜)

초안 규칙: 날짜 폴더 <YYYY-MM-DD>\<YYYY-MM-DD>_<제목>.txt + 같은 이름 _이미지 폴더, <날짜>_올릴_순서.txt
태그는 한 줄에 하나씩, 사이트 링크 끝에 ?from=blog, 맨 끝 AI 도움 표기.
