import ast
import sys

code = open("server/routers/search.py").read()
try:
    tree = ast.parse(code)
except Exception as e:
    print(f"PARSE ERROR: {e}")
    sys.exit(1)

for node in ast.walk(tree):
    if isinstance(node, ast.FunctionDef):
        for dec in node.decorator_list:
            if isinstance(dec, ast.Call):
                if isinstance(dec.func, ast.Attribute):
                    print(f"Found decorator: {dec.func.attr}")
                    if dec.args:
                         if isinstance(dec.args[0], ast.Constant):
                             print(f"  Value: {dec.args[0].value}")

