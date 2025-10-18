import os
from dotenv import load_dotenv

load_dotenv('env/project.env')
from serve_rag import app

if __name__ == '__main__':
    import uvicorn
    os.environ['COLLECTION_NAME'] = os.environ.get('COLLECTION_NAME', f"{os.environ['REPO']}_{os.environ.get('COLLECTION_SUFFIX','default')}")
    port = int(os.environ.get('PORT', '8012'))
    uvicorn.run(app, host='127.0.0.1', port=port)
