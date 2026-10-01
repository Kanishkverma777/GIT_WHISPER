import os
import re

TARGET_DIR = "/Users/kiyo/Desktop/GITHUB QNA/client"
OLD_COLOR = re.compile(re.escape("#2F81F7"), re.IGNORECASE)
NEW_COLOR = "#E61919"

def main():
    count = 0
    for root, dirs, files in os.walk(TARGET_DIR):
        if ".next" in root or "node_modules" in root:
            continue
        for file in files:
            if not file.endswith((".tsx", ".ts", ".css", ".js", ".jsx")):
                continue
            
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
                
            if OLD_COLOR.search(content):
                new_content = OLD_COLOR.sub(NEW_COLOR, content)
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
                count += 1
                
    print(f"Replaced color in {count} files.")

if __name__ == "__main__":
    main()
