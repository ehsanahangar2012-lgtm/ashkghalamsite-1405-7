with open('components/DielineGenerator.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad_string = """                    </div>                  {/* Folding simulation controls */}"""
good_string = """                    </div>                  </div>                  {/* Folding simulation controls */}"""

content = content.replace(bad_string, good_string)

with open('components/DielineGenerator.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

