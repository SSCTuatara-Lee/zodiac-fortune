#!/usr/bin/env python3
import argparse
import json
import os
import sys
from urllib import request, error

API_URL = 'https://api.deepseek.com/v1/responses'

sample_body = {
    'model': 'deepseek-v4-flash',
    'instructions': '你是一名专业的中文星座运势写手。请根据 input 生成符合字段要求的 JSON。不要输出 markdown、代码块或额外说明。',
    'input': '测试返回格式',
    'temperature': 0.5,
    'max_output_tokens': 250,
}


def main():
    parser = argparse.ArgumentParser(description='Test DeepSeek API response format.')
    parser.add_argument('--api-key', '-k', help='DeepSeek API key')
    args = parser.parse_args()

    api_key = args.api_key or os.environ.get('DEEPSEEK_API_KEY')
    if not api_key:
        print('ERROR: Please set DEEPSEEK_API_KEY environment variable or pass --api-key.')
        sys.exit(1)

    req = request.Request(API_URL, method='POST')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Authorization', f'Bearer {api_key}')

    body = json.dumps(sample_body).encode('utf-8')

    try:
        with request.urlopen(req, data=body, timeout=15) as resp:
            status = resp.status
            text = resp.read().decode('utf-8')
            print('HTTP', status)
            print('--- RAW RESPONSE ---')
            print(text)
            print('--- PARSED JSON ---')
            try:
                parsed = json.loads(text)
                print(json.dumps(parsed, indent=2, ensure_ascii=False))
            except json.JSONDecodeError as exc:
                print('JSON parse failed:', exc)
    except error.HTTPError as exc:
        print('HTTP error:', exc.code, exc.reason)
        print(exc.read().decode('utf-8'))
    except Exception as exc:
        print('Request failed:', exc)


if __name__ == '__main__':
    main()
