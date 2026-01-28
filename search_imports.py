import os

search_str = "@supabase/auth-helpers-nextjs"
root_dir = r"c:\Users\pc\Desktop\barber"

for root, dirs, files in os.walk(root_dir):
    if "node_modules" in dirs:
        dirs.remove("node_modules")
    if ".next" in dirs:
        dirs.remove(".next")
    if ".git" in dirs:
        dirs.remove(".git")
        
    for file in files:
        if file.endswith((".ts", ".tsx", ".js", ".jsx", ".json", ".md")):
            path = os.path.join(root, file)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                    if search_str in content:
                        print(f"Found in: {path}")
            except Exception as e:
                pass
