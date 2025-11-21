import ast
import sys

code = open("server/routers/cards.py").read()
tree = ast.parse(code)

for node in ast.walk(tree):
    if isinstance(node, ast.FunctionDef):
        for dec in node.decorator_list:
            if isinstance(dec, ast.Call):
                if isinstance(dec.func, ast.Attribute):
                    print(f"Found decorator: {dec.func.attr}")
                    if dec.args:
                         print(f"  Arg 0 type: {type(dec.args[0])}")
                         if isinstance(dec.args[0], ast.Constant):
                             print(f"  Value: {dec.args[0].value}")

