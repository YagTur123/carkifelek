#!/usr/bin/env python3
import json, urllib.request, sys, os

prompt_path = "/data/data/com.termux/files/home/carkifelek/reports/prompt_for_deepseek.txt"
with open(prompt_path, "r", encoding="utf-8") as f:
    prompt = f.read()

print("DeepSeek V4.1 Flash sorgulanıyor...")
req = urllib.request.Request(
    "http://127.0.0.1:8080/v1/chat/completions",
    headers={"Content-Type": "application/json", "Authorization": "Bearer opencode"},
    data=json.dumps({
        "model": "deepseek-v4.1-flash-1017",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3
    }).encode("utf-8")
)

try:
    with urllib.request.urlopen(req, timeout=90) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        ans = res["choices"][0]["message"]["content"]
        with open("/data/data/com.termux/files/home/carkifelek/reports/deepseek_analysis.txt", "w", encoding="utf-8") as out:
            out.write(ans)
        print("DeepSeek analizi başarıyla kaydedildi! Karakter sayısı:", len(ans))
except Exception as e:
    print("DeepSeek API hatası:", e)
    sys.exit(1)
