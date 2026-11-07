"""
Turns dist/index.html (one self-contained file) into the HTML published as
the claude.ai test page: title, viewport, styles, body, then the script.

    npm run build && python3 tools/make-test-page.py <output.html>
"""
import pathlib, re, sys

src = (pathlib.Path(__file__).resolve().parent.parent / 'dist' / 'index.html').read_text()
styles = re.findall(r'<style[^>]*>.*?</style>', src, re.S)
scripts = re.findall(r'<script[^>]*>.*?</script>', src, re.S)
body = re.search(r'<body[^>]*>(.*?)</body>', src, re.S).group(1)
body = re.sub(r'<script[^>]*>.*?</script>', '', body, flags=re.S)
head = '<title>BP Trainer</title>\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
pathlib.Path(sys.argv[1]).write_text(head + '\n'.join(styles) + '\n' + body + '\n' + '\n'.join(scripts))
